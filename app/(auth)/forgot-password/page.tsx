import Link from 'next/link';
import { requestPasswordResetAction } from './actions';

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark auth-mark">SCM</div>
        <div className="eyebrow">ACCOUNT RECOVERY</div>
        <h1>비밀번호 찾기</h1>
        <p className="muted">가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.</p>
        {params.sent && <p className="auth-success" role="status">재설정 메일을 확인하세요. 스팸메일함도 함께 확인해 주세요.</p>}
        {params.error && <p className="auth-error" role="alert">이메일을 확인하거나 잠시 후 다시 시도하세요.</p>}
        <form action={requestPasswordResetAction} className="auth-form">
          <label>이메일<input className="form-input" type="email" name="email" autoComplete="email" required /></label>
          <button className="button primary" type="submit">재설정 메일 보내기</button>
        </form>
        <Link className="auth-link" href="/login">로그인으로 돌아가기</Link>
      </section>
    </main>
  );
}
