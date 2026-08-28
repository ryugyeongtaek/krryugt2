-- STEP 4: 파일 적재 staging, 검증 이력, 승인 import와 batch rollback

create table if not exists core.upload_batch (
  batch_id uuid primary key default gen_random_uuid(),
  file_name text not null,
  import_type text not null,
  import_mode text not null check (import_mode in ('append', 'upsert', 'replace')),
  total_rows integer not null default 0,
  success_rows integer not null default 0,
  warning_rows integer not null default 0,
  error_rows integer not null default 0,
  status text not null default 'STAGED' check (status in ('STAGED', 'VALIDATED', 'IMPORTED', 'ROLLED_BACK', 'FAILED')),
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  imported_at timestamptz,
  replace_confirmed boolean not null default false
);

create table if not exists core.import_staging (
  staging_id bigint generated always as identity primary key,
  batch_id uuid not null references core.upload_batch(batch_id) on delete cascade,
  row_number integer not null,
  mapped_data jsonb not null,
  created_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

create table if not exists core.validation_error (
  validation_error_id bigint generated always as identity primary key,
  batch_id uuid not null references core.upload_batch(batch_id) on delete cascade,
  row_number integer not null,
  field_name text not null,
  error_code text not null,
  error_message text not null,
  severity text not null check (severity in ('WARNING', 'ERROR')),
  original_value text,
  created_at timestamptz not null default now()
);

create table if not exists core.column_mapping (
  mapping_id bigint generated always as identity primary key,
  import_type text not null,
  source_column text not null,
  target_column text not null,
  used_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (import_type, source_column)
);

create table if not exists core.forecast_run (
  run_id uuid primary key default gen_random_uuid(),
  data_snapshot_at timestamptz,
  stale boolean not null default false,
  stale_reason text,
  updated_at timestamptz not null default now()
);

create index if not exists import_staging_batch_idx on core.import_staging(batch_id);
create index if not exists validation_error_batch_idx on core.validation_error(batch_id);
create index if not exists upload_batch_uploaded_at_idx on core.upload_batch(uploaded_at desc);

create or replace function core.stage_import(p_file_name text, p_import_type text, p_import_mode text, p_rows jsonb, p_errors jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, raw, core as $$
declare new_batch uuid; total_count integer; error_count integer; warning_count integer;
begin
  if not core.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_import_type not in ('usage_history','inventory','item_master','supplier_master','purchase_order','goods_receipt','shipment_log','sales_order','business_event','item_substitute') then raise exception 'IMPORT_TYPE_NOT_ALLOWED'; end if;
  if p_import_mode not in ('append','upsert','replace') then raise exception 'IMPORT_MODE_NOT_ALLOWED'; end if;
  new_batch := gen_random_uuid();
  insert into core.upload_batch(batch_id,file_name,import_type,import_mode,uploaded_by) values(new_batch,p_file_name,p_import_type,p_import_mode,auth.uid());
  insert into core.import_staging(batch_id,row_number,mapped_data) select new_batch,(value->>'row_number')::integer,value->'mapped_data' from jsonb_array_elements(p_rows);
  insert into core.validation_error(batch_id,row_number,field_name,error_code,error_message,severity,original_value)
    select new_batch,(value->>'row_number')::integer,value->>'field_name',value->>'error_code',value->>'error_message',value->>'severity',value->>'original_value' from jsonb_array_elements(p_errors);
  select count(*) into total_count from core.import_staging where batch_id=new_batch;
  select count(distinct row_number) filter(where severity='ERROR'), count(distinct row_number) filter(where severity='WARNING') into error_count, warning_count from core.validation_error where batch_id=new_batch;
  update core.upload_batch set total_rows=total_count, success_rows=greatest(total_count-error_count,0), warning_rows=warning_count, error_rows=error_count, status='VALIDATED' where batch_id=new_batch;
  return new_batch;
end $$;

create or replace function core.import_batch(p_batch_id uuid, p_replace_confirmed boolean default false)
returns core.upload_batch
language plpgsql
security definer
set search_path = pg_catalog, public, raw, core
as $$
declare b core.upload_batch; row_data jsonb; target_table text;
begin
  select * into b from core.upload_batch where batch_id = p_batch_id for update;
  if b.batch_id is null then raise exception 'BATCH_NOT_FOUND'; end if;
  if b.status <> 'VALIDATED' then raise exception 'BATCH_NOT_VALIDATED'; end if;
  if b.error_rows > 0 then raise exception 'BATCH_HAS_ERRORS'; end if;
  if b.import_mode = 'replace' and not p_replace_confirmed then raise exception 'REPLACE_CONFIRMATION_REQUIRED'; end if;
  if b.import_mode = 'replace' then
    target_table := b.import_type;
    if target_table not in ('usage_history','inventory','item_master','supplier_master','purchase_order','goods_receipt','shipment_log','sales_order','business_event','item_substitute') then raise exception 'IMPORT_TYPE_NOT_ALLOWED'; end if;
    execute format('delete from raw.%I', target_table);
  end if;
  for row_data in select mapped_data from core.import_staging where batch_id = p_batch_id order by row_number loop
    if b.import_type = 'usage_history' then
      if b.import_mode = 'upsert' then delete from raw.usage_history where usage_id = row_data->>'usage_id'; end if;
      insert into raw.usage_history(usage_id,item_id,use_date,qty,warehouse,note,batch_id,source_type,loaded_at,source_record_id) values (row_data->>'usage_id',row_data->>'item_id',(row_data->>'use_date')::date,(row_data->>'qty')::numeric,row_data->>'warehouse',row_data->>'note',p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'usage_id'));
    elsif b.import_type = 'inventory' then
      if b.import_mode = 'upsert' then delete from raw.inventory where "품목코드"=row_data->>'item_id' and "창고"=row_data->>'warehouse'; end if;
      insert into raw.inventory("품목코드","창고","현재고","기준일자","안전재고",batch_id,source_type,loaded_at,source_record_id) values(row_data->>'item_id',row_data->>'warehouse',row_data->>'current_stock',row_data->>'as_of_date',row_data->>'safety_stock',p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'item_id'));
    elsif b.import_type = 'item_master' then
      if b.import_mode = 'upsert' then delete from raw.item_master where "품목코드"=row_data->>'item_id'; end if;
      insert into raw.item_master("품목코드","품목명","품목구분","단위","표준단가","사용여부",supplier_id,batch_id,source_type,loaded_at,source_record_id) values(row_data->>'item_id',row_data->>'item_name',row_data->>'item_type',row_data->>'unit',row_data->>'standard_price',row_data->>'active',row_data->>'supplier_id',p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'item_id'));
    elsif b.import_type = 'supplier_master' then
      if b.import_mode = 'upsert' then delete from raw.supplier_master where "공급업체코드"=row_data->>'supplier_id'; end if;
      insert into raw.supplier_master("공급업체코드","공급업체명","국가","표준리드타임(일)","담당자","사용여부",batch_id,source_type,loaded_at,source_record_id) values(row_data->>'supplier_id',row_data->>'supplier_name',row_data->>'country',row_data->>'standard_lead_time',row_data->>'manager',row_data->>'active',p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'supplier_id'));
    elsif b.import_type = 'purchase_order' then
      if b.import_mode = 'upsert' then delete from raw.purchase_order where "발주번호"=row_data->>'po_no'; end if;
      insert into raw.purchase_order("발주번호","발주일","공급업체","품목코드","발주수량","단가","납기예정일","발주담당",batch_id,source_type,loaded_at,source_record_id) values(row_data->>'po_no',row_data->>'order_date',row_data->>'supplier',row_data->>'item_id',row_data->>'order_qty',row_data->>'unit_price',row_data->>'due_date',row_data->>'manager',p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'po_no'));
    elsif b.import_type = 'goods_receipt' then
      if b.import_mode = 'upsert' then delete from raw.goods_receipt where "입고번호"=row_data->>'receipt_no'; end if;
      insert into raw.goods_receipt("입고번호","발주번호","품목코드","입고수량","입고일","입고창고",batch_id,source_type,loaded_at,source_record_id) values(row_data->>'receipt_no',row_data->>'po_no',row_data->>'item_id',row_data->>'receipt_qty',row_data->>'receipt_date',row_data->>'warehouse',p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'receipt_no'));
    elsif b.import_type = 'shipment_log' then
      if b.import_mode = 'upsert' then delete from raw.shipment_log where shipment_id=row_data->>'shipment_id'; end if;
      insert into raw.shipment_log(shipment_id,po_no,item_id,supplier_id,order_date,qc_release_date,qty,status,batch_id,source_type,loaded_at,source_record_id) values(row_data->>'shipment_id',row_data->>'po_no',row_data->>'item_id',row_data->>'supplier_id',(row_data->>'order_date')::date,(row_data->>'qc_release_date')::date,(row_data->>'qty')::numeric,row_data->>'status',p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'shipment_id'));
    elsif b.import_type = 'sales_order' then
      if b.import_mode = 'upsert' then delete from raw.sales_order where sales_order_id=(row_data->>'sales_order_id')::uuid; end if;
      insert into raw.sales_order(sales_order_id,order_date,order_no,customer_id,item_id,quantity,status,batch_id,source_type,loaded_at,source_record_id) values(coalesce((row_data->>'sales_order_id')::uuid,gen_random_uuid()),(row_data->>'order_date')::date,row_data->>'order_no',row_data->>'customer_id',row_data->>'item_id',(row_data->>'quantity')::numeric,row_data->>'status',p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'order_no'));
    elsif b.import_type = 'business_event' then
      insert into raw.business_event(event_date,event_type,item_id,quantity,note,batch_id,source_type,loaded_at,source_record_id) values((row_data->>'event_date')::date,row_data->>'event_type',row_data->>'item_id',(row_data->>'quantity')::numeric,row_data->>'note',p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'event_type'));
    elsif b.import_type = 'item_substitute' then
      if b.import_mode = 'upsert' then delete from raw.item_substitute where item_id=row_data->>'item_id' and substitute_item_id=row_data->>'substitute_item_id'; end if;
      insert into raw.item_substitute(item_id,substitute_item_id,priority,valid_from,valid_to,active,batch_id,source_type,loaded_at,source_record_id) values(row_data->>'item_id',row_data->>'substitute_item_id',coalesce((row_data->>'priority')::integer,1),(row_data->>'valid_from')::date,(row_data->>'valid_to')::date,coalesce((row_data->>'active')::boolean,true),p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'item_id'));
    end if;
  end loop;
  if b.import_type in ('usage_history','sales_order','business_event') then update core.forecast_run set stale=true, stale_reason='FILE_UPLOAD', updated_at=now() where stale=false; end if;
  update core.upload_batch set status='IMPORTED', imported_at=now(), replace_confirmed=(p_replace_confirmed or replace_confirmed) where batch_id=p_batch_id returning * into b;
  return b;
end $$;

create or replace function core.rollback_batch(p_batch_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public, raw, core as $$
declare b core.upload_batch; begin
  select * into b from core.upload_batch where batch_id=p_batch_id for update;
  if b.batch_id is null then raise exception 'BATCH_NOT_FOUND'; end if;
  if b.import_mode='replace' then raise exception 'REPLACE_ROLLBACK_NOT_SUPPORTED'; end if;
  execute format('delete from raw.%I where batch_id=$1', b.import_type) using p_batch_id;
  update core.upload_batch set status='ROLLED_BACK' where batch_id=p_batch_id;
  return true;
end $$;

revoke all on core.upload_batch, core.import_staging, core.validation_error, core.column_mapping, core.forecast_run from anon, authenticated;
grant usage on schema core to authenticated;
grant select on core.upload_batch, core.import_staging, core.validation_error, core.column_mapping, core.forecast_run to authenticated;
grant insert, update on core.upload_batch, core.import_staging, core.validation_error, core.column_mapping to authenticated;
grant execute on function core.import_batch(uuid, boolean), core.rollback_batch(uuid) to authenticated;
grant execute on function core.stage_import(text, text, text, jsonb, jsonb) to authenticated;

alter table core.upload_batch enable row level security;
alter table core.import_staging enable row level security;
alter table core.validation_error enable row level security;
alter table core.column_mapping enable row level security;
alter table core.forecast_run enable row level security;

create policy "사용자는 본인 업로드 이력 조회" on core.upload_batch for select to authenticated using (uploaded_by=auth.uid() or core.is_admin());
create policy "사용자는 본인 staging 조회" on core.import_staging for select to authenticated using (exists(select 1 from core.upload_batch b where b.batch_id=import_staging.batch_id and (b.uploaded_by=auth.uid() or core.is_admin())));
create policy "사용자는 본인 오류 조회" on core.validation_error for select to authenticated using (exists(select 1 from core.upload_batch b where b.batch_id=validation_error.batch_id and (b.uploaded_by=auth.uid() or core.is_admin())));
create policy "인증 사용자 매핑 조회" on core.column_mapping for select to authenticated using (auth.uid() is not null);
create policy "관리자 Forecast run 변경" on core.forecast_run for all to authenticated using (core.is_admin()) with check (core.is_admin());
