'use server';

import { redirect } from 'next/navigation';
import { safeNextPath } from '@/lib/auth-model';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNextPath(String(formData.get('next') ?? '/workflow'));
  if (!email || !password) redirect(`/login?error=required&next=${encodeURIComponent(next)}`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  await supabase.rpc('touch_last_login');
  redirect(next);
}
