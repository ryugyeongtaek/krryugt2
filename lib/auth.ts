import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';
import type { AppRole } from './auth-model';

export type AppUser = { user_id: string; email: string; name: string; department: string; role: AppRole; active: boolean; last_login_at: string | null };

export async function getRole(): Promise<AppRole | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.schema('core').from('app_user').select('role, active').eq('user_id', user.id).maybeSingle();
  if (!data?.active || (data.role !== 'ADMIN' && data.role !== 'USER')) return null;
  return data.role;
}

export async function requireUser(next = '/workflow'): Promise<AppUser> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const { data, error } = await supabase.schema('core').from('app_user').select('*').eq('user_id', user.id).maybeSingle();
  if (error || !data || !data.active) redirect(`/login?next=${encodeURIComponent(next)}&error=inactive`);
  return data as AppUser;
}

export async function requireAdmin(next = '/admin'): Promise<AppUser> {
  const user = await requireUser(next);
  if (user.role !== 'ADMIN') redirect('/forbidden');
  return user;
}
