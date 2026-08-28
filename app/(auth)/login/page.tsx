import { loginAction } from './actions';
import Link from 'next/link';
import AuthLinkError from './auth-link-error';

const messages: Record<string, string> = {
  required: '이메일과 비밀번호를 입력하세요.',
  invalid: '이메일 또는 비밀번호가 올바르지 않습니다.',
  inactive: '비활성화된 계정입니다. 관리자에게 문의하세요.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : '/workflow';
  return <main className="auth-page"><section className="auth-card"><div className="brand-mark auth-mark">SCM</div><div className="eyebrow">SUPPLY CHAIN MANAGEMENT</div><h1>월간 발주계획</h1><p className="muted">계정으로 로그인해 발주·분석 업무를 시작하세요.</p><AuthLinkError />{params.error && <p className="auth-error" role="alert">{messages[params.error] ?? '로그인에 실패했습니다.'}</p>}<form action={loginAction} className="auth-form"><input type="hidden" name="next" value={next} /><label>이메일<input className="form-input" type="email" name="email" autoComplete="email" required /></label><label>비밀번호<input className="form-input" type="password" name="password" autoComplete="current-password" required /></label><button className="button primary" type="submit">로그인</button></form><Link className="auth-link" href={`/forgot-password?next=${encodeURIComponent(next)}`}>비밀번호를 잊으셨나요?</Link></section></main>;
}
