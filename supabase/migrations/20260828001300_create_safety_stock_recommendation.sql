-- STEP 10: Forecast error와 Inventory Projection을 연결한 Safety Stock / 발주추천
-- z-value, grade별 service level, safety buffer는 DB 정책으로 관리합니다.

insert into core.policy_config(config_key, safety_buffer_days, settings)
values ('SAFETY_STOCK', 0, '{"service_levels":{"A":{"service_level":0.98,"z_value":2.05},"B":{"service_level":0.95,"z_value":1.645},"C":{"service_level":0.90,"z_value":1.282}}}'::jsonb)
on conflict (config_key) do nothing;

drop view if exists analytics.purchase_recommendation;
drop view if exists analytics.v_purchase_recommendation;
drop view if exists analytics.v_safety_stock;

create or replace view analytics.v_safety_stock as
with policy as (
  select settings, safety_buffer_days from core.policy_config where config_key='SAFETY_STOCK' and active
), projection_base as (
  select distinct on (item_id) item_id, period, forecast_demand as forecast_qty, confirmed_sales_order,
    available_inventory, scheduled_receipt, stockout_period, risk_status, forecast_run_id
  from analytics.v_inventory_projection order by item_id, period
), item_info as (
  select distinct on (upper(regexp_replace("품목코드", '[\s\-_]', '', 'g'))) upper(regexp_replace("품목코드", '[\s\-_]', '', 'g')) item_id,
    "품목명"::text item_name, supplier_id from raw.item_master order by upper(regexp_replace("품목코드", '[\s\-_]', '', 'g'))
), item_policy as (
  select * from core.item_policy
), champion_error as (
  select distinct on (c.item_id) c.item_id, c.champion_model_id, c.model_version, p.rmse as sigma_d,
    p.n_periods, p.calculation_status
  from core.champion_model c join core.backtest_run b on b.backtest_run_id=c.backtest_run_id and b.status='SUCCESS'
  join core.model_performance p on p.backtest_run_id=c.backtest_run_id and p.item_id=c.item_id and p.model_id=c.champion_model_id
  where p.calculation_status='SUCCESS' order by c.item_id, c.selected_at desc
), leadtime as (
  select distinct on (coalesce(x.item_id,''), coalesce(x.supplier_id,'')) x.item_id, x.supplier_id,
    x.effective_lead_time, g.mean_days, g.std_days, g.n_samples
  from analytics.v_leadtime_policy x left join analytics.v_leadtime_gap g on g.supplier_id=x.supplier_id
  order by coalesce(x.item_id,''), coalesce(x.supplier_id,''), (x.item_id is not null) desc, x.effective_from desc nulls last
), source as (
  select p.*, ii.item_name, ii.supplier_id, ip.item_grade, ip.service_level item_service_level, ip.moq, ip.pack_size,
    ce.model_version, ce.sigma_d, ce.n_periods error_periods, lt.effective_lead_time, lt.mean_days leadtime_mean, lt.std_days sigma_l,
    coalesce(ip.service_level, (pol.settings->'service_levels'->coalesce(ip.item_grade,'')->>'service_level')::numeric) service_level,
    (pol.settings->'service_levels'->coalesce(ip.item_grade,'')->>'z_value')::numeric z_value,
    pol.safety_buffer_days
  from projection_base p left join item_info ii on ii.item_id=p.item_id left join item_policy ip on ip.item_id=p.item_id
  left join champion_error ce on ce.item_id=p.item_id left join leadtime lt on (lt.item_id=p.item_id or (lt.item_id is null and lt.supplier_id=ii.supplier_id))
  cross join policy pol
), calculated as (
  select s.*,
    case when s.effective_lead_time is null then null when s.sigma_d is null or s.sigma_l is null or s.forecast_qty is null then null
      else sqrt(s.effective_lead_time * power(s.sigma_d,2) + power(s.forecast_qty,2) * power(s.sigma_l,2)) end sigma_dlt,
    case when s.effective_lead_time is null or s.sigma_d is null or s.sigma_l is null or s.forecast_qty is null or s.z_value is null then null
      else s.z_value * sqrt(s.effective_lead_time * power(s.sigma_d,2) + power(s.forecast_qty,2) * power(s.sigma_l,2)) end safety_stock_value
  from source s
)
select item_id, item_name, item_grade, forecast_qty, confirmed_sales_order, available_inventory, scheduled_receipt,
  effective_lead_time, sigma_d, forecast_qty expected_demand, sigma_l, leadtime_mean, sigma_dlt,
  service_level, z_value, safety_stock_value as safety_stock, error_periods, stockout_period, risk_status, model_version, forecast_run_id,
  safety_buffer_days,
  case when available_inventory is null then 'CALCULATION_UNAVAILABLE' when effective_lead_time is null then 'CALCULATION_UNAVAILABLE'
    when forecast_qty is null then 'CALCULATION_UNAVAILABLE' when sigma_d is null or error_periods < 2 then 'CALCULATION_UNAVAILABLE'
    when sigma_l is null then 'CALCULATION_UNAVAILABLE' when service_level is null or z_value is null then 'CALCULATION_UNAVAILABLE' else 'SUCCESS' end calculation_status,
  case when available_inventory is null then 'NO_INVENTORY_DATA' when effective_lead_time is null then 'NO_LEADTIME'
    when forecast_qty is null then 'NO_FORECAST' when sigma_d is null or error_periods < 2 then 'INSUFFICIENT_FORECAST_ERROR'
    when sigma_l is null then 'INSUFFICIENT_SAMPLE' when item_grade is null and item_service_level is null and moq is null and pack_size is null then 'NO_ITEM_POLICY' when service_level is null or z_value is null then 'NO_SERVICE_LEVEL' end reason_code
from calculated;

create or replace view analytics.v_purchase_recommendation as
with base as (
  select s.*, greatest(coalesce(s.forecast_qty,0), coalesce(s.confirmed_sales_order,0)) demand_basis_qty,
    ip.moq, ip.pack_size
  from analytics.v_safety_stock s left join core.item_policy ip on ip.item_id=s.item_id
), required as (
  select b.*, case when b.calculation_status <> 'SUCCESS' then null else b.demand_basis_qty - b.safety_stock - b.available_inventory - b.scheduled_receipt end required_qty
  from base b
), recommended as (
  select r.*, case when r.required_qty is null then null when r.required_qty <= 0 then 0::numeric
    when r.moq is null and r.pack_size is null then r.required_qty
    when r.pack_size is null then greatest(r.required_qty, coalesce(r.moq,0))
    else ceil(greatest(r.required_qty, coalesce(r.moq,0)) / r.pack_size) * r.pack_size end recommended_qty,
    case when r.required_qty is null or r.stockout_period is null then null else r.stockout_period - make_interval(days=>r.effective_lead_time::integer) - make_interval(days=>coalesce(r.safety_buffer_days,0)::integer) end recommended_order_date
  from required r
)
select item_id, item_name, item_grade, forecast_qty, confirmed_sales_order, demand_basis_qty, available_inventory,
  scheduled_receipt, safety_stock, effective_lead_time, stockout_period::date stockout_date, safety_buffer_days,
  required_qty, moq, pack_size, recommended_qty, recommended_order_date, risk_status,
  case when calculation_status <> 'SUCCESS' then 'CALCULATION_UNAVAILABLE' when required_qty <= 0 then 'NO_ORDER_REQUIRED' else 'SUCCESS' end calculation_status,
  case when calculation_status <> 'SUCCESS' then reason_code when required_qty <= 0 then null when stockout_period is null then 'NO_STOCKOUT_IN_HORIZON' end reason_code,
  case when recommended_order_date is null then false else recommended_order_date <= current_date end is_immediate,
  case when recommended_order_date is null then false else recommended_order_date < current_date end is_overdue,
  model_version, forecast_run_id,
  jsonb_build_object('demand_basis_qty',demand_basis_qty,'safety_stock',safety_stock,'available_inventory',available_inventory,
    'scheduled_receipt',scheduled_receipt,'required_qty',required_qty,'moq',moq,'pack_size',pack_size,'recommended_qty',recommended_qty,
    'effective_lead_time',effective_lead_time,'safety_buffer_days',safety_buffer_days,'stockout_date',stockout_period) calculation_trace
from recommended;

create or replace view analytics.purchase_recommendation as select * from analytics.v_purchase_recommendation;
grant usage on schema analytics to authenticated;
grant select on analytics.v_safety_stock, analytics.v_purchase_recommendation, analytics.purchase_recommendation to authenticated;
revoke all on analytics.v_safety_stock, analytics.v_purchase_recommendation, analytics.purchase_recommendation from anon;
