import { NextResponse, type NextRequest } from 'next/server';
import { updateSupabaseSession } from '@/lib/supabase/middleware';
import { safeNextPath } from '@/lib/auth-model';

const protectedPrefixes = ['/workflow', '/analysis', '/admin'];

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSupabaseSession(request);
  const path = request.nextUrl.pathname;
  if (!protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return response;
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', safeNextPath(`${path}${request.nextUrl.search}`));
    return NextResponse.redirect(loginUrl);
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    const { data } = await supabase.schema('core').from('app_user').select('role, active').eq('user_id', user.id).maybeSingle();
    if (data?.role !== 'ADMIN' || data.active !== true) return new NextResponse('관리자 권한이 필요합니다.', { status: 403 });
  }
  return response;
}

export const config = { matcher: ['/workflow/:path*', '/analysis/:path*', '/admin/:path*'] };
