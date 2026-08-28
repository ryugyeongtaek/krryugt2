'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) return setError('비밀번호는 8자 이상 입력하세요.');
    if (password !== confirm) return setError('비밀번호가 일치하지 않습니다.');
    setSaving(true);
    setError('');
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('비밀번호 변경 링크가 만료되었거나 유효하지 않습니다. 재설정 메일을 다시 요청하세요.');
      setSaving(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark auth-mark">SCM</div>
        <div className="eyebrow">ACCOUNT SECURITY</div>
        <h1>비밀번호 설정</h1>
        <p className="muted">새 비밀번호를 설정하면 시스템에 로그인할 수 있습니다.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <form className="auth-form" onSubmit={submit}>
          <label>새 비밀번호<input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></label>
          <label>새 비밀번호 확인<input className="form-input" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required /></label>
          <button className="button primary" type="submit" disabled={saving}>{saving ? '저장 중...' : '비밀번호 저장'}</button>
        </form>
      </section>
    </main>
  );
}
