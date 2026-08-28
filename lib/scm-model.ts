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

export type DemandType = 'SMOOTH' | 'INTERMITTENT' | 'ERRATIC' | 'LUMPY';
export type DemandProfile = {
  itemId: string;
  itemName: string | null;
  nPeriods: number | null;
  nNonzeroPeriods: number | null;
  adi: number | null;
  cv: number | null;
  cvSquared: number | null;
  zeroDemandRate: number | null;
  trend: number | null;
  recentChangeRate: number | null;
  peakPeriod: string | null;
  demandType: DemandType | null;
  seasonality: string | null;
  reasonCode: string | null;
  stability: string | null;
};

export type DemandProfileKpi = {
  totalItems: number;
  nSmooth: number;
  nIntermittent: number;
  nErratic: number;
  nLumpy: number;
  nCrostonNeeded: number;
  nCalculationUnavailable: number;
};

export type ForecastResult = {
  runId: string;
  modelId: string;
  modelVersion: string;
  itemId: string;
  period: string;
  predictedQty: number | null;
  p50: number | null;
  p80: number | null;
  p90: number | null;
  sigma: number | null;
  basis: string;
  reasonCode: string | null;
};

export type ForecastRun = {
  runId: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  granularity: string | null;
  trainStart: string | null;
  trainEnd: string | null;
  horizon: number | null;
  dataSnapshotAt: string | null;
  stale: boolean;
  nModels: number;
  nItems: number;
  nRows: number;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  triggeredEmail: string | null;
  message: string | null;
};

export type ModelConfig = {
  modelId: string;
  modelName: string;
  family: string;
  engine: string;
  version: string;
  enabled: boolean;
  isDefault: boolean;
  applicableDemandType: string[];
  parameters: Record<string, unknown>;
  description: string | null;
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

function normalizeDemandType(raw: unknown): DemandType | null {
  const type = String(raw ?? '').toUpperCase();
  return type === 'SMOOTH' || type === 'INTERMITTENT' || type === 'ERRATIC' || type === 'LUMPY' ? type : null;
}

export function normalizeDemandProfile(row: Record<string, unknown>): DemandProfile {
  return {
    itemId: stringValue(row, ['item_id', 'item', '품목코드']) ?? '미정',
    itemName: stringValue(row, ['item_name', '품목명']),
    nPeriods: numberValue(row, ['n_periods']),
    nNonzeroPeriods: numberValue(row, ['n_nonzero_periods']),
    adi: numberValue(row, ['adi']),
    cv: numberValue(row, ['cv']),
    cvSquared: numberValue(row, ['cv_squared', 'cv2']),
    zeroDemandRate: numberValue(row, ['zero_demand_rate']),
    trend: numberValue(row, ['trend', 'trend_per_period']),
    recentChangeRate: numberValue(row, ['recent_change_rate']),
    peakPeriod: stringValue(row, ['peak_period']),
    demandType: normalizeDemandType(value(row, ['demand_type'])),
    seasonality: stringValue(row, ['seasonality']),
    reasonCode: stringValue(row, ['reason_code']),
    stability: stringValue(row, ['stability']),
  };
}

export function normalizeDemandProfileKpi(row: Record<string, unknown>): DemandProfileKpi {
  return {
    totalItems: numberValue(row, ['total_items']) ?? 0,
    nSmooth: numberValue(row, ['n_smooth']) ?? 0,
    nIntermittent: numberValue(row, ['n_intermittent']) ?? 0,
    nErratic: numberValue(row, ['n_erratic']) ?? 0,
    nLumpy: numberValue(row, ['n_lumpy']) ?? 0,
    nCrostonNeeded: numberValue(row, ['n_croston_needed']) ?? 0,
    nCalculationUnavailable: numberValue(row, ['n_calculation_unavailable']) ?? 0,
  };
}

export function normalizeForecastResult(row: Record<string, unknown>): ForecastResult {
  return {
    runId: stringValue(row, ['run_id']) ?? '미정',
    modelId: stringValue(row, ['model_id']) ?? '미정',
    modelVersion: stringValue(row, ['model_version']) ?? '미정',
    itemId: stringValue(row, ['item_id']) ?? '미정',
    period: stringValue(row, ['period']) ?? '미정',
    predictedQty: numberValue(row, ['predicted_qty']),
    p50: numberValue(row, ['p50']),
    p80: numberValue(row, ['p80']),
    p90: numberValue(row, ['p90']),
    sigma: numberValue(row, ['sigma']),
    basis: stringValue(row, ['basis']) ?? '미정',
    reasonCode: stringValue(row, ['reason_code']),
  };
}

function normalizeRunStatus(raw: unknown): ForecastRun['status'] {
  const status = String(raw ?? '').toUpperCase();
  return status === 'RUNNING' || status === 'SUCCESS' || status === 'FAILED' ? status : 'FAILED';
}

export function normalizeForecastRun(row: Record<string, unknown>): ForecastRun {
  return {
    runId: stringValue(row, ['run_id']) ?? '미정',
    status: normalizeRunStatus(row.status),
    granularity: stringValue(row, ['granularity']),
    trainStart: stringValue(row, ['train_start']),
    trainEnd: stringValue(row, ['train_end']),
    horizon: numberValue(row, ['horizon']),
    dataSnapshotAt: stringValue(row, ['data_snapshot_at']),
    stale: row.is_stale === true || row.stale === true,
    nModels: numberValue(row, ['n_models']) ?? 0,
    nItems: numberValue(row, ['n_items']) ?? 0,
    nRows: numberValue(row, ['n_rows']) ?? 0,
    startedAt: stringValue(row, ['started_at']),
    finishedAt: stringValue(row, ['finished_at']),
    durationMs: numberValue(row, ['duration_ms']),
    triggeredEmail: stringValue(row, ['triggered_email']),
    message: stringValue(row, ['message']),
  };
}

export function normalizeModelConfig(row: Record<string, unknown>): ModelConfig {
  const types = value(row, ['applicable_demand_type']);
  return {
    modelId: stringValue(row, ['model_id']) ?? '미정',
    modelName: stringValue(row, ['model_name']) ?? '미정',
    family: stringValue(row, ['family']) ?? '미정',
    engine: stringValue(row, ['engine']) ?? '미정',
    version: stringValue(row, ['version']) ?? '미정',
    enabled: row.enabled === true,
    isDefault: row.is_default === true,
    applicableDemandType: Array.isArray(types) ? types.map(String) : [],
    parameters: (value(row, ['parameters']) as Record<string, unknown> | null) ?? {},
    description: stringValue(row, ['description']),
  };
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
