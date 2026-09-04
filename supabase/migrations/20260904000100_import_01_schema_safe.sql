-- 01-schema.sql 안전 적용본
-- 기존 raw/core/analytics 객체와 데이터를 삭제하지 않고 신규 legacy raw 객체만 보강합니다.

create schema if not exists raw;
create schema if not exists core;
create schema if not exists analytics;

create table if not exists raw.dim_item (
    item_code text primary key,
    hoc_code text,
    description text,
    family text,
    item_type text,
    source_types text
);

create table if not exists raw.dim_model (
    model_key text primary key,
    model_base text,
    biz text,
    iot_code text,
    sources text
);

create table if not exists raw.fact_shipment (
    item_code text not null,
    ym char(7) not null,
    qty numeric(18,4) not null,
    item_type text not null,
    source_file text not null
);

create table if not exists raw.fact_mc_plan_actual (
    fy_sheet text,
    model_key text not null,
    model_base text,
    biz text,
    iot_code text,
    ym char(7) not null,
    sales_ol numeric(18,4),
    scm_ol numeric(18,4),
    act numeric(18,4)
);

create table if not exists raw.bridge_bom (
    model_key text,
    model_base text,
    bom_group text,
    item_code text,
    qty numeric(18,4),
    active text,
    start_date text,
    end_date text,
    source_file text
);

create table if not exists raw.bridge_scc_config (
    model_key text,
    model_base text,
    neutral_item_code text,
    neutral_desc text,
    scc_item_code text,
    scc_desc text,
    qty numeric(18,4)
);

create table if not exists raw.bridge_mc_cap (
    model_key text,
    model_base text,
    predecessor_model text,
    cap_item_code text,
    cap_item_name text,
    neutral_item_code text,
    remark text
);

create table if not exists raw.bridge_cap_option (
    model_key text,
    cap_item_code text,
    option_item_code text,
    option_desc text,
    role text
);

create table if not exists raw.bridge_option_model (
    item_code text,
    model_key text,
    model_base text,
    link_type text,
    cat text,
    common text,
    detail text
);

create table if not exists raw.bridge_xcn (
    family text,
    related_item text,
    related_desc text,
    hoc_item text,
    hoc_desc text
);

create index if not exists ix_ship_item on raw.fact_shipment (item_code);
create index if not exists ix_ship_ym on raw.fact_shipment (ym);
create index if not exists ix_ship_type_ym on raw.fact_shipment (item_type, ym);
create index if not exists ix_mc_model on raw.fact_mc_plan_actual (model_base, ym);
create index if not exists ix_mc_fy on raw.fact_mc_plan_actual (fy_sheet);
create index if not exists ix_bom_model on raw.bridge_bom (model_base);
create index if not exists ix_bom_item on raw.bridge_bom (item_code);
create index if not exists ix_scc_neutral on raw.bridge_scc_config (neutral_item_code);
create index if not exists ix_scc_model on raw.bridge_scc_config (model_base);
create index if not exists ix_cap_model on raw.bridge_mc_cap (model_base);
create index if not exists ix_capopt_cap on raw.bridge_cap_option (cap_item_code);
create index if not exists ix_optmodel on raw.bridge_option_model (item_code, model_base);
create index if not exists ix_xcn_rel on raw.bridge_xcn (related_item);
create index if not exists ix_xcn_hoc on raw.bridge_xcn (hoc_item);
create index if not exists ix_item_type on raw.dim_item (item_type);
create index if not exists ix_item_hoc on raw.dim_item (hoc_code);

alter table raw.dim_item enable row level security;
alter table raw.dim_model enable row level security;
alter table raw.fact_shipment enable row level security;
alter table raw.fact_mc_plan_actual enable row level security;
alter table raw.bridge_bom enable row level security;
alter table raw.bridge_scc_config enable row level security;
alter table raw.bridge_mc_cap enable row level security;
alter table raw.bridge_cap_option enable row level security;
alter table raw.bridge_option_model enable row level security;
alter table raw.bridge_xcn enable row level security;

comment on table raw.dim_item is '품목 통합 마스터. 원본 보존용';
comment on table raw.dim_model is '기종 통합 마스터. 원본 보존용';
comment on table raw.fact_shipment is '월별 출고 실적. 원본 보존용';
comment on table raw.fact_mc_plan_actual is '기계 OL 대비 실적. 원본 보존용';

select table_name
from information_schema.tables
where table_schema = 'raw'
  and table_name in ('dim_item','dim_model','fact_shipment','fact_mc_plan_actual','bridge_bom','bridge_scc_config','bridge_mc_cap','bridge_cap_option','bridge_option_model','bridge_xcn')
order by table_name;
