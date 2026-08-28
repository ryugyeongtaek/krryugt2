import { NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/auth-model';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next') ?? '/workflow');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(`/reset-password?next=${encodeURIComponent(next)}`, url.origin));
    }
  }

  return NextResponse.redirect(new URL('/login?error=invalid', url.origin));
}
