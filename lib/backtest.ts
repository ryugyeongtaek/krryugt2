'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from './auth';
import { createSupabaseServerClient } from './supabase/server';

export async function runBacktestAction(formData: FormData) {
  await requireAdmin('/admin/backtest');
  const forecastRunId = String(formData.get('forecast_run_id') ?? '').trim();
  if (!forecastRunId) redirect('/admin/backtest?error=FORECAST_RUN_REQUIRED');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('core').rpc('run_backtest', { p_forecast_run_id: forecastRunId });
  if (error) redirect(`/admin/backtest?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/backtest?backtest=${encodeURIComponent(String(data ?? ''))}`);
}

export async function setManualChampionAction(formData: FormData) {
  const user = await requireAdmin('/admin/backtest');
  const backtestRunId = String(formData.get('backtest_run_id') ?? '');
  const itemId = String(formData.get('item_id') ?? '');
  const modelId = String(formData.get('model_id') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) redirect('/admin/backtest?error=MANUAL_CHAMPION_REASON_REQUIRED');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('set_manual_champion', { p_backtest_run_id: backtestRunId, p_item_id: itemId, p_model_id: modelId, p_reason: reason });
  if (error) redirect(`/admin/backtest?error=${encodeURIComponent(error.message)}`);
  void user;
  redirect('/admin/backtest?updated=1');
}
