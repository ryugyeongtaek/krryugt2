'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function updateModelConfigAction(formData: FormData) {
  const user = await requireAdmin('/admin/forecast-models');
  const modelId = String(formData.get('model_id') ?? '').trim();
  if (!modelId) redirect('/admin/forecast-models?error=MODEL_ID_REQUIRED');
  let parameters: unknown;
  try { parameters = JSON.parse(String(formData.get('parameters') ?? '{}')); } catch { redirect('/admin/forecast-models?error=INVALID_PARAMETERS'); }
  const supabase = await createSupabaseServerClient();
  const before = await supabase.schema('core').from('model_config').select('*').eq('model_id', modelId).maybeSingle();
  const after = { enabled: formData.get('enabled') === 'true', parameters };
  const { error } = await supabase.schema('core').from('model_config').update(after).eq('model_id', modelId);
  if (error) redirect(`/admin/forecast-models?error=${encodeURIComponent(error.message)}`);
  await supabase.schema('core').from('audit_log').insert({ actor: user.user_id, action: 'MODEL_CONFIG_UPDATED', target_type: 'model_config', target_id: modelId, before: before.data ?? null, after });
  redirect('/admin/forecast-models?updated=1');
}
