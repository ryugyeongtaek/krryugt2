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

## SQL 적재 후 Git push 실패 (2026-09-04)

- 원인: 현재 작업 환경에서 `.git/index` 갱신 권한이 없어 안전 migration 파일을 stage/commit하지 못했고, GitHub 원격 연결도 `github.com:443`에 연결할 수 없어 실패함.
- 상태: 기존 `fe16793` 커밋은 `origin/main`과 동일하지만, `supabase/migrations/20260904000100_import_01_schema_safe.sql`은 아직 untracked 상태.
- 해결: Git 권한과 네트워크가 가능한 환경에서 `git add`, `git commit`, `git push origin main`을 재시도해야 함.
## Supabase 객체 검증 쿼리 별칭 오류 (2026-09-04)

### 증상

검증 쿼리 실행 시 `column "object_name" does not exist` 오류가 발생했습니다.

### 원인

검증용 `VALUES` 결과에 정의한 컬럼명은 `expected_object`인데 조건문에서 존재하지 않는 `object_name` 별칭을 참조했습니다.

### 해결

`to_regclass(expected_object)`로 수정하여 실제 객체 존재 여부를 확인합니다.
## Supabase SQL Editor 기존 문장 잔존 오류 (2026-09-04)

### 증상

검증 SQL 교체 후 `syntax error at or near "select"` 오류가 발생했습니다.

### 원인

SQL Editor 코드 편집 영역에서 입력 내용을 교체하는 과정에 기존 SQL 일부가 남아 두 개의 `select` 문이 연결되었습니다.

### 해결

편집 영역을 전체 선택한 후 새 검증 SQL을 입력하고 실행합니다.
## Supabase SQL Editor 검증문 교체 잔존 오류 2 (2026-09-04)

### 증상

검증문 재실행 시 `syntax error at or near "with"` 오류가 발생했습니다.

### 원인

SQL Editor가 새 입력과 기존 입력을 겹쳐 처리하여 CTE 앞에 이전 SQL 일부가 남았습니다.

### 해결

편집기 전체 선택 후 짧은 단일 검증 쿼리로 실행합니다.

## `npx tsc --noEmit` 기존 정규식 플래그 오류 (2026-09-04)

### 증상

타입 검사에서 `lib/demand-profile-sql.test.ts`, `lib/forecast-engine-sql.test.ts`, `lib/safety-stock-sql.test.ts`의 정규식 플래그에 대해 `target es2018 이상이 필요하다`는 오류가 발생했습니다.

### 원인

현재 TypeScript 설정의 target보다 기존 SQL 검증 테스트가 사용하는 정규식 플래그 요구 수준이 높습니다. 이번에 추가한 실데이터 조회 타입·함수·`/agent` 라우트에서는 타입 오류가 발생하지 않았습니다.

### 해결

기존 테스트 또는 `tsconfig.json`의 target 설정을 별도 정비해야 합니다. 이번 요청에서는 기존 3개 테스트와 전역 target 설정을 변경하지 않고 기록만 남깁니다.

## 병렬 실행 중 TypeScript 생성 타입 파일 누락 (2026-09-04)

### 증상

`npm test`, `npx tsc --noEmit`, `npm run build`를 동시에 실행했을 때 `.next/types` 아래 파일이 없다는 `TS6053` 오류가 발생했습니다.

### 원인

Next.js 빌드가 `.next` 생성 타입을 갱신하는 동안 TypeScript가 같은 파일을 읽었습니다.

### 해결

빌드 완료 후 `npx tsc --noEmit`를 단독 실행했습니다. 그 결과 남은 오류는 기존 SQL 테스트 3개의 정규식 target 설정 오류뿐입니다.

## TypeScript 정규식 플래그 오류 해결 (2026-09-04)

### 원인

`tsconfig.json`의 ES5 target에서 지원하지 않는 정규식 `s` 플래그가 SQL 검증 테스트 3곳에 사용되고 있었습니다.

### 해결

테스트 의미를 유지하도록 `s` 플래그를 `\\s\\S` 패턴으로 바꾸고 ES5 target은 유지했습니다.

### 확인

`npm test`, `npx tsc --noEmit`, `npm run build`가 모두 성공했습니다.
