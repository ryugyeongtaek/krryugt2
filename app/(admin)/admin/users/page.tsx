import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Badge from '@/components/ui/badge';
import Panel from '@/components/ui/panel';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import { updateUserAction } from './actions';

type UserRow = { user_id: string; email: string; name: string; department: string; role: 'ADMIN' | 'USER'; active: boolean; last_login_at: string | null };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const actor = await requireAdmin('/admin/users');
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('core').from('app_user').select('user_id, email, name, department, role, active, last_login_at').order('created_at', { ascending: true });
  const users = (data ?? []) as UserRow[];
  return <div className="app-shell"><Sidebar role="ADMIN" /><main className="main"><Topbar title="사용자 관리" subtitle="ADMIN USER MANAGEMENT" /><div className="content"><Panel title="사용자 목록" description="role과 활성 상태 변경은 서버와 DB에서 다시 검증됩니다.">{params.error && <p className="text-danger" role="alert">변경에 실패했습니다: {params.error}</p>}{params.saved && <p className="text-good" role="status">변경사항을 저장했습니다.</p>}{error ? <p className="text-danger">사용자 목록 조회에 실패했습니다: {error.message}</p> : users.length === 0 ? <p className="muted">등록된 사용자가 없습니다.</p> : <div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>사용자</th><th>부서</th><th>role</th><th>상태</th><th>최근 로그인</th><th>변경</th></tr></thead><tbody>{users.map((user) => <tr key={user.user_id}><td><strong>{user.name || user.email}</strong><div className="muted">{user.email}</div></td><td>{user.department || '—'}</td><td><Badge status={user.role === 'ADMIN' ? 'SAFE' : 'CALCULATION_UNAVAILABLE'}>{user.role}</Badge></td><td>{user.active ? <Badge status="SAFE">활성</Badge> : <Badge status="CALCULATION_UNAVAILABLE">비활성</Badge>}</td><td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString('ko-KR') : '—'}</td><td>{user.user_id === actor.user_id ? <span className="muted">본인 계정 보호됨</span> : <form action={updateUserAction} className="admin-user-form"><input type="hidden" name="user_id" value={user.user_id} /><select name="role" defaultValue={user.role} aria-label={`${user.email} role`}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select><select name="active" defaultValue={String(user.active)} aria-label={`${user.email} 활성 상태`}><option value="true">활성</option><option value="false">비활성</option></select><button className="button primary" type="submit">저장</button></form>}</td></tr>)}</tbody></table></div>}</Panel></div></main></div>;
}
