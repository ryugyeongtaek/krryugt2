# 오류 기록

## localhost:3000 사이트에 연결할 수 없음

- 원인: Next.js 개발 서버(`npm run dev`)가 실행되지 않아 3000 포트가 열려 있지 않음.
- 해결: 프로젝트 루트에서 `npm run dev` 실행 후 `http://localhost:3000` 접속.
- 확인: Next.js 서버가 `0.0.0.0:3000`에서 LISTENING 상태이며 루트 요청이 `/workflow`로 redirect됨.
