'use server';

import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function setLeadtimePolicyAction(formData: FormData) {
  await requireAdmin('/admin/scm-policies/lead-time');
  const itemId = String(formData.get('item_id') ?? '');
  const supplierId = String(formData.get('supplier_id') ?? '');
  const value = String(formData.get('confirmed_lead_time') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) throw new Error('리드타임 변경 사유를 입력하세요.');
  const leadTime = value ? Number(value) : null;
  if (leadTime !== null && (!Number.isFinite(leadTime) || leadTime <= 0)) throw new Error('확정 리드타임은 0보다 커야 합니다.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_leadtime_policy', { p_item_id: itemId || null, p_supplier_id: supplierId || null, p_confirmed_lead_time: leadTime, p_effective_from: String(formData.get('effective_from') || '') || null, p_reason: reason });
  if (error) throw new Error(error.message);
}
