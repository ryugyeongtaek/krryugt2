import { createSupabaseServerClient } from './supabase';
import { normalizeDemandProfile, normalizeDemandProfileKpi, normalizeForecastResult, normalizeForecastRun, normalizeModelConfig, normalizeModelPerformance, normalizeChampionModel, normalizeComparisonPoint, normalizeLeadtimeGap, normalizeStockoutRisk, normalizeInventoryProjection, normalizeLeadtimePolicy, normalizePurchaseRecommendation, normalizeShipmentTrend, normalizeDemandProfileRt, normalizeOlAccuracy, normalizeOlAccuracyFy, normalizeBomRequirement, type DemandProfile, type DemandProfileKpi, type ForecastResult, type ForecastRun, type ModelConfig, type ModelPerformance, type ChampionModel, type ComparisonPoint, type LeadtimeGap, type StockoutRisk, type InventoryProjection, type LeadtimePolicy, type PurchaseRecommendation, type ShipmentTrend, type DemandProfileRt, type OlAccuracyResult, type BomRequirement } from './scm-model';

export async function getDemandProfiles(): Promise<{ rows: DemandProfile[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_sku_demand_profile').select('*').order('item_id');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeDemandProfile(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getDemandProfileKpi(): Promise<{ data: DemandProfileKpi | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_demand_profile_kpi').select('*').maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: data ? normalizeDemandProfileKpi(data as Record<string, unknown>) : null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getLeadtimeGap(): Promise<{ rows: LeadtimeGap[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_leadtime_gap').select('*');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeLeadtimeGap(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getStockoutKpi() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_stockout_kpi').select('*').maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getStockoutRisks(): Promise<{ rows: StockoutRisk[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_stockout_risk').select('*');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeStockoutRisk(row as Record<string, unknown>)), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' };
  }
}

export async function getInventoryProjections(): Promise<{ rows: InventoryProjection[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_inventory_projection').select('*').order('item_id').order('period');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeInventoryProjection(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getLeadtimePolicies(): Promise<{ rows: LeadtimePolicy[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_leadtime_policy').select('*').order('supplier_id').order('item_id');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeLeadtimePolicy(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getPurchaseRecommendations(itemId?: string): Promise<{ rows: PurchaseRecommendation[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.schema('analytics').from('v_purchase_recommendation').select('*').order('is_immediate', { ascending: false }).order('item_id');
    if (itemId) query = query.eq('item_id', itemId);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizePurchaseRecommendation(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getModelConfigs(): Promise<{ rows: ModelConfig[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_model_config').select('*').order('model_id');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeModelConfig(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getForecastRuns(): Promise<{ rows: ForecastRun[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_forecast_run').select('*').order('started_at', { ascending: false }).limit(50);
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeForecastRun(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getForecastResults(runId?: string): Promise<{ rows: ForecastResult[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.schema('analytics').from('v_forecast_result').select('*').order('period').order('item_id');
    if (runId) query = query.eq('run_id', runId);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeForecastResult(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getBacktestPerformances(forecastRunId?: string): Promise<{ rows: ModelPerformance[]; error: string | null }> {
  try { const supabase = await createSupabaseServerClient(); let q = supabase.schema('analytics').from('v_model_performance').select('*').order('item_id').order('rank'); if (forecastRunId) q = q.eq('forecast_run_id', forecastRunId); const { data, error } = await q; if (error) return { rows: [], error: error.message }; return { rows: (data ?? []).map((r) => normalizeModelPerformance(r as Record<string, unknown>)), error: null }; }
  catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getChampions(backtestRunId?: string): Promise<{ rows: ChampionModel[]; error: string | null }> {
  try { const supabase = await createSupabaseServerClient(); let q = supabase.schema('analytics').from('v_champion_model').select('*').order('item_id'); if (backtestRunId) q = q.eq('backtest_run_id', backtestRunId); const { data, error } = await q; if (error) return { rows: [], error: error.message }; return { rows: (data ?? []).map((r) => normalizeChampionModel(r as Record<string, unknown>)), error: null }; }
  catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getComparisonPoints(runId?: string): Promise<{ rows: ComparisonPoint[]; error: string | null }> {
  try { const supabase = await createSupabaseServerClient(); let q = supabase.schema('analytics').from('v_model_comparison').select('*').order('period').order('item_id'); if (runId) q = q.eq('run_id', runId); const { data, error } = await q; if (error) return { rows: [], error: error.message }; return { rows: (data ?? []).map((r) => normalizeComparisonPoint(r as Record<string, unknown>)), error: null }; }
  catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getBacktestRuns() {
  try { const supabase = await createSupabaseServerClient(); const { data, error } = await supabase.schema('analytics').from('v_backtest_run').select('*').order('started_at', { ascending: false }).limit(30); return { rows: data ?? [], error: error?.message ?? null }; }
  catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getShipmentTrend(itemCode?: string): Promise<{ rows: ShipmentTrend[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.schema('analytics').from('v_shipment_trend').select('*').order('item_code');
    if (itemCode) query = query.eq('item_code', itemCode);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeShipmentTrend(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getDemandProfileRt(itemCode?: string): Promise<{ rows: DemandProfileRt[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.schema('analytics').from('v_item_demand_profile').select('*').order('item_code');
    if (itemCode) query = query.eq('item_code', itemCode);
    const { data, error } = await query;
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeDemandProfileRt(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getOlAccuracy(modelBase?: string): Promise<{ data: OlAccuracyResult | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    let accuracyQuery = supabase.schema('analytics').from('v_ol_accuracy').select('*').order('model_base');
    if (modelBase) accuracyQuery = accuracyQuery.eq('model_base', modelBase);
    const [accuracy, fy] = await Promise.all([
      accuracyQuery,
      supabase.schema('analytics').from('v_ol_accuracy_fy').select('*').order('fy_sheet'),
    ]);
    if (accuracy.error) return { data: null, error: accuracy.error.message };
    if (fy.error) return { data: null, error: fy.error.message };
    return { data: { rows: (accuracy.data ?? []).map((row) => normalizeOlAccuracy(row as Record<string, unknown>)), fyRows: (fy.data ?? []).map((row) => normalizeOlAccuracyFy(row as Record<string, unknown>)) }, error: null };
  } catch (error) { return { data: null, error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}

export async function getBomRequirement(modelBase: string): Promise<{ rows: BomRequirement[]; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.schema('analytics').from('v_bom_requirement_x').select('*').eq('model_base', modelBase).order('item_code');
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []).map((row) => normalizeBomRequirement(row as Record<string, unknown>)), error: null };
  } catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Supabase 조회에 실패했습니다.' }; }
}
