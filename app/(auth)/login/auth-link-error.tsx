'use client';

import { useEffect, useState } from 'react';

export default function AuthLinkError() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('error_code') === 'otp_expired') {
      setMessage('비밀번호 재설정 링크가 만료되었습니다. 비밀번호 찾기에서 새 링크를 요청하세요.');
    } else if (hash.get('error')) {
      setMessage('인증 링크가 유효하지 않습니다. 새 링크를 요청하세요.');
    }
    if (window.location.hash) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, []);
  return message ? <p className="auth-error" role="alert">{message}</p> : null;
}
