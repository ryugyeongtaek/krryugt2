-- STEP 7: Backtest, Model Performance and Champion Model
-- Bias convention: predicted_qty - actual_qty. Positive means over-forecast.
-- MAPE excludes actual = 0 periods; if no non-zero actual exists, MAPE is NULL.
-- WAPE = sum(abs(predicted - actual)) / sum(actual). A zero actual sum is unavailable.

alter table core.forecast_setting
  add column if not exists champion_metric text not null default 'WAPE',
  add column if not exists reference_model_id text;

alter table core.forecast_setting
  drop constraint if exists forecast_setting_champion_metric_check;
alter table core.forecast_setting
  add constraint forecast_setting_champion_metric_check check (champion_metric in ('WAPE','MAPE','RMSE','MAE','ABS_BIAS'));

create table if not exists core.backtest_run (
  backtest_run_id uuid primary key default gen_random_uuid(),
  forecast_run_id uuid not null references core.forecast_run(run_id),
  test_start date not null,
  test_end date not null,
  metric text not null,
  status text not null default 'RUNNING' check (status in ('RUNNING','SUCCESS','FAILED')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  triggered_by uuid references auth.users(id),
  message text,
  unique (forecast_run_id)
);

create table if not exists core.model_performance (
  backtest_run_id uuid not null references core.backtest_run(backtest_run_id) on delete cascade,
  forecast_run_id uuid not null references core.forecast_run(run_id),
  model_id text not null,
  model_version uuid references core.model_version(model_version_id),
  item_id text not null,
  n_periods integer not null default 0,
  wape numeric,
  mape numeric,
  bias numeric,
  rmse numeric,
  mae numeric,
  baseline_improvement numeric,
  rank integer,
  calculation_status text not null default 'SUCCESS',
  reason_code text,
  calculated_at timestamptz not null default now(),
  primary key (backtest_run_id, model_id, item_id)
);

create table if not exists core.champion_model (
  backtest_run_id uuid not null references core.backtest_run(backtest_run_id) on delete cascade,
  item_id text not null,
  champion_model_id text not null,
  model_version uuid references core.model_version(model_version_id),
  champion_metric text not null,
  champion_metric_value numeric,
  wape numeric,
  mape numeric,
  bias numeric,
  rmse numeric,
  candidate_performance jsonb not null default '[]'::jsonb,
  selection_reason text not null,
  selection_method text not null check (selection_method in ('AUTO','MANUAL')),
  selected_at timestamptz not null default now(),
  selected_by uuid references auth.users(id),
  primary key (backtest_run_id, item_id)
);

create table if not exists core.champion_model_history (
  champion_history_id uuid primary key default gen_random_uuid(),
  backtest_run_id uuid not null references core.backtest_run(backtest_run_id) on delete cascade,
  item_id text not null,
  champion_model_id text not null,
  model_version uuid references core.model_version(model_version_id),
  champion_metric text not null,
  champion_metric_value numeric,
  selection_reason text not null,
  selection_method text not null check (selection_method in ('AUTO','MANUAL')),
  selected_at timestamptz not null default now(),
  selected_by uuid references auth.users(id)
);

create or replace function core.run_backtest(p_forecast_run_id uuid)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public, core, analytics
as $$
declare
  v_backtest_id uuid := gen_random_uuid();
  v_setting core.forecast_setting;
  v_actor uuid := auth.uid();
  v_metric text;
begin
  if not core.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_setting from core.forecast_setting where setting_id = 'default';
  if v_setting.test_start is null or v_setting.test_end is null then raise exception 'FORECAST_TEST_SETTING_REQUIRED'; end if;
  v_metric := coalesce(v_setting.champion_metric, 'WAPE');
  insert into core.backtest_run (backtest_run_id, forecast_run_id, test_start, test_end, metric, triggered_by)
  values (v_backtest_id, p_forecast_run_id, v_setting.test_start, v_setting.test_end, v_metric, v_actor);
  begin
    with actuals as (
      select item_id, date_trunc('month', use_date)::date as period, sum(qty) as actual_qty
      from core.v_test_actual
      where use_date between v_setting.test_start and v_setting.test_end
      group by item_id, date_trunc('month', use_date)::date
    ), matched as (
      select fr.model_id, fr.model_version, fr.item_id, fr.period, a.actual_qty, fr.p50 as predicted_qty
      from core.forecast_result fr
      join actuals a on a.item_id = fr.item_id and a.period = fr.period
      where fr.run_id = p_forecast_run_id and fr.p50 is not null
    ), metrics as (
      select model_id, model_version, item_id, count(*)::integer as n_periods,
        case when sum(actual_qty) = 0 then null else sum(abs(predicted_qty - actual_qty)) / nullif(sum(actual_qty),0) end as wape,
        avg(abs(predicted_qty - actual_qty) / nullif(abs(actual_qty),0)) filter (where actual_qty <> 0) as mape,
        avg(predicted_qty - actual_qty) as bias,
        sqrt(avg(power(predicted_qty - actual_qty, 2))) as rmse,
        avg(abs(predicted_qty - actual_qty)) as mae
      from matched group by model_id, model_version, item_id
    )
    insert into core.model_performance (backtest_run_id, forecast_run_id, model_id, model_version, item_id, n_periods, wape, mape, bias, rmse, mae, calculation_status, reason_code)
    select v_backtest_id, p_forecast_run_id, m.model_id, m.model_version, m.item_id, m.n_periods, m.wape, m.mape, m.bias, m.rmse, m.mae,
      case when m.n_periods = 0 then 'CALCULATION_UNAVAILABLE' when m.wape is null and m.mape is null then 'CALCULATION_UNAVAILABLE' else 'SUCCESS' end,
      case when m.n_periods = 0 then 'NO_COMPARABLE_PERIODS' when m.wape is null then 'ACTUAL_SUM_ZERO' when m.mape is null then 'MAPE_DENOMINATOR_ZERO' end
    from metrics m;

    update core.model_performance p set baseline_improvement = case
      when ref.wape is null or ref.wape = 0 or p.wape is null then null
      else (ref.wape - p.wape) / ref.wape end
    from core.model_performance ref
    where p.backtest_run_id = v_backtest_id and ref.backtest_run_id = v_backtest_id
      and ref.item_id = p.item_id and ref.model_id = coalesce(v_setting.reference_model_id, 'MA_3M');

    with ranked as (
      select p.backtest_run_id, p.model_id, p.item_id,
        row_number() over (partition by p.item_id order by
          case v_metric when 'WAPE' then p.wape when 'MAPE' then p.mape when 'RMSE' then p.rmse when 'MAE' then p.mae when 'ABS_BIAS' then abs(p.bias) end nulls last,
          abs(p.bias) nulls last, p.rmse nulls last, p.model_id) as rank
      from core.model_performance p where p.backtest_run_id = v_backtest_id and p.calculation_status = 'SUCCESS'
    )
    update core.model_performance p set rank = r.rank from ranked r where p.backtest_run_id = r.backtest_run_id and p.model_id = r.model_id and p.item_id = r.item_id;

    insert into core.champion_model (backtest_run_id, item_id, champion_model_id, model_version, champion_metric, champion_metric_value, wape, mape, bias, rmse, candidate_performance, selection_reason, selection_method, selected_by)
    select v_backtest_id, best.item_id, best.model_id, best.model_version, v_metric,
      case v_metric when 'WAPE' then best.wape when 'MAPE' then best.mape when 'RMSE' then best.rmse when 'MAE' then best.mae when 'ABS_BIAS' then abs(best.bias) end,
      best.wape, best.mape, best.bias, best.rmse,
      candidates.items, 'AUTO: ' || v_metric || ' 최저값, abs(Bias), RMSE, model_id 순으로 선정', 'AUTO', v_actor
    from (select distinct on (item_id) * from core.model_performance where backtest_run_id = v_backtest_id and calculation_status = 'SUCCESS' order by item_id, rank) best
    join lateral (select jsonb_agg(jsonb_build_object('model_id', p.model_id, 'model_version', p.model_version, 'WAPE', p.wape, 'MAPE', p.mape, 'Bias', p.bias, 'RMSE', p.rmse, 'MAE', p.mae, 'rank', p.rank) order by p.rank) as items from core.model_performance p where p.backtest_run_id = v_backtest_id and p.item_id = best.item_id) candidates on true;

    insert into core.champion_model_history (backtest_run_id, item_id, champion_model_id, model_version, champion_metric, champion_metric_value, selection_reason, selection_method, selected_by)
    select backtest_run_id, item_id, champion_model_id, model_version, champion_metric, champion_metric_value, selection_reason, selection_method, selected_by from core.champion_model where backtest_run_id = v_backtest_id;
    update core.backtest_run set status = 'SUCCESS', finished_at = clock_timestamp() where backtest_run_id = v_backtest_id;
  exception when others then
    update core.backtest_run set status = 'FAILED', message = sqlerrm, finished_at = clock_timestamp() where backtest_run_id = v_backtest_id;
  end;
  return v_backtest_id;
end;
$$;

create or replace function core.set_manual_champion(p_backtest_run_id uuid, p_item_id text, p_model_id text, p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog, public, core, analytics as $$
declare v_user uuid := auth.uid(); v_model_version uuid; v_old jsonb; v_new jsonb;
begin
  if not core.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'MANUAL_CHAMPION_REASON_REQUIRED'; end if;
  select model_version into v_model_version from core.model_performance where backtest_run_id = p_backtest_run_id and item_id = p_item_id and model_id = p_model_id and calculation_status = 'SUCCESS';
  if v_model_version is null then raise exception 'CHAMPION_MODEL_NOT_AVAILABLE'; end if;
  select to_jsonb(c) into v_old from core.champion_model c where c.backtest_run_id = p_backtest_run_id and c.item_id = p_item_id;
  select jsonb_build_object('model_id', p.model_id, 'model_version', p.model_version, 'WAPE', p.wape, 'MAPE', p.mape, 'Bias', p.bias, 'RMSE', p.rmse, 'MAE', p.mae, 'rank', p.rank) into v_new from core.model_performance p where p.backtest_run_id = p_backtest_run_id and p.item_id = p_item_id and p.model_id = p_model_id;
  update core.champion_model c set champion_model_id=p_model_id, model_version=v_model_version, champion_metric_value=case c.champion_metric when 'WAPE' then (v_new->>'WAPE')::numeric when 'MAPE' then (v_new->>'MAPE')::numeric when 'RMSE' then (v_new->>'RMSE')::numeric when 'MAE' then (v_new->>'MAE')::numeric else abs((v_new->>'Bias')::numeric) end, wape=(v_new->>'WAPE')::numeric, mape=(v_new->>'MAPE')::numeric, bias=(v_new->>'Bias')::numeric, rmse=(v_new->>'RMSE')::numeric, selection_reason=p_reason, selection_method='MANUAL', selected_at=now(), selected_by=v_user where c.backtest_run_id=p_backtest_run_id and c.item_id=p_item_id;
  insert into core.champion_model_history (backtest_run_id,item_id,champion_model_id,model_version,champion_metric,champion_metric_value,selection_reason,selection_method,selected_by) select c.backtest_run_id,c.item_id,c.champion_model_id,c.model_version,c.champion_metric,c.champion_metric_value,c.selection_reason,c.selection_method,c.selected_by from core.champion_model c where c.backtest_run_id=p_backtest_run_id and c.item_id=p_item_id;
  insert into core.audit_log(actor,action,target_type,target_id,before,after) values(v_user,'CHAMPION_MODEL_MANUAL_OVERRIDE','champion_model',p_item_id,v_old,v_new || jsonb_build_object('reason',p_reason,'selection_method','MANUAL'));
end; $$;

create or replace view analytics.v_backtest_run as select * from core.backtest_run;
create or replace view analytics.v_model_performance as select * from core.model_performance;
create or replace view analytics.v_champion_model as select * from core.champion_model;
create or replace view analytics.v_model_comparison as
select fr.run_id, fr.model_id, fr.model_version, fr.item_id, fr.period, fr.p50, fr.p80, fr.p90, fr.sigma, fr.basis, a.qty as actual_qty
from core.forecast_result fr left join lateral (select sum(qty) as qty from core.v_test_actual ta where ta.item_id=fr.item_id and date_trunc('month',ta.use_date)::date=fr.period) a on true;

grant select on core.backtest_run, core.model_performance, core.champion_model, core.champion_model_history to authenticated;
grant select on analytics.v_backtest_run, analytics.v_model_performance, analytics.v_champion_model, analytics.v_model_comparison to authenticated;
grant execute on function core.run_backtest(uuid), core.set_manual_champion(uuid,text,text,text) to authenticated;
alter table core.backtest_run enable row level security;
alter table core.model_performance enable row level security;
alter table core.champion_model enable row level security;
alter table core.champion_model_history enable row level security;
drop policy if exists "인증 사용자 Backtest 조회" on core.backtest_run;
create policy "인증 사용자 Backtest 조회" on core.backtest_run for select to authenticated using (auth.uid() is not null);
drop policy if exists "인증 사용자 Performance 조회" on core.model_performance;
create policy "인증 사용자 Performance 조회" on core.model_performance for select to authenticated using (auth.uid() is not null);
drop policy if exists "인증 사용자 Champion 조회" on core.champion_model;
create policy "인증 사용자 Champion 조회" on core.champion_model for select to authenticated using (auth.uid() is not null);
drop policy if exists "인증 사용자 Champion 이력 조회" on core.champion_model_history;
create policy "인증 사용자 Champion 이력 조회" on core.champion_model_history for select to authenticated using (auth.uid() is not null);
revoke all on core.backtest_run, core.model_performance, core.champion_model, core.champion_model_history from anon;
