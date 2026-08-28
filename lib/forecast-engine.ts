'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from './auth';
import { createSupabaseServerClient } from './supabase/server';

export async function runBaselineForecastAction() {
  const user = await requireAdmin('/admin/forecast-runs');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('core').rpc('run_baseline_forecast');
  if (error) redirect(`/admin/forecast-runs?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/forecast-runs?run=${encodeURIComponent(String(data ?? ''))}&triggered_by=${encodeURIComponent(user.email ?? '')}`);
}
