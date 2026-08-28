import { createSupabaseServerClient } from './supabase';
import { normalizeDemandProfile, normalizeDemandProfileKpi, normalizeForecastResult, normalizeForecastRun, normalizeModelConfig, normalizeModelPerformance, normalizeChampionModel, normalizeComparisonPoint, normalizeLeadtimeGap, normalizeStockoutRisk, normalizeInventoryProjection, normalizeLeadtimePolicy, type DemandProfile, type DemandProfileKpi, type ForecastResult, type ForecastRun, type ModelConfig, type ModelPerformance, type ChampionModel, type ComparisonPoint, type LeadtimeGap, type StockoutRisk, type InventoryProjection, type LeadtimePolicy } from './scm-model';

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
