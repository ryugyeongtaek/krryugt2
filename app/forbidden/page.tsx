export default function ForbiddenPage() {
  return <main className="auth-page"><section className="auth-card"><div className="eyebrow">403 FORBIDDEN</div><h1>접근 권한이 없습니다.</h1><p className="muted">이 페이지는 ADMIN 권한이 있는 사용자만 접근할 수 있습니다.</p><a className="button" href="/workflow">업무 화면으로 돌아가기</a></section></main>;
}
