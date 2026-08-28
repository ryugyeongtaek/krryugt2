'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) redirect('/forgot-password?error=required');

  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const protocol = headerStore.get('x-forwarded-proto') ?? 'http';
  if (!host) redirect('/forgot-password?error=invalid');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/auth/callback?next=/reset-password`,
  });
  if (error) redirect('/forgot-password?error=invalid');
  redirect('/forgot-password?sent=true');
}
