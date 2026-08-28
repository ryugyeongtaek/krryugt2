import { importSchemas } from './schema';
import type { ImportType } from './types';

export function validateRows(type: ImportType, rows: Array<{ rowNumber: number; values: Record<string, unknown> }>, context: { itemIds?: Set<string>; supplierIds?: Set<string> } = {}) {
  const fields = importSchemas[type];
  const issues = [] as Array<{ rowNumber: number; fieldName: string; errorCode: string; errorMessage: string; severity: 'WARNING' | 'ERROR'; originalValue: unknown }>;
  const seen = new Map<string, number>();
  for (const row of rows) {
    const normalized = Object.fromEntries(Object.entries(row.values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
    const duplicateKey = JSON.stringify(fields.map((field) => normalized[field.name] ?? null));
    if (seen.has(duplicateKey)) issues.push({ rowNumber: row.rowNumber, fieldName: '_row', errorCode: 'DUPLICATE_ROW', errorMessage: `행 ${seen.get(duplicateKey)}와 중복됩니다.`, severity: 'ERROR', originalValue: duplicateKey });
    seen.set(duplicateKey, row.rowNumber);
    for (const field of fields) {
      const value = normalized[field.name];
      if (field.required && (value === null || value === undefined || value === '')) issues.push({ rowNumber: row.rowNumber, fieldName: field.name, errorCode: 'REQUIRED_VALUE_MISSING', errorMessage: '필수값이 없습니다.', severity: 'ERROR', originalValue: value });
      if (value !== null && value !== undefined && value !== '') {
        if (field.kind === 'number' && (typeof value !== 'number' && Number.isNaN(Number(value)))) issues.push({ rowNumber: row.rowNumber, fieldName: field.name, errorCode: 'INVALID_NUMBER', errorMessage: '숫자 형식이 아닙니다.', severity: 'ERROR', originalValue: value });
        if (field.kind === 'date' && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))) issues.push({ rowNumber: row.rowNumber, fieldName: field.name, errorCode: 'INVALID_DATE', errorMessage: 'YYYY-MM-DD 날짜 형식이 아닙니다.', severity: 'ERROR', originalValue: value });
      }
    }
    const itemId = String(normalized.item_id ?? '');
    if (context.itemIds && itemId && !context.itemIds.has(itemId.toUpperCase().replace(/[\s\-_]/g, ''))) issues.push({ rowNumber: row.rowNumber, fieldName: 'item_id', errorCode: 'ITEM_NOT_FOUND', errorMessage: '품목 마스터에 없는 품목코드입니다.', severity: 'ERROR', originalValue: itemId });
    const supplierId = String(normalized.supplier_id ?? '');
    if (context.supplierIds && supplierId && !context.supplierIds.has(supplierId)) issues.push({ rowNumber: row.rowNumber, fieldName: 'supplier_id', errorCode: 'SUPPLIER_NOT_FOUND', errorMessage: '공급처 마스터에 없는 공급처입니다.', severity: 'ERROR', originalValue: supplierId });
    if (type === 'usage_history' && Number(normalized.qty) < 0) issues.push({ rowNumber: row.rowNumber, fieldName: 'qty', errorCode: 'NEGATIVE_USAGE', errorMessage: '음수 사용량은 반품 정책 확인이 필요합니다.', severity: 'WARNING', originalValue: normalized.qty });
    if (type === 'goods_receipt' && normalized.receipt_date && normalized.order_date && String(normalized.receipt_date) < String(normalized.order_date)) issues.push({ rowNumber: row.rowNumber, fieldName: 'receipt_date', errorCode: 'DATE_LOGIC_ERROR', errorMessage: '입고일이 발주일보다 빠릅니다.', severity: 'ERROR', originalValue: normalized.receipt_date });
  }
  return issues;
}
