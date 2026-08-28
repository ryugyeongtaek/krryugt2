-- STEP 4: import/rollback RPC 직접 호출도 ADMIN만 허용합니다.
create or replace function core.import_batch(p_batch_id uuid, p_replace_confirmed boolean default false)
returns core.upload_batch
language plpgsql
security definer
set search_path = pg_catalog, public, raw, core
as $$
declare b core.upload_batch; row_data jsonb; target_table text;
begin
  if not core.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
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
      insert into raw.sales_order(order_date,order_no,customer_id,item_id,quantity,status,batch_id,source_type,loaded_at,source_record_id) values((row_data->>'order_date')::date,row_data->>'order_no',row_data->>'customer_id',row_data->>'item_id',(row_data->>'quantity')::numeric,row_data->>'status',p_batch_id,'FILE_UPLOAD',now(),coalesce(row_data->>'source_record_id',row_data->>'order_no'));
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
  if not core.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into b from core.upload_batch where batch_id=p_batch_id for update;
  if b.batch_id is null then raise exception 'BATCH_NOT_FOUND'; end if;
  if b.import_mode='replace' then raise exception 'REPLACE_ROLLBACK_NOT_SUPPORTED'; end if;
  if b.import_type not in ('usage_history','inventory','item_master','supplier_master','purchase_order','goods_receipt','shipment_log','sales_order','business_event','item_substitute') then raise exception 'IMPORT_TYPE_NOT_ALLOWED'; end if;
  execute format('delete from raw.%I where batch_id=$1', b.import_type) using p_batch_id;
  update core.upload_batch set status='ROLLED_BACK' where batch_id=p_batch_id;
  return true;
end $$;
