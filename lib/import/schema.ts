import type { ImportType } from './types';

export type ImportField = { name: string; required?: boolean; kind: 'text' | 'number' | 'date' };
export const importSchemas: Record<ImportType, ImportField[]> = {
  usage_history: [{ name: 'usage_id', required: true, kind: 'text' }, { name: 'item_id', required: true, kind: 'text' }, { name: 'use_date', required: true, kind: 'date' }, { name: 'qty', required: true, kind: 'number' }, { name: 'warehouse', kind: 'text' }, { name: 'note', kind: 'text' }],
  inventory: [{ name: 'item_id', required: true, kind: 'text' }, { name: 'warehouse', required: true, kind: 'text' }, { name: 'current_stock', required: true, kind: 'number' }, { name: 'as_of_date', kind: 'date' }, { name: 'safety_stock', kind: 'number' }],
  item_master: [{ name: 'item_id', required: true, kind: 'text' }, { name: 'item_name', required: true, kind: 'text' }, { name: 'item_type', kind: 'text' }, { name: 'unit', kind: 'text' }, { name: 'standard_price', kind: 'number' }, { name: 'active', kind: 'text' }, { name: 'supplier_id', kind: 'text' }],
  supplier_master: [{ name: 'supplier_id', required: true, kind: 'text' }, { name: 'supplier_name', required: true, kind: 'text' }, { name: 'country', kind: 'text' }, { name: 'standard_lead_time', kind: 'number' }, { name: 'manager', kind: 'text' }, { name: 'active', kind: 'text' }],
  purchase_order: [{ name: 'po_no', required: true, kind: 'text' }, { name: 'order_date', required: true, kind: 'date' }, { name: 'supplier', kind: 'text' }, { name: 'item_id', required: true, kind: 'text' }, { name: 'order_qty', required: true, kind: 'number' }, { name: 'unit_price', kind: 'number' }, { name: 'due_date', kind: 'date' }, { name: 'manager', kind: 'text' }],
  goods_receipt: [{ name: 'receipt_no', required: true, kind: 'text' }, { name: 'po_no', kind: 'text' }, { name: 'item_id', required: true, kind: 'text' }, { name: 'receipt_qty', required: true, kind: 'number' }, { name: 'receipt_date', required: true, kind: 'date' }, { name: 'warehouse', kind: 'text' }],
  shipment_log: [{ name: 'shipment_id', required: true, kind: 'text' }, { name: 'po_no', kind: 'text' }, { name: 'item_id', required: true, kind: 'text' }, { name: 'supplier_id', kind: 'text' }, { name: 'order_date', kind: 'date' }, { name: 'qc_release_date', kind: 'date' }, { name: 'qty', kind: 'number' }, { name: 'status', kind: 'text' }],
  sales_order: [{ name: 'order_no', required: true, kind: 'text' }, { name: 'order_date', required: true, kind: 'date' }, { name: 'customer_id', kind: 'text' }, { name: 'item_id', required: true, kind: 'text' }, { name: 'quantity', required: true, kind: 'number' }, { name: 'status', kind: 'text' }],
  business_event: [{ name: 'event_date', required: true, kind: 'date' }, { name: 'event_type', required: true, kind: 'text' }, { name: 'item_id', kind: 'text' }, { name: 'quantity', kind: 'number' }, { name: 'note', kind: 'text' }],
  item_substitute: [{ name: 'item_id', required: true, kind: 'text' }, { name: 'substitute_item_id', required: true, kind: 'text' }, { name: 'priority', kind: 'number' }, { name: 'valid_from', kind: 'date' }, { name: 'valid_to', kind: 'date' }, { name: 'active', kind: 'text' }],
};

const aliases: Record<string, string[]> = {
  item_id: ['item_id', '품목코드', '품목번호', '자재코드'], use_date: ['use_date', '사용일', '사용일자', '출고일'], qty: ['qty', '수량', '출고수량', '사용수량'], supplier_id: ['supplier_id', '공급업체코드', '공급처코드'], supplier: ['supplier', '공급업체', '공급처'], order_date: ['order_date', '발주일', '주문일'], receipt_date: ['receipt_date', '입고일'], current_stock: ['current_stock', '현재고'], warehouse: ['warehouse', '창고', '입고창고'], note: ['note', '비고', '메모'],
};
export function suggestMapping(columns: string[], type: ImportType, savedMappings: Record<string, string> = {}) {
  const fields = importSchemas[type];
  return columns.map((sourceColumn) => ({ sourceColumn, targetColumn: savedMappings[sourceColumn] ?? fields.find((field) => (aliases[field.name] ?? [field.name]).some((alias) => alias.toLowerCase() === sourceColumn.trim().toLowerCase()))?.name ?? null }));
}
