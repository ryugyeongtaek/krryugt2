-- STEP 6: SQL Baseline Forecast Engine

alter table core.forecast_setting
  add column if not exists forecast_horizon integer not null default 3;

alter table core.forecast_setting
  drop constraint if exists forecast_setting_forecast_horizon_check;

alter table core.forecast_setting
  add constraint forecast_setting_forecast_horizon_check check (forecast_horizon between 1 and 24);

create table if not exists core.model_config (
  model_id text primary key,
  model_name text not null,
  family text not null,
  engine text not null default 'SQL_BASELINE',
  version text not null,
  enabled boolean not null default true,
  is_default boolean not null default false,
  applicable_demand_type text[] not null default array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'],
  parameters jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  check (model_id ~ '^[A-Z0-9_]+$'),
  check (array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'] @> applicable_demand_type)
);

create table if not exists core.model_version (
  model_version_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references core.forecast_run(run_id) on delete cascade,
  model_id text not null references core.model_config(model_id),
  version text not null,
  parameters jsonb not null,
  definition jsonb not null,
  snapshot_at timestamptz not null default now(),
  unique (run_id, model_id)
);

alter table core.forecast_run
  add column if not exists status text not null default 'SUCCESS',
  add column if not exists granularity text,
  add column if not exists train_start date,
  add column if not exists train_end date,
  add column if not exists horizon integer,
  add column if not exists champion_metric text,
  add column if not exists models jsonb not null default '[]'::jsonb,
  add column if not exists n_models integer not null default 0,
  add column if not exists n_items integer not null default 0,
  add column if not exists n_rows integer not null default 0,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists finished_at timestamptz,
  add column if not exists duration_ms bigint,
  add column if not exists triggered_by uuid references auth.users(id),
  add column if not exists triggered_email text,
  add column if not exists note text,
  add column if not exists message text;

alter table core.forecast_run
  drop constraint if exists forecast_run_status_check;

alter table core.forecast_run
  add constraint forecast_run_status_check check (status in ('RUNNING','SUCCESS','FAILED'));

create table if not exists core.forecast_result (
  run_id uuid not null references core.forecast_run(run_id) on delete cascade,
  model_id text not null references core.model_config(model_id),
  model_version uuid not null references core.model_version(model_version_id),
  item_id text not null,
  period date not null,
  predicted_qty numeric,
  p50 numeric,
  p80 numeric,
  p90 numeric,
  sigma numeric,
  basis text not null,
  reason_code text,
  created_at timestamptz not null default now(),
  primary key (run_id, model_id, item_id, period)
);

insert into core.model_config (model_id, model_name, family, engine, version, enabled, is_default, applicable_demand_type, parameters, description)
values
  ('MA_3M', '3개월 이동평균', 'MOVING_AVERAGE', 'SQL_BASELINE', '1.0.0', true, true, array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'], '{"lookback":3,"z80":0.841621,"z90":1.281552}'::jsonb, '최근 3개월 학습 수요 평균'),
  ('MA_6M', '6개월 이동평균', 'MOVING_AVERAGE', 'SQL_BASELINE', '1.0.0', true, false, array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'], '{"lookback":6,"z80":0.841621,"z90":1.281552}'::jsonb, '최근 6개월 학습 수요 평균'),
  ('WMA_3M', '3개월 가중 이동평균', 'WEIGHTED_MOVING_AVERAGE', 'SQL_BASELINE', '1.0.0', true, false, array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'], '{"lookback":3,"weights":[1,2,3],"z80":0.841621,"z90":1.281552}'::jsonb, '최근순 3:2:1 가중 평균'),
  ('PY_SAME_MONTH', '전년 동월', 'SEASONAL_NAIVE', 'SQL_BASELINE', '1.0.0', true, false, array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'], '{"seasonal_lag":12,"z80":0.841621,"z90":1.281552}'::jsonb, '전년 같은 월의 실제 학습 수요'),
  ('SEASONAL_NAIVE', '계절성 나이브', 'SEASONAL_NAIVE', 'SQL_BASELINE', '1.0.0', true, false, array['SMOOTH','INTERMITTENT','ERRATIC','LUMPY'], '{"seasonal_lag":12,"z80":0.841621,"z90":1.281552}'::jsonb, '12개월 전 실제 학습 수요'),
  ('LEGACY_IMPORT', '기존 Import Forecast', 'LEGACY', 'SQL_BASELINE', '0.0.0', false, false, array['SMOOTH'], '{}'::jsonb, '기존 최소 forecast_run 호환용')
on conflict (model_id) do nothing;

create or replace function core.run_baseline_forecast()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, core, analytics
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_setting core.forecast_setting;
  v_snapshot timestamptz;
  v_triggered_email text;
  v_model record;
  v_version_id uuid;
  v_started_at timestamptz := clock_timestamp();
begin
  if not core.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  select * into v_setting from core.forecast_setting where setting_id = 'default';
  if v_setting.train_start is null or v_setting.train_end is null then raise exception 'FORECAST_TRAIN_SETTING_REQUIRED'; end if;
  if v_setting.forecast_horizon is null or v_setting.forecast_horizon < 1 then raise exception 'FORECAST_HORIZON_REQUIRED'; end if;

  select au.email into v_triggered_email from auth.users au where au.id = auth.uid();
  select greatest(
    coalesce(max(d.loaded_at), '-infinity'::timestamptz),
    coalesce(v_setting.updated_at, '-infinity'::timestamptz)
  ) into v_snapshot
  from core.v_train_demand d;

  insert into core.forecast_run (
    run_id, status, granularity, train_start, train_end, horizon, data_snapshot_at,
    models, n_models, started_at, triggered_by, triggered_email, note, message, updated_at
  )
  values (
    v_run_id, 'RUNNING', v_setting.granularity, v_setting.train_start, v_setting.train_end,
    v_setting.forecast_horizon, v_snapshot, '[]'::jsonb, 0, v_started_at, auth.uid(), v_triggered_email, null, null, now()
  );

  begin
    create temp table if not exists baseline_grid (
      item_id text not null,
      period date not null,
      period_index integer not null,
      quantity numeric,
      primary key (item_id, period)
    ) on commit drop;
    truncate baseline_grid;

    insert into baseline_grid (item_id, period, period_index, quantity)
    with periods as (
      select p.period_start::date as period, row_number() over (order by p.period_start)::integer as period_index
      from generate_series(date_trunc('month', v_setting.train_start)::date, date_trunc('month', v_setting.train_end)::date, interval '1 month') p(period_start)
    ), items as (
      select distinct item_id from core.v_train_demand where is_training_eligible
    ), observed as (
      select item_id, date_trunc('month', use_date)::date as period, sum(qty) filter (where qty is not null) as quantity
      from core.v_train_demand
      where is_training_eligible and use_date between v_setting.train_start and v_setting.train_end
      group by item_id, date_trunc('month', use_date)::date
    )
    select i.item_id, p.period, p.period_index, o.quantity
    from items i cross join periods p left join observed o on o.item_id = i.item_id and o.period = p.period;

    for v_model in select * from core.model_config where enabled order by model_id loop
      insert into core.model_version (run_id, model_id, version, parameters, definition, snapshot_at)
      values (
        v_run_id, v_model.model_id, v_model.version, v_model.parameters,
        jsonb_build_object('model_id', v_model.model_id, 'model_name', v_model.model_name, 'family', v_model.family, 'engine', v_model.engine, 'applicable_demand_type', v_model.applicable_demand_type, 'description', v_model.description),
        v_started_at
      ) returning model_version_id into v_version_id;

      create temp table if not exists baseline_fit (
        item_id text not null,
        period date not null,
        actual_qty numeric,
        fitted_qty numeric
      ) on commit drop;
      truncate baseline_fit;

      if v_model.model_id in ('MA_3M','MA_6M') then
        insert into baseline_fit
        select g.item_id, g.period, g.quantity,
          case when count(prev.quantity) = (v_model.parameters->>'lookback')::integer then avg(prev.quantity) end
        from baseline_grid g
        left join baseline_grid prev on prev.item_id = g.item_id
          and prev.period < g.period
          and prev.period >= g.period - make_interval(months => (v_model.parameters->>'lookback')::integer)
        group by g.item_id, g.period, g.quantity;
      elsif v_model.model_id = 'WMA_3M' then
        insert into baseline_fit
        select g.item_id, g.period, g.quantity,
          case when count(prev.quantity) = 3 then sum(prev.quantity * case when prev.period = g.period - interval '1 month' then (v_model.parameters->'weights'->>2)::numeric when prev.period = g.period - interval '2 month' then (v_model.parameters->'weights'->>1)::numeric else (v_model.parameters->'weights'->>0)::numeric end) / nullif((v_model.parameters->'weights'->>0)::numeric + (v_model.parameters->'weights'->>1)::numeric + (v_model.parameters->'weights'->>2)::numeric, 0) end
        from baseline_grid g
        left join baseline_grid prev on prev.item_id = g.item_id and prev.period between g.period - interval '3 month' and g.period - interval '1 month'
        group by g.item_id, g.period, g.quantity;
      else
        insert into baseline_fit
        select g.item_id, g.period, g.quantity, prev.quantity
        from baseline_grid g
        left join baseline_grid prev on prev.item_id = g.item_id and prev.period = g.period - make_interval(months => coalesce((v_model.parameters->>'seasonal_lag')::integer, 12));
      end if;

      insert into core.forecast_result (run_id, model_id, model_version, item_id, period, predicted_qty, p50, p80, p90, sigma, basis, reason_code)
      with residuals as (
        select item_id, stddev_samp(actual_qty - fitted_qty) as sigma
        from baseline_fit
        where actual_qty is not null and fitted_qty is not null
        group by item_id
        having count(*) >= 2
      ), future_periods as (
        select p.period::date as period
        from generate_series(date_trunc('month', v_setting.train_end)::date + interval '1 month', date_trunc('month', v_setting.train_end)::date + make_interval(months => v_setting.forecast_horizon), interval '1 month') p(period)
      ), items as (
        select distinct g.item_id
        from baseline_grid g
        left join analytics.v_sku_demand_profile dp on dp.item_id = g.item_id
        where dp.demand_type is null or dp.demand_type = any(v_model.applicable_demand_type)
      ), points as (
        select i.item_id, f.period,
          case
            when v_model.model_id in ('MA_3M','MA_6M') then (select case when count(g.quantity) = (v_model.parameters->>'lookback')::integer then avg(g.quantity) end from baseline_grid g where g.item_id = i.item_id and g.period between f.period - make_interval(months => (v_model.parameters->>'lookback')::integer) and f.period - interval '1 month')
            when v_model.model_id = 'WMA_3M' then (select case when count(g.quantity) = 3 then sum(g.quantity * case when g.period = f.period - interval '1 month' then (v_model.parameters->'weights'->>2)::numeric when g.period = f.period - interval '2 month' then (v_model.parameters->'weights'->>1)::numeric else (v_model.parameters->'weights'->>0)::numeric end) / nullif((v_model.parameters->'weights'->>0)::numeric + (v_model.parameters->'weights'->>1)::numeric + (v_model.parameters->'weights'->>2)::numeric, 0) end from baseline_grid g where g.item_id = i.item_id and g.period between f.period - interval '3 month' and f.period - interval '1 month')
            else (select g.quantity from baseline_grid g where g.item_id = i.item_id and g.period = f.period - make_interval(months => coalesce((v_model.parameters->>'seasonal_lag')::integer, 12)))
          end as point
        from items i cross join future_periods f
      )
      select p.item_id, v_model.model_id, v_version_id, p.item_id, p.period, p.point, p.point,
        case when r.sigma is null or p.point is null then null else p.point + r.sigma * (v_model.parameters->>'z80')::numeric end,
        case when r.sigma is null or p.point is null then null else p.point + r.sigma * (v_model.parameters->>'z90')::numeric end,
        r.sigma,
        v_model.model_id,
        case when p.point is null then 'INSUFFICIENT_HISTORY' when r.sigma is null then 'SIGMA_UNAVAILABLE' end
      from points p left join residuals r on r.item_id = p.item_id;
    end loop;

    update core.forecast_run r
    set status = 'SUCCESS',
        models = coalesce((select jsonb_agg(jsonb_build_object('model_id', mc.model_id, 'version', mc.version, 'parameters', mc.parameters) order by mc.model_id) from core.model_config mc where mc.enabled), '[]'::jsonb),
        n_models = (select count(*) from core.model_config where enabled),
        n_items = (select count(distinct item_id) from core.forecast_result where run_id = v_run_id),
        n_rows = (select count(*) from core.forecast_result where run_id = v_run_id),
        finished_at = clock_timestamp(),
        duration_ms = extract(epoch from clock_timestamp() - r.started_at) * 1000,
        updated_at = now()
    where r.run_id = v_run_id;
  exception when others then
    update core.forecast_run
    set status = 'FAILED', message = sqlerrm, finished_at = clock_timestamp(), duration_ms = extract(epoch from clock_timestamp() - started_at) * 1000, updated_at = now()
    where run_id = v_run_id;
  end;

  return v_run_id;
end;
$$;

create or replace view analytics.v_model_config as
select model_id, model_name, family, engine, version, enabled, is_default, applicable_demand_type, parameters, description, updated_at, updated_by
from core.model_config;

create or replace view analytics.v_forecast_run as
select r.*, greatest(coalesce((select max(d.loaded_at) from core.v_train_demand d), '-infinity'::timestamptz), coalesce((select updated_at from core.forecast_setting where setting_id = 'default'), '-infinity'::timestamptz)) > r.data_snapshot_at as is_stale
from core.forecast_run r;

create or replace view analytics.v_forecast_result as
select run_id, model_id, model_version, item_id, period, predicted_qty, p50, p80, p90, sigma, basis, reason_code, created_at
from core.forecast_result;

create or replace view analytics.v_forecast_run_kpi as
select run_id, count(distinct model_id)::integer as n_models, count(distinct item_id)::integer as n_items, count(*)::integer as n_rows, count(*) filter (where p50 is not null)::integer as n_with_point_forecast, count(*) filter (where p80 is null or p90 is null)::integer as n_interval_unavailable
from core.forecast_result
group by run_id;

revoke all on core.model_config, core.model_version, core.forecast_result from anon, authenticated;
grant usage on schema core, analytics to authenticated;
grant select on core.model_config, core.model_version, core.forecast_result to authenticated;
grant execute on function core.run_baseline_forecast() to authenticated;

alter table core.model_config enable row level security;
alter table core.model_version enable row level security;
alter table core.forecast_result enable row level security;

drop policy if exists "인증 사용자 모델 설정 조회" on core.model_config;
create policy "인증 사용자 모델 설정 조회" on core.model_config for select to authenticated using (auth.uid() is not null);
drop policy if exists "관리자 모델 설정 변경" on core.model_config;
create policy "관리자 모델 설정 변경" on core.model_config for all to authenticated using (core.is_admin()) with check (core.is_admin());
drop policy if exists "인증 사용자 모델 버전 조회" on core.model_version;
create policy "인증 사용자 모델 버전 조회" on core.model_version for select to authenticated using (auth.uid() is not null);
drop policy if exists "인증 사용자 Forecast 결과 조회" on core.forecast_result;
create policy "인증 사용자 Forecast 결과 조회" on core.forecast_result for select to authenticated using (auth.uid() is not null);

revoke all on analytics.v_model_config, analytics.v_forecast_run, analytics.v_forecast_result, analytics.v_forecast_run_kpi from anon;
grant select on analytics.v_model_config, analytics.v_forecast_run, analytics.v_forecast_result, analytics.v_forecast_run_kpi to authenticated;
