export type LeadtimeGap = {
  supplier: string;
  country: string;
  masterLeadTime: number | null;
  sampleCount: number;
  actualAverage: number | null;
  p80: number | null;
  gap: number | null;
};

export type StockoutRiskStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'CALCULATION_UNAVAILABLE' | 'UNKNOWN';
export type StockoutRiskReason = 'NO_USAGE_HISTORY' | 'NO_LEADTIME' | 'NO_INVENTORY_DATA' | 'INSUFFICIENT_SAMPLE' | 'NO_FORECAST' | 'NO_USAGE' | null;

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
  period?: string | null;
  scheduledReceipt?: number | null;
  confirmedSalesOrder?: number | null;
  softAllocation?: number | null;
  forecastDemand?: number | null;
  endingProjectedInventory?: number | null;
  monthsOfSupply?: number | null;
  softAllocationStatus?: string | null;
};

export type InventoryProjection = {
  itemId: string;
  period: string;
  beginningInventory: number | null;
  scheduledReceipt: number | null;
  confirmedSalesOrder: number | null;
  softAllocation: number | null;
  forecastDemand: number | null;
  endingProjectedInventory: number | null;
  stockoutPeriod: string | null;
  daysOfSupply: number | null;
  monthsOfSupply: number | null;
  riskStatus: StockoutRiskStatus;
  reasonCode: StockoutRiskReason;
  effectiveLeadTime: number | null;
  softAllocationStatus: string | null;
};

export type LeadtimePolicy = {
  policyId: string | null;
  itemId: string | null;
  supplierId: string | null;
  supplierName: string | null;
  actualLeadTime: number | null;
  p50: number | null;
  p80: number | null;
  p90: number | null;
  sampleCount: number;
  confirmedLeadTime: number | null;
  effectiveLeadTime: number | null;
  effectiveFrom: string | null;
  changedBy: string | null;
  reason: string | null;
};

export type PurchaseRecommendation = {
  itemId: string; itemName: string | null; itemGrade: string | null; forecastQty: number | null; confirmedOrderQty: number | null;
  demandBasisQty: number | null; availableInventory: number | null; scheduledReceipt: number | null; safetyStock: number | null;
  effectiveLeadtime: number | null; stockoutDate: string | null; safetyBufferDays: number | null; requiredQty: number | null;
  moq: number | null; packSize: number | null; recommendedQty: number | null; recommendedOrderDate: string | null;
  riskStatus: StockoutRiskStatus; calculationStatus: string; reasonCode: string | null; forecastRunId: string | null;
  modelVersion: string | null; isImmediate: boolean; isOverdue: boolean; calculationTrace: Record<string, unknown>;
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

export type ModelPerformance = { backtestRunId: string; forecastRunId: string; modelId: string; modelVersion: string | null; itemId: string; nPeriods: number; wape: number | null; mape: number | null; bias: number | null; rmse: number | null; mae: number | null; baselineImprovement: number | null; rank: number | null; calculationStatus: string; reasonCode: string | null };
export type ChampionModel = { backtestRunId: string; itemId: string; championModelId: string; modelVersion: string | null; championMetric: string; championMetricValue: number | null; selectionReason: string; selectionMethod: 'AUTO' | 'MANUAL' };
export type ComparisonPoint = { runId: string; modelId: string; modelVersion: string | null; itemId: string; period: string; p50: number | null; p80: number | null; p90: number | null; sigma: number | null; actualQty: number | null; basis: string };

export type ShipmentTrend = {
  itemCode: string;
  period: string | null;
  periodQty: number | null;
  description: string | null;
  family: string | null;
  itemType: string | null;
  dataAsOf: string | null;
  nMonths: number | null;
  firstYm: string | null;
  lastYm: string | null;
  monthsSinceLast: number | null;
  nSpan: number | null;
  totalQty: number | null;
  latestQty: number | null;
  avg3m: number | null;
  avg6m: number | null;
  avg12m: number | null;
  trend3mVs12m: number | null;
  reasonCode: string | null;
};

export type DemandProfileRt = {
  itemCode: string;
  description: string | null;
  family: string | null;
  itemType: string | null;
  dataAsOf: string | null;
  firstYm: string | null;
  lastYm: string | null;
  nPeriods: number | null;
  nNonzero: number | null;
  meanNonzeroQty: number | null;
  adi: number | null;
  zeroDemandRate: number | null;
  cvSquared: number | null;
  demandType: DemandType | null;
  reasonCode: string | null;
};

export type OlAccuracy = {
  modelBase: string;
  fySheet: string | null;
  biz: string | null;
  nRows: number | null;
  firstYm: string | null;
  lastYm: string | null;
  totalAct: number | null;
  nScoredSales: number | null;
  salesWape: number | null;
  salesBias: number | null;
  nScoredScm: number | null;
  scmWape: number | null;
  scmBias: number | null;
  reasonCode: string | null;
};

export type OlAccuracyFy = {
  fySheet: string;
  nRows: number | null;
  nScored: number | null;
  salesWape: number | null;
  scmWape: number | null;
  salesBias: number | null;
  scmBias: number | null;
};

export type BomRequirement = {
  modelBase: string;
  modelKey: string | null;
  partRole: string | null;
  itemCode: string;
  description: string | null;
  qty: number | null;
  bomGroup: string | null;
  nModels: number | null;
  commonFlag: string | null;
  commonNote: string | null;
};

export type OlAccuracyResult = { rows: OlAccuracy[]; fyRows: OlAccuracyFy[] };

export function normalizeModelPerformance(row: Record<string, unknown>): ModelPerformance {
  return { backtestRunId: String(row.backtest_run_id ?? ''), forecastRunId: String(row.forecast_run_id ?? ''), modelId: String(row.model_id ?? ''), modelVersion: stringValue(row, ['model_version']), itemId: String(row.item_id ?? ''), nPeriods: Number(row.n_periods ?? 0), wape: numberOrNull(row.wape), mape: numberOrNull(row.mape), bias: numberOrNull(row.bias), rmse: numberOrNull(row.rmse), mae: numberOrNull(row.mae), baselineImprovement: numberOrNull(row.baseline_improvement), rank: numberOrNull(row.rank), calculationStatus: String(row.calculation_status ?? 'CALCULATION_UNAVAILABLE'), reasonCode: stringValue(row, ['reason_code']) };
}

export function normalizeChampionModel(row: Record<string, unknown>): ChampionModel {
  return { backtestRunId: String(row.backtest_run_id ?? ''), itemId: String(row.item_id ?? ''), championModelId: String(row.champion_model_id ?? ''), modelVersion: stringValue(row, ['model_version']), championMetric: String(row.champion_metric ?? ''), championMetricValue: numberOrNull(row.champion_metric_value), selectionReason: String(row.selection_reason ?? ''), selectionMethod: row.selection_method === 'MANUAL' ? 'MANUAL' : 'AUTO' };
}

export function normalizeComparisonPoint(row: Record<string, unknown>): ComparisonPoint {
  return { runId: String(row.run_id ?? ''), modelId: String(row.model_id ?? ''), modelVersion: stringValue(row, ['model_version']), itemId: String(row.item_id ?? ''), period: String(row.period ?? ''), p50: numberOrNull(row.p50), p80: numberOrNull(row.p80), p90: numberOrNull(row.p90), sigma: numberOrNull(row.sigma), actualQty: numberOrNull(row.actual_qty), basis: String(row.basis ?? '') };
}

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

function numberOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
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
  return status === 'SAFE' || status === 'WARNING' || status === 'CRITICAL' || status === 'CALCULATION_UNAVAILABLE' ? status : 'UNKNOWN';
}

function normalizeStockoutReason(raw: unknown): StockoutRiskReason {
  const reason = String(raw ?? '').toUpperCase();
  return ['NO_USAGE_HISTORY','NO_LEADTIME','NO_INVENTORY_DATA','INSUFFICIENT_SAMPLE','NO_FORECAST','NO_USAGE'].includes(reason) ? reason as StockoutRiskReason : null;
}

export function normalizeStockoutRisk(row: Record<string, unknown>): StockoutRisk {
  const result: StockoutRisk = {
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
  if ('period' in row) result.period = stringValue(row, ['period']);
  if ('scheduled_receipt' in row) result.scheduledReceipt = numberValue(row, ['scheduled_receipt']);
  if ('confirmed_sales_order' in row) result.confirmedSalesOrder = numberValue(row, ['confirmed_sales_order']);
  if ('soft_allocation' in row) result.softAllocation = numberValue(row, ['soft_allocation']);
  if ('forecast_demand' in row) result.forecastDemand = numberValue(row, ['forecast_demand']);
  if ('ending_projected_inventory' in row) result.endingProjectedInventory = numberValue(row, ['ending_projected_inventory']);
  if ('months_of_supply' in row) result.monthsOfSupply = numberValue(row, ['months_of_supply']);
  if ('soft_allocation_status' in row) result.softAllocationStatus = stringValue(row, ['soft_allocation_status']);
  return result;
}

export function normalizeInventoryProjection(row: Record<string, unknown>): InventoryProjection {
  return {
    itemId: stringValue(row, ['item_id']) ?? '미정', period: stringValue(row, ['period']) ?? '미정',
    beginningInventory: numberValue(row, ['beginning_inventory']), scheduledReceipt: numberValue(row, ['scheduled_receipt']),
    confirmedSalesOrder: numberValue(row, ['confirmed_sales_order']), softAllocation: numberValue(row, ['soft_allocation']),
    forecastDemand: numberValue(row, ['forecast_demand']), endingProjectedInventory: numberValue(row, ['ending_projected_inventory']),
    stockoutPeriod: stringValue(row, ['stockout_period']), daysOfSupply: numberValue(row, ['days_of_supply']),
    monthsOfSupply: numberValue(row, ['months_of_supply']), riskStatus: normalizeRiskStatus(row.risk_status),
    reasonCode: normalizeStockoutReason(row.reason_code), effectiveLeadTime: numberValue(row, ['effective_lead_time']),
    softAllocationStatus: stringValue(row, ['soft_allocation_status']),
  };
}

export function normalizeLeadtimePolicy(row: Record<string, unknown>): LeadtimePolicy {
  return { policyId: stringValue(row, ['policy_id']), itemId: stringValue(row, ['item_id']), supplierId: stringValue(row, ['supplier_id']),
    supplierName: stringValue(row, ['supplier_name']), actualLeadTime: numberValue(row, ['actual_lead_time']), p50: numberValue(row, ['p50_days','p50']),
    p80: numberValue(row, ['p80_days','p80']), p90: numberValue(row, ['p90_days','p90']), sampleCount: numberValue(row, ['n_samples']) ?? 0,
    confirmedLeadTime: numberValue(row, ['confirmed_lead_time']), effectiveLeadTime: numberValue(row, ['effective_lead_time']),
    effectiveFrom: stringValue(row, ['effective_from']), changedBy: stringValue(row, ['changed_by']), reason: stringValue(row, ['reason']) };
}

export function normalizePurchaseRecommendation(row: Record<string, unknown>): PurchaseRecommendation {
  return { itemId: stringValue(row, ['item_id']) ?? '미정', itemName: stringValue(row, ['item_name']), itemGrade: stringValue(row, ['item_grade']),
    forecastQty: numberValue(row, ['forecast_qty']), confirmedOrderQty: numberValue(row, ['confirmed_order_qty','confirmed_sales_order']), demandBasisQty: numberValue(row, ['demand_basis_qty']),
    availableInventory: numberValue(row, ['available_inventory']), scheduledReceipt: numberValue(row, ['scheduled_receipt']), safetyStock: numberValue(row, ['safety_stock']),
    effectiveLeadtime: numberValue(row, ['effective_lead_time']), stockoutDate: stringValue(row, ['stockout_date']), safetyBufferDays: numberValue(row, ['safety_buffer_days']),
    requiredQty: numberValue(row, ['required_qty']), moq: numberValue(row, ['moq']), packSize: numberValue(row, ['pack_size']), recommendedQty: numberValue(row, ['recommended_qty']),
    recommendedOrderDate: stringValue(row, ['recommended_order_date']), riskStatus: normalizeRiskStatus(row.risk_status), calculationStatus: String(row.calculation_status ?? 'CALCULATION_UNAVAILABLE'),
    reasonCode: stringValue(row, ['reason_code']), forecastRunId: stringValue(row, ['forecast_run_id']), modelVersion: stringValue(row, ['model_version']),
    isImmediate: row.is_immediate === true, isOverdue: row.is_overdue === true, calculationTrace: (row.calculation_trace as Record<string, unknown> | null) ?? {} };
}

export function normalizeShipmentTrend(row: Record<string, unknown>): ShipmentTrend {
  return {
    itemCode: stringValue(row, ['item_code', 'item_id']) ?? '미정', period: stringValue(row, ['ym', 'period', 'shipment_ym', 'month']), periodQty: numberValue(row, ['qty', 'period_qty', 'monthly_qty', 'shipment_qty']), description: stringValue(row, ['description', 'item_name', '품목명']),
    family: stringValue(row, ['family']), itemType: stringValue(row, ['item_type']), dataAsOf: stringValue(row, ['data_as_of']),
    nMonths: numberValue(row, ['n_months']), firstYm: stringValue(row, ['first_ym']), lastYm: stringValue(row, ['last_ym']),
    monthsSinceLast: numberValue(row, ['months_since_last']), nSpan: numberValue(row, ['n_span']), totalQty: numberValue(row, ['total_qty']),
    latestQty: numberValue(row, ['latest_qty']), avg3m: numberValue(row, ['avg_3m']), avg6m: numberValue(row, ['avg_6m']),
    avg12m: numberValue(row, ['avg_12m']), trend3mVs12m: numberValue(row, ['trend_3m_vs_12m']), reasonCode: stringValue(row, ['reason_code']),
  };
}

export function normalizeDemandProfileRt(row: Record<string, unknown>): DemandProfileRt {
  return {
    itemCode: stringValue(row, ['item_code', 'item_id']) ?? '미정', description: stringValue(row, ['description', 'item_name', '품목명']),
    family: stringValue(row, ['family']), itemType: stringValue(row, ['item_type']), dataAsOf: stringValue(row, ['data_as_of']),
    firstYm: stringValue(row, ['first_ym']), lastYm: stringValue(row, ['last_ym']), nPeriods: numberValue(row, ['n_periods']),
    nNonzero: numberValue(row, ['n_nonzero']), meanNonzeroQty: numberValue(row, ['mean_nonzero_qty']), adi: numberValue(row, ['adi']),
    zeroDemandRate: numberValue(row, ['zero_demand_rate']), cvSquared: numberValue(row, ['cv_squared', 'cv2']),
    demandType: normalizeDemandType(value(row, ['demand_type'])), reasonCode: stringValue(row, ['reason_code']),
  };
}

export function normalizeOlAccuracy(row: Record<string, unknown>): OlAccuracy {
  return {
    modelBase: stringValue(row, ['model_base']) ?? '미정', fySheet: stringValue(row, ['fy_sheet']), biz: stringValue(row, ['biz']),
    nRows: numberValue(row, ['n_rows']), firstYm: stringValue(row, ['first_ym']), lastYm: stringValue(row, ['last_ym']), totalAct: numberValue(row, ['total_act']),
    nScoredSales: numberValue(row, ['n_scored_sales']), salesWape: numberValue(row, ['sales_wape']), salesBias: numberValue(row, ['sales_bias']),
    nScoredScm: numberValue(row, ['n_scored_scm']), scmWape: numberValue(row, ['scm_wape']), scmBias: numberValue(row, ['scm_bias']),
    reasonCode: stringValue(row, ['reason_code']),
  };
}

export function normalizeOlAccuracyFy(row: Record<string, unknown>): OlAccuracyFy {
  return {
    fySheet: stringValue(row, ['fy_sheet']) ?? '미정', nRows: numberValue(row, ['n_rows']), nScored: numberValue(row, ['n_scored']),
    salesWape: numberValue(row, ['sales_wape']), scmWape: numberValue(row, ['scm_wape']), salesBias: numberValue(row, ['sales_bias']), scmBias: numberValue(row, ['scm_bias']),
  };
}

export function normalizeBomRequirement(row: Record<string, unknown>): BomRequirement {
  return {
    modelBase: stringValue(row, ['model_base']) ?? '미정', modelKey: stringValue(row, ['model_key']), partRole: stringValue(row, ['part_role']),
    itemCode: stringValue(row, ['item_code', 'item_id']) ?? '미정', description: stringValue(row, ['description', 'item_name', '품목명']), qty: numberValue(row, ['qty']),
    bomGroup: stringValue(row, ['bom_group']), nModels: numberValue(row, ['n_models']), commonFlag: stringValue(row, ['common_flag']), commonNote: stringValue(row, ['common_note']),
  };
}
