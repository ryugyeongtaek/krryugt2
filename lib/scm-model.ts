export type LeadtimeGap = {
  supplier: string;
  country: string;
  masterLeadTime: number | null;
  sampleCount: number;
  actualAverage: number | null;
  p80: number | null;
  gap: number | null;
};

export type StockoutRiskStatus = 'SAFE' | 'CRITICAL' | 'UNKNOWN';
export type StockoutRiskReason = 'NO_USAGE' | 'NO_LEADTIME' | null;

export type StockoutRisk = {
  itemId: string;
  itemName: string;
  supplier: string;
  currentStock: number | null;
  inboundQty: number | null;
  availableQty: number | null;
  dailyUsageAvg: number | null;
  plannedLeadTime: number | null;
  stockoutDays: number | null;
  stockoutDate: string | null;
  riskStatus: StockoutRiskStatus;
  reason: StockoutRiskReason;
};

function value(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return null;
}

function numberValue(row: Record<string, unknown>, keys: string[]) {
  const raw = value(row, keys);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLeadtimeGap(row: Record<string, unknown>): LeadtimeGap {
  return {
    supplier: String(value(row, ['supplier_name', 'supplier', '법인', '공급처', '공급업체명']) ?? '미정'),
    country: String(value(row, ['country', '국가']) ?? '미정'),
    masterLeadTime: numberValue(row, ['std_lead_time', 'master_lt', 'master_lead_time', 'planned_lead_time', '표준리드타임', '표준리드타임(일)', '마스터값']),
    sampleCount: numberValue(row, ['n_samples', 'sample_count', 'samples', '표본수']) ?? 0,
    actualAverage: numberValue(row, ['mean_days', 'actual_avg', 'actual_average', 'avg_lead_time', '실적평균']),
    p80: numberValue(row, ['p80_days', 'p80', 'P80']),
    gap: numberValue(row, ['gap_days', 'gap', 'leadtime_gap', '격차']),
  };
}

function stringValue(row: Record<string, unknown>, keys: string[]) {
  const raw = value(row, keys);
  return raw === null ? null : String(raw);
}

function normalizeRiskStatus(raw: unknown): StockoutRiskStatus {
  const status = String(raw ?? '').toUpperCase();
  return status === 'SAFE' || status === 'CRITICAL' ? status : 'UNKNOWN';
}

function normalizeStockoutReason(raw: unknown): StockoutRiskReason {
  const reason = String(raw ?? '').toUpperCase();
  return reason === 'NO_USAGE' || reason === 'NO_LEADTIME' ? reason : null;
}

export function normalizeStockoutRisk(row: Record<string, unknown>): StockoutRisk {
  return {
    itemId: stringValue(row, ['item_id', 'item', '품목코드']) ?? '미정',
    itemName: stringValue(row, ['item_name', '품목명']) ?? '미정',
    supplier: stringValue(row, ['supplier_name', 'supplier', '법인', '공급처', '공급업체명']) ?? '미정',
    currentStock: numberValue(row, ['current_stock', 'stock_on_hand', '현재고']),
    inboundQty: numberValue(row, ['inbound_qty', 'inbound', '입고예정']),
    availableQty: numberValue(row, ['available_qty', 'available', '가용수량']),
    dailyUsageAvg: numberValue(row, ['daily_usage_avg', 'daily_avg_usage', '일평균사용량']),
    plannedLeadTime: numberValue(row, ['planned_lead_time', 'lead_time', '계획리드타임']),
    stockoutDays: numberValue(row, ['stockout_days', '소진일수']),
    stockoutDate: stringValue(row, ['stockout_date', '예상소진일']),
    riskStatus: normalizeRiskStatus(value(row, ['risk_status', 'status', '위험상태'])),
    reason: normalizeStockoutReason(value(row, ['reason', '사유'])),
  };
}
