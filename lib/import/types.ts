export type ImportType = 'usage_history' | 'inventory' | 'item_master' | 'supplier_master' | 'purchase_order' | 'goods_receipt' | 'shipment_log' | 'sales_order' | 'business_event' | 'item_substitute';
export type ImportMode = 'append' | 'upsert' | 'replace';
export type ValidationSeverity = 'SUCCESS' | 'WARNING' | 'ERROR';

export type ParsedRow = { rowNumber: number; values: Record<string, unknown> };
export type ColumnMapping = { sourceColumn: string; targetColumn: string | null };
export type ValidationIssue = { rowNumber: number; fieldName: string; errorCode: string; errorMessage: string; severity: Exclude<ValidationSeverity, 'SUCCESS'>; originalValue: unknown };

export type ImportResult = { batchId: string; totalRows: number; successRows: number; warningRows: number; errorRows: number; status: 'VALIDATED' | 'IMPORTED' | 'FAILED' };
