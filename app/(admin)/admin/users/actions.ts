'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { safeNextPath } from '@/lib/auth-model';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function updateUserAction(formData: FormData) {
  await requireAdmin('/admin/users');
  const targetUserId = String(formData.get('user_id') ?? '');
  const role = String(formData.get('role') ?? 'USER');
  const active = String(formData.get('active') ?? 'false') === 'true';
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('admin_update_app_user', {
    target_user_id: targetUserId,
    next_role: role,
    next_active: active,
  });
  if (error) redirect(`/admin/users?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(safeNextPath('/admin/users'))}`);
  redirect('/admin/users?saved=1');
}
