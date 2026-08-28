-- STEP 5: 학습 구간 전용 SKU Demand Profile

alter table core.forecast_setting
  add column if not exists recent_periods integer not null default 3;

alter table core.forecast_setting
  drop constraint if exists forecast_setting_recent_periods_check;

alter table core.forecast_setting
  add constraint forecast_setting_recent_periods_check check (recent_periods between 1 and 12);

create or replace view analytics.v_sku_demand_profile as
with settings as (
  select
    date_trunc('month', train_start)::date as train_start_month,
    date_trunc('month', train_end)::date as train_end_month,
    recent_periods
  from core.forecast_setting
  where setting_id = 'default'
    and train_start is not null
    and train_end is not null
),
periods as (
  select
    p.period_start::date as period_start,
    row_number() over (order by p.period_start)::integer as period_index
  from settings s
  cross join lateral generate_series(s.train_start_month, s.train_end_month, interval '1 month') p(period_start)
),
train_items as (
  select distinct item_id
  from core.v_train_demand
  where is_training_eligible
),
master_items as (
  select distinct
    upper(regexp_replace(nullif(trim("품목코드"), ''), '[\s\-_]', '', 'g')) as item_id,
    nullif(trim("품목명"), '') as item_name
  from raw.item_master
  where nullif(trim("품목코드"), '') is not null
),
items as (
  select item_id, max(item_name) as item_name
  from (
    select item_id, item_name from master_items where item_id is not null
    union all
    select t.item_id, null::text as item_name from train_items t
  ) i
  group by item_id
),
observed as (
  select
    d.item_id,
    date_trunc('month', d.use_date)::date as period_start,
    sum(d.qty) filter (where d.qty is not null)::numeric as quantity,
    count(*) filter (where d.qty is not null)::integer as observation_count,
    count(*) filter (where d.qty is null)::integer as null_observation_count
  from core.v_train_demand d
  where d.is_training_eligible
  group by d.item_id, date_trunc('month', d.use_date)::date
),
grid as (
  select
    i.item_id,
    i.item_name,
    p.period_start,
    p.period_index,
    case when o.observation_count is null then 0::numeric else o.quantity end as quantity,
    (o.observation_count is null) as is_gap_period,
    coalesce(o.null_observation_count, 0) > 0 as has_null_source_qty
  from items i
  cross join periods p
  left join observed o on o.item_id = i.item_id and o.period_start = p.period_start
),
stats_base as (
  select
    g.item_id,
    max(g.item_name) as item_name,
    count(*)::integer as n_periods,
    count(*) filter (where g.quantity > 0)::integer as n_nonzero_periods,
    count(*) filter (where g.quantity is null)::integer as n_null_periods,
    sum(case when g.quantity = 0 then 1 else 0 end)::numeric / nullif(count(*), 0) as zero_demand_rate,
    avg(g.quantity) filter (where g.quantity > 0) as positive_mean,
    stddev_samp(g.quantity) filter (where g.quantity > 0) as positive_sd,
    regr_slope(g.quantity, g.period_index::numeric) as trend,
    bool_or(g.has_null_source_qty) as has_null_source_qty,
    max(s.recent_periods) as recent_periods
  from grid g
  cross join settings s
  group by g.item_id
),
peak as (
  select distinct on (item_id)
    item_id,
    quantity as peak_quantity,
    period_start as peak_period
  from grid
  order by item_id, quantity desc nulls last, period_start asc
),
recent as (
  select
    g.item_id,
    avg(g.quantity) filter (where g.period_index > s.n_periods - s.recent_periods) as recent_mean,
    avg(g.quantity) filter (where g.period_index > s.n_periods - (s.recent_periods * 2) and g.period_index <= s.n_periods - s.recent_periods) as previous_mean
  from grid g
  join (select count(*)::integer as n_periods, max(recent_periods)::integer as recent_periods from periods cross join settings) s on true
  group by g.item_id
),
monthly as (
  select
    g.item_id,
    extract(month from g.period_start)::integer as month_number,
    avg(g.quantity) as month_avg
  from grid g
  group by g.item_id, extract(month from g.period_start)::integer
),
seasonality as (
  select
    m.item_id,
    case
      when s.n_periods < 24 then null::text
      when avg(m.month_avg) = 0 then null::text
      when max(m.month_avg) > min(m.month_avg) * 1.2 then 'SEASONAL'
      else 'NON_SEASONAL'
    end as seasonality
  from monthly m
  join stats_base s on s.item_id = m.item_id
  group by m.item_id, s.n_periods
),
classified as (
  select
    s.*,
    p.peak_quantity,
    p.peak_period,
    s.positive_sd / nullif(s.positive_mean, 0) as cv,
    case
      when s.n_nonzero_periods = 0 then null::text
      when s.positive_mean is null or s.n_nonzero_periods < 2 then null::text
      when (s.n_periods::numeric / s.n_nonzero_periods) < 1.32
        and power(s.positive_sd / nullif(s.positive_mean, 0), 2) < 0.49 then 'SMOOTH'
      when (s.n_periods::numeric / s.n_nonzero_periods) >= 1.32
        and power(s.positive_sd / nullif(s.positive_mean, 0), 2) < 0.49 then 'INTERMITTENT'
      when (s.n_periods::numeric / s.n_nonzero_periods) < 1.32
        and power(s.positive_sd / nullif(s.positive_mean, 0), 2) >= 0.49 then 'ERRATIC'
      when (s.n_periods::numeric / s.n_nonzero_periods) >= 1.32
        and power(s.positive_sd / nullif(s.positive_mean, 0), 2) >= 0.49 then 'LUMPY'
      else null::text
    end as demand_type,
    case
      when s.n_nonzero_periods = 0 then 'NO_DEMAND_PERIOD'
      when s.n_nonzero_periods < 2 or s.positive_mean is null then 'INSUFFICIENT_NONZERO_SAMPLES'
      when s.has_null_source_qty then 'NULL_SOURCE_QTY'
      else null::text
    end as profile_reason_code
  from stats_base s
  join peak p on p.item_id = s.item_id
)
select
  c.item_id,
  c.item_name,
  c.n_periods,
  c.n_nonzero_periods,
  case when c.n_nonzero_periods > 0 then c.n_periods::numeric / c.n_nonzero_periods else null end as adi,
  c.cv,
  power(c.cv, 2) as cv_squared,
  c.zero_demand_rate,
  case when c.n_periods >= 2 then c.trend else null end as trend,
  case
    when r.previous_mean is null or r.previous_mean = 0 then null
    else (r.recent_mean - r.previous_mean) / r.previous_mean
  end as recent_change_rate,
  c.peak_period,
  c.demand_type,
  se.seasonality,
  case
    when c.profile_reason_code is not null then c.profile_reason_code
    when c.n_periods < 24 then 'INSUFFICIENT_PERIODS'
    else null
  end as reason_code,
  case
    when c.profile_reason_code is not null then 'UNAVAILABLE'
    when c.demand_type in ('ERRATIC', 'LUMPY') then 'VARIABLE'
    else 'STABLE'
  end as stability
from classified c
left join recent r on r.item_id = c.item_id
left join seasonality se on se.item_id = c.item_id;

create or replace view analytics.v_demand_profile_kpi as
select
  count(*)::integer as total_items,
  count(*) filter (where demand_type = 'SMOOTH')::integer as n_smooth,
  count(*) filter (where demand_type = 'INTERMITTENT')::integer as n_intermittent,
  count(*) filter (where demand_type = 'ERRATIC')::integer as n_erratic,
  count(*) filter (where demand_type = 'LUMPY')::integer as n_lumpy,
  count(*) filter (where demand_type in ('INTERMITTENT', 'LUMPY'))::integer as n_croston_needed,
  count(*) filter (where demand_type is null)::integer as n_calculation_unavailable
from analytics.v_sku_demand_profile;

revoke all on analytics.v_sku_demand_profile, analytics.v_demand_profile_kpi from anon;
grant select on analytics.v_sku_demand_profile, analytics.v_demand_profile_kpi to authenticated;
