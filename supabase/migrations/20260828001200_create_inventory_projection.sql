-- STEP 9: Lead Time 정책화와 Forecast 기반 Inventory Projection
-- 모든 기간 계산은 forecast_setting과 저장된 forecast_result를 사용하며, raw usage_history를 직접 사용하지 않습니다.
-- 지원 reason_code: NO_USAGE_HISTORY, NO_LEADTIME, NO_INVENTORY_DATA, INSUFFICIENT_SAMPLE, NO_FORECAST

create table if not exists core.leadtime_policy (
  policy_id uuid primary key default gen_random_uuid(),
  item_id text,
  supplier_id text,
  confirmed_lead_time numeric(10,2),
  effective_from date not null default current_date,
  changed_by uuid references auth.users(id),
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (item_id is not null or supplier_id is not null),
  check (confirmed_lead_time is null or confirmed_lead_time > 0)
);

create table if not exists core.leadtime_policy_history (
  history_id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references core.leadtime_policy(policy_id) on delete cascade,
  item_id text,
  supplier_id text,
  before_confirmed_lead_time numeric(10,2),
  after_confirmed_lead_time numeric(10,2),
  effective_from date not null,
  reason text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index if not exists leadtime_policy_item_idx on core.leadtime_policy(item_id, supplier_id, effective_from desc);
create index if not exists leadtime_policy_history_item_idx on core.leadtime_policy_history(item_id, supplier_id, changed_at desc);

create or replace function core.set_leadtime_policy(
  p_item_id text, p_supplier_id text, p_confirmed_lead_time numeric, p_effective_from date, p_reason text
) returns void language plpgsql security definer
set search_path = pg_catalog, public, core as $leadtime_policy$
begin
  if not core.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'LEADTIME_REASON_REQUIRED'; end if;
  if p_confirmed_lead_time is not null and p_confirmed_lead_time <= 0 then raise exception 'LEADTIME_MUST_BE_POSITIVE'; end if;
  insert into core.leadtime_policy(item_id,supplier_id,confirmed_lead_time,effective_from,changed_by,reason)
  values(nullif(trim(p_item_id), ''),nullif(trim(p_supplier_id), ''),p_confirmed_lead_time,coalesce(p_effective_from,current_date),auth.uid(),p_reason);
  insert into core.leadtime_policy_history(policy_id,item_id,supplier_id,after_confirmed_lead_time,effective_from,reason,changed_by)
  select policy_id,item_id,supplier_id,confirmed_lead_time,effective_from,reason,changed_by from core.leadtime_policy
   where item_id is not distinct from nullif(trim(p_item_id), '') and supplier_id is not distinct from nullif(trim(p_supplier_id), '')
   order by created_at desc limit 1;
  insert into core.audit_log(actor,action,target_type,target_id,before,after)
  values(auth.uid(),'LEADTIME_POLICY_CHANGED','leadtime_policy',coalesce(nullif(trim(p_item_id), ''),nullif(trim(p_supplier_id), '')),null,jsonb_build_object('item_id',p_item_id,'supplier_id',p_supplier_id,'confirmed_lead_time',p_confirmed_lead_time,'reason',p_reason));
end $leadtime_policy$;

drop view if exists analytics.v_stockout_kpi;
drop view if exists analytics.v_stockout_risk;
drop view if exists analytics.v_inventory_projection;
drop view if exists analytics.v_champion_forecast;
drop view if exists analytics.v_leadtime_policy;

create or replace view analytics.v_leadtime_policy as
with actual as (
  select supplier_id, supplier_name, p50_days, p80_days, p90_days, mean_days, n_samples
  from analytics.v_leadtime_gap
), latest as (
  select distinct on (coalesce(item_id,''), coalesce(supplier_id,'')) *
  from core.leadtime_policy order by coalesce(item_id,''), coalesce(supplier_id,''), effective_from desc, updated_at desc
)
select l.policy_id, l.item_id, l.supplier_id, a.supplier_name, a.mean_days as actual_lead_time,
  a.p50_days, a.p80_days, a.p90_days, a.n_samples, l.confirmed_lead_time,
  coalesce(l.confirmed_lead_time, a.p80_days) as effective_lead_time,
  l.effective_from, l.changed_by, l.reason, l.updated_at
from latest l left join actual a on a.supplier_id = l.supplier_id
union all
select null::uuid, null::text, a.supplier_id, a.supplier_name, a.mean_days, a.p50_days, a.p80_days, a.p90_days, a.n_samples,
  null::numeric, a.p80_days, null::date, null::uuid, null::text, null::timestamptz
from actual a where not exists (select 1 from latest l where l.supplier_id = a.supplier_id and l.item_id is null);

create or replace view analytics.v_champion_forecast as
with latest_run as (
  select distinct on (fr.item_id) fr.*
  from core.forecast_result fr
  join core.forecast_run r on r.run_id = fr.run_id and r.status = 'SUCCESS'
  join lateral (select c.* from core.champion_model c join core.backtest_run b on b.backtest_run_id=c.backtest_run_id
    where c.item_id=fr.item_id and b.forecast_run_id=fr.run_id and b.status='SUCCESS'
    order by c.selected_at desc limit 1) champion on champion.champion_model_id=fr.model_id
  order by fr.item_id, r.finished_at desc nulls last, fr.period desc
)
select fr.run_id, fr.model_id, fr.model_version, fr.item_id, fr.period, fr.p50 as forecast_demand,
  fr.p80, fr.p90, fr.sigma, fr.basis
from core.forecast_result fr
join core.forecast_run r on r.run_id=fr.run_id and r.status='SUCCESS'
join core.champion_model c on c.item_id=fr.item_id and c.champion_model_id=fr.model_id
join core.backtest_run b on b.backtest_run_id=c.backtest_run_id and b.forecast_run_id=fr.run_id and b.status='SUCCESS'
where r.finished_at = (select max(r2.finished_at) from core.forecast_run r2 where r2.status='SUCCESS');

create or replace view analytics.v_inventory_projection as
with recursive settings as (
  select * from core.forecast_setting where setting_id='default'
), periods as (
  select gs::date as period from settings s cross join lateral generate_series(
    date_trunc('month', s.train_end)::date + interval '1 month',
    date_trunc('month', s.train_end)::date + make_interval(months => s.forecast_horizon), interval '1 month') gs
), items as (
  select distinct item_id from analytics.v_champion_forecast
  union select distinct upper(regexp_replace("품목코드", '[\s\-_]', '', 'g')) from raw.inventory
  union select distinct item_id from raw.sales_order
), inventory_latest as (
  select item_id, sum(stock)::numeric as available_inventory from (
    select upper(regexp_replace("품목코드", '[\s\-_]', '', 'g')) item_id, "현재고"::numeric stock,
      dense_rank() over (partition by "품목코드" order by "기준일자" desc) rnk from raw.inventory
  ) x where rnk=1 group by item_id
), receipts as (
  select upper(regexp_replace("품목코드", '[\s\-_]', '', 'g')) item_id,
    date_trunc('month', "납기예정일"::date)::date period, sum("발주수량"::numeric) scheduled_receipt
  from raw.purchase_order where "납기예정일" is not null and "납기예정일"::date >= current_date
  group by 1,2
), orders as (
  select item_id, date_trunc('month', order_date)::date period, sum(quantity) confirmed_sales_order
  from raw.sales_order where upper(coalesce(status,'')) in ('CONFIRMED','확정','CONFIRMED_ORDER') group by 1,2
), allocations as (
  select upper(regexp_replace(coalesce(item_id,''), '[\s\-_]', '', 'g')) item_id,
    date_trunc('month', event_date)::date period, sum(quantity) soft_allocation
  from raw.business_event where upper(replace(event_type,'-','_')) in ('SOFT_ALLOCATION','SOFT_ALLOC') group by 1,2
), flow as (
  select i.item_id, p.period, inv.available_inventory,
    coalesce(rc.scheduled_receipt,0)::numeric scheduled_receipt,
    coalesce(so.confirmed_sales_order,0)::numeric confirmed_sales_order,
    coalesce(al.soft_allocation,0)::numeric soft_allocation,
    case when cf.forecast_demand is null then null else greatest(cf.forecast_demand,0) end forecast_demand,
    case when al.item_id is null then 'STRUCTURAL_ZERO' else 'DATA_PRESENT' end soft_allocation_status,
    cf.run_id forecast_run_id, lp.effective_lead_time
  from items i cross join periods p left join inventory_latest inv on inv.item_id=i.item_id
  left join receipts rc on rc.item_id=i.item_id and rc.period=p.period left join orders so on so.item_id=i.item_id and so.period=p.period
  left join allocations al on al.item_id=i.item_id and al.period=p.period left join analytics.v_champion_forecast cf on cf.item_id=i.item_id and cf.period=p.period
  left join lateral (select effective_lead_time from analytics.v_leadtime_policy x where x.item_id=i.item_id or (x.item_id is null and x.supplier_id=(select supplier_id from raw.item_master where upper(regexp_replace("품목코드", '[\s\-_]','','g'))=i.item_id limit 1)) order by (x.item_id is not null) desc, x.effective_from desc nulls last limit 1) lp on true
), projected as (
  select f.*, f.available_inventory beginning_inventory,
    case when f.available_inventory is null or f.forecast_demand is null then null else f.available_inventory+f.scheduled_receipt-f.confirmed_sales_order-f.soft_allocation-f.forecast_demand end ending_projected_inventory
  from flow f where f.period=(select min(period) from periods)
  union all
  select f.*, p.ending_projected_inventory,
    case when p.ending_projected_inventory is null or f.forecast_demand is null then null else p.ending_projected_inventory+f.scheduled_receipt-f.confirmed_sales_order-f.soft_allocation-f.forecast_demand end
  from projected p join flow f on f.item_id=p.item_id and f.period=p.period + interval '1 month'
), first_stockout as (
  select item_id, min(period) filter (where ending_projected_inventory <= 0) stockout_period from projected group by item_id
)
select p.*, fs.stockout_period,
  case when fs.stockout_period is null or p.beginning_inventory is null then null else greatest(0, extract(day from (fs.stockout_period + interval '1 month') - (select min(period) from periods))) end::numeric days_of_supply,
  case when fs.stockout_period is null then null else greatest(0, (select count(*) from periods x where x.period < fs.stockout_period))::numeric end months_of_supply,
  case when p.available_inventory is null then 'CALCULATION_UNAVAILABLE' when p.effective_lead_time is null then 'CALCULATION_UNAVAILABLE' when p.forecast_run_id is null or p.forecast_demand is null then 'CALCULATION_UNAVAILABLE' when fs.stockout_period is null then 'SAFE' when fs.stockout_period <= (select min(period) from periods)+make_interval(days=>p.effective_lead_time::integer) then 'CRITICAL' else 'WARNING' end risk_status,
  case when p.available_inventory is null then 'NO_INVENTORY_DATA' when p.effective_lead_time is null then 'NO_LEADTIME' when p.forecast_run_id is null or p.forecast_demand is null then 'NO_FORECAST' else null end reason_code
from projected p left join first_stockout fs on fs.item_id=p.item_id;

create or replace view analytics.v_stockout_risk as
select distinct on (item_id) item_id, item_id as item_name, null::text as supplier_name,
  available_inventory as current_stock, scheduled_receipt as inbound_qty, beginning_inventory as available_qty,
  null::numeric as daily_usage_avg, effective_lead_time as planned_lead_time, days_of_supply as stockout_days,
  stockout_period::text as stockout_date, risk_status, reason_code as reason,
  period, scheduled_receipt, confirmed_sales_order, soft_allocation, forecast_demand, ending_projected_inventory,
  months_of_supply, soft_allocation_status
from analytics.v_inventory_projection order by item_id, period;

create or replace view analytics.v_stockout_kpi as
select count(distinct item_id)::integer n_items,
  count(distinct item_id) filter(where risk_status='CRITICAL')::integer n_critical,
  count(distinct item_id) filter(where risk_status='WARNING')::integer n_warning,
  count(distinct item_id) filter(where risk_status='SAFE')::integer n_safe,
  count(distinct item_id) filter(where risk_status='CALCULATION_UNAVAILABLE')::integer n_unknown,
  count(distinct item_id) filter(where stockout_period <= period + interval '30 day')::integer n_within_30d,
  avg(days_of_supply) filter(where days_of_supply is not null) avg_stockout_days
from analytics.v_inventory_projection;

grant usage on schema core, analytics to authenticated;
grant select on analytics.v_leadtime_policy, analytics.v_champion_forecast, analytics.v_inventory_projection, analytics.v_stockout_risk, analytics.v_stockout_kpi to authenticated;
grant select on core.leadtime_policy_history to authenticated;
grant execute on function core.set_leadtime_policy(text,text,numeric,date,text) to authenticated;
revoke all on core.leadtime_policy, core.leadtime_policy_history from anon;
grant select on core.leadtime_policy to authenticated;
alter table core.leadtime_policy enable row level security;
alter table core.leadtime_policy_history enable row level security;
drop policy if exists "인증 사용자 리드타임 정책 조회" on core.leadtime_policy;
create policy "인증 사용자 리드타임 정책 조회" on core.leadtime_policy for select to authenticated using (auth.uid() is not null);
drop policy if exists "인증 사용자 리드타임 이력 조회" on core.leadtime_policy_history;
create policy "인증 사용자 리드타임 이력 조회" on core.leadtime_policy_history for select to authenticated using (auth.uid() is not null);
