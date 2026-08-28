# 오류 기록

## localhost:3000 사이트에 연결할 수 없음

- 원인: Next.js 개발 서버(`npm run dev`)가 실행되지 않아 3000 포트가 열려 있지 않음.
- 해결: 프로젝트 루트에서 `npm run dev` 실행 후 `http://localhost:3000` 접속.
- 확인: Next.js 서버가 `0.0.0.0:3000`에서 LISTENING 상태이며 루트 요청이 `/workflow`로 redirect됨.

## `/reset-password` 빌드 오류

- 원인: 정적 생성 페이지에서 `useSearchParams()`를 Suspense 경계 없이 사용함.
- 해결: URL 파라미터를 서버 페이지에서 읽고, 비밀번호 입력 폼만 클라이언트 컴포넌트로 분리함.

## Supabase 비밀번호 재설정 메일 발송 제한

- 증상: `email rate limit exceeded`
- 원인: 짧은 시간에 동일 프로젝트에서 보낼 수 있는 인증 이메일 횟수를 초과함.
- 해결: 제한 시간이 지난 뒤 재시도하거나 Supabase Auth 이메일 발송 설정/SMTP를 확인함.

## 비밀번호 링크 `otp_expired` 및 로컬 Internal Server Error

- 원인: 재설정 링크가 만료되었고, 동시에 `npm run dev`와 `npm run build`가 `.next` 산출물을 함께 사용해 개발 서버 산출물이 깨짐.
- 해결: 개발 서버를 종료한 뒤 `.next`를 재생성하고 `npm run dev`만 실행함. 만료 링크는 로그인 화면에서 재설정 안내를 표시하도록 처리함.

## STEP 4 Data Management 페이지 구문 오류

- 원인: 페이지 JSX 하단에 함수 종료 중괄호가 중복으로 들어감.
- 해결: 중복 중괄호를 제거하고 build를 다시 실행함.
