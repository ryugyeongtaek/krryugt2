-- STEP 3: 적재 추적, 운영 정책, Forecast 기간과 학습/검증 격리

create schema if not exists raw;
create schema if not exists core;
create schema if not exists analytics;

-- 기존 raw 입력 테이블은 보존하고 공통 적재 추적 정보만 nullable 로 확장합니다.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['shipment_log', 'usage_history', 'inventory', 'item_master', 'supplier_master', 'purchase_order', 'goods_receipt', 'forecast'] loop
    execute format('alter table raw.%I add column if not exists batch_id uuid', table_name);
    execute format('alter table raw.%I add column if not exists source_type text', table_name);
    execute format('alter table raw.%I add column if not exists loaded_at timestamptz default now()', table_name);
    execute format('alter table raw.%I add column if not exists source_record_id text', table_name);
  end loop;
end $$;

create table if not exists raw.business_event (
  business_event_id uuid primary key default gen_random_uuid(),
  event_date date not null,
  event_type text not null,
  item_id text,
  quantity numeric,
  note text,
  batch_id uuid,
  source_type text,
  loaded_at timestamptz not null default now(),
  source_record_id text
);

create table if not exists raw.sales_order (
  sales_order_id uuid primary key default gen_random_uuid(),
  order_date date not null,
  order_no text,
  customer_id text,
  item_id text not null,
  quantity numeric not null,
  status text,
  batch_id uuid,
  source_type text,
  loaded_at timestamptz not null default now(),
  source_record_id text
);

create table if not exists raw.item_substitute (
  item_substitute_id uuid primary key default gen_random_uuid(),
  item_id text not null,
  substitute_item_id text not null,
  priority integer not null default 1,
  valid_from date,
  valid_to date,
  active boolean not null default true,
  batch_id uuid,
  source_type text,
  loaded_at timestamptz not null default now(),
  source_record_id text,
  unique (item_id, substitute_item_id)
);

create table if not exists core.policy_config (
  config_key text primary key,
  service_level numeric(5,4),
  review_period_days integer,
  safety_buffer_days numeric(8,2),
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (service_level is null or service_level between 0 and 1),
  check (review_period_days is null or review_period_days >= 0),
  check (safety_buffer_days is null or safety_buffer_days >= 0)
);

create table if not exists core.outlier_rule (
  rule_code text primary key,
  rule_type text not null check (rule_type in ('PROJECT', 'RETURN', 'DUPLICATE', 'OTHER')),
  description text not null,
  condition jsonb not null default '{}'::jsonb,
  exclude_from_training boolean not null default true,
  active boolean not null default true,
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists core.item_policy (
  item_id text primary key,
  moq numeric(14,2),
  pack_size numeric(14,2),
  item_grade text,
  service_level numeric(5,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (moq is null or moq >= 0),
  check (pack_size is null or pack_size > 0),
  check (service_level is null or service_level between 0 and 1)
);

create table if not exists core.forecast_setting (
  setting_id text primary key default 'default',
  train_start date,
  train_end date,
  test_start date,
  test_end date,
  granularity text not null default 'day' check (granularity in ('day', 'week', 'month')),
  updated_at timestamptz not null default now(),
  check (train_start is null or train_end is null or train_start <= train_end),
  check (test_start is null or test_end is null or test_start <= test_end)
);

insert into core.forecast_setting (setting_id)
values ('default')
on conflict (setting_id) do nothing;

insert into core.outlier_rule (rule_code, rule_type, description, condition)
values
  ('PROJECT_NOTE', 'PROJECT', '프로젝트성 수요 메모 제외', '{"note_contains":"프로젝트"}'::jsonb),
  ('RETURN_QTY', 'RETURN', '음수 사용량 반품 제외', '{"qty_lt":0}'::jsonb)
on conflict (rule_code) do nothing;

create index if not exists raw_usage_history_batch_idx on raw.usage_history(batch_id);
create index if not exists raw_usage_history_date_idx on raw.usage_history(use_date);
create index if not exists raw_business_event_batch_idx on raw.business_event(batch_id);
create index if not exists raw_sales_order_batch_idx on raw.sales_order(batch_id);
create index if not exists raw_item_substitute_item_idx on raw.item_substitute(item_id);

create or replace view core.v_train_demand as
select
  u.usage_id,
  upper(regexp_replace(u.item_id, '[\s\-_]', '', 'g')) as item_id,
  u.use_date,
  u.qty,
  u.warehouse,
  u.note,
  u.batch_id,
  u.source_type,
  u.loaded_at,
  u.source_record_id,
  not exists (
    select 1 from core.outlier_rule r
    where r.active and r.exclude_from_training
      and ((r.rule_type = 'PROJECT' and coalesce(u.note, '') ilike '%' || coalesce(r.condition->>'note_contains', '§never§') || '%')
        or (r.rule_type = 'RETURN' and u.qty < coalesce((r.condition->>'qty_lt')::numeric, 0)))
  ) as is_training_eligible
from raw.usage_history u
cross join core.forecast_setting s
where s.setting_id = 'default'
  and s.train_start is not null and s.train_end is not null
  and u.use_date between s.train_start and s.train_end
  and (s.test_start is null or s.test_end is null or u.use_date not between s.test_start and s.test_end);

create or replace view core.v_test_actual as
select
  u.usage_id,
  upper(regexp_replace(u.item_id, '[\s\-_]', '', 'g')) as item_id,
  u.use_date,
  u.qty,
  u.warehouse,
  u.note,
  u.batch_id,
  u.source_type,
  u.loaded_at,
  u.source_record_id
from raw.usage_history u
cross join core.forecast_setting s
where s.setting_id = 'default'
  and s.test_start is not null and s.test_end is not null
  and u.use_date between s.test_start and s.test_end;

create or replace view core.v_usage_effective as
with calc as (
  select item_id, count(*) as valid_days, round(avg(qty), 2) as daily_usage_avg,
         round(stddev_samp(qty), 2) as daily_usage_sd
  from core.v_train_demand
  where is_training_eligible and qty >= 0
  group by item_id
)
select c.item_id,
  coalesce(p.valid_days::bigint, c.valid_days) as valid_days,
  coalesce(p.daily_usage_avg, c.daily_usage_avg) as daily_usage_avg,
  coalesce(p.daily_usage_sd, c.daily_usage_sd) as daily_usage_sd,
  round(coalesce(p.daily_usage_avg, c.daily_usage_avg), 2) as usage_used,
  round(coalesce(p.daily_usage_sd, c.daily_usage_sd) / nullif(coalesce(p.daily_usage_avg, c.daily_usage_avg), 0), 2) as cv,
  case when p.item_id is not null then '확정값' else '학습 기간 정제 기준' end as source
from calc c left join core.usage_profile p on p.item_id = c.item_id;

create or replace view analytics.v_data_coverage as
select
  min(u.use_date) as data_start,
  max(u.use_date) as data_end,
  s.train_start,
  s.train_end,
  s.test_start,
  s.test_end,
  s.granularity,
  count(*) filter (where s.train_start is not null and u.use_date between s.train_start and s.train_end
    and (s.test_start is null or s.test_end is null or u.use_date not between s.test_start and s.test_end)) as train_row_count,
  count(*) filter (where s.test_start is not null and u.use_date between s.test_start and s.test_end) as test_row_count,
  (s.train_start is not null and s.train_end is not null and min(u.use_date) <= s.train_start and max(u.use_date) >= s.train_end) as train_window_ok,
  (s.test_start is not null and s.test_end is not null and min(u.use_date) <= s.test_start and max(u.use_date) >= s.test_end) as test_window_ok
from raw.usage_history u
cross join core.forecast_setting s
where s.setting_id = 'default'
group by s.train_start, s.train_end, s.test_start, s.test_end, s.granularity;

-- raw는 앱에 노출하지 않고, 설정/뷰는 인증 사용자에게 읽기만 허용합니다.
revoke all on all tables in schema raw from anon, authenticated;
revoke all on all tables in schema core from anon;
revoke all on all tables in schema analytics from anon;
grant usage on schema core, analytics to authenticated;
grant select on core.policy_config, core.outlier_rule, core.item_policy, core.forecast_setting to authenticated;
grant select on core.v_train_demand, core.v_test_actual, core.v_usage_effective to authenticated;
grant select on analytics.v_data_coverage to authenticated;
grant insert, update, delete on core.policy_config, core.outlier_rule, core.item_policy, core.forecast_setting to authenticated;

alter table core.policy_config enable row level security;
alter table core.outlier_rule enable row level security;
alter table core.item_policy enable row level security;
alter table core.forecast_setting enable row level security;

drop policy if exists "인증 사용자 정책 조회" on core.policy_config;
create policy "인증 사용자 정책 조회" on core.policy_config for select to authenticated using (auth.uid() is not null);
drop policy if exists "관리자 정책 변경" on core.policy_config;
create policy "관리자 정책 변경" on core.policy_config for all to authenticated using (core.is_admin()) with check (core.is_admin());

drop policy if exists "인증 사용자 이상치 규칙 조회" on core.outlier_rule;
create policy "인증 사용자 이상치 규칙 조회" on core.outlier_rule for select to authenticated using (auth.uid() is not null);
drop policy if exists "관리자 이상치 규칙 변경" on core.outlier_rule;
create policy "관리자 이상치 규칙 변경" on core.outlier_rule for all to authenticated using (core.is_admin()) with check (core.is_admin());

drop policy if exists "인증 사용자 품목 정책 조회" on core.item_policy;
create policy "인증 사용자 품목 정책 조회" on core.item_policy for select to authenticated using (auth.uid() is not null);
drop policy if exists "관리자 품목 정책 변경" on core.item_policy;
create policy "관리자 품목 정책 변경" on core.item_policy for all to authenticated using (core.is_admin()) with check (core.is_admin());

drop policy if exists "인증 사용자 Forecast 설정 조회" on core.forecast_setting;
create policy "인증 사용자 Forecast 설정 조회" on core.forecast_setting for select to authenticated using (auth.uid() is not null);
drop policy if exists "관리자 Forecast 설정 변경" on core.forecast_setting;
create policy "관리자 Forecast 설정 변경" on core.forecast_setting for all to authenticated using (core.is_admin()) with check (core.is_admin());
