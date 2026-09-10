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

## Agent 숫자 검증이 기간 표현을 오탐한 문제 (2026-09-04)

### 증상

`602K02693`의 정상 답변에 포함된 `3개월 평균`을 ToolResult에 없는 출처 없는 숫자로 판단해 답변 검증이 실패했습니다.

### 원인

Guardrail 숫자 추출기가 수량·지표 숫자와 기간을 구분하지 않고 `개월` 앞의 숫자도 추출했습니다.

### 해결

숫자 뒤에 `개월` 또는 `개월간`이 이어지는 기간 표현은 수치 대조 대상에서 제외했습니다. 재현 테스트를 먼저 실패시킨 뒤 최소 수정했으며, 정상 수치·조작 수치 검증 테스트를 다시 통과시켰습니다.

## Agent 출고 추이 조회 실패 (2026-09-10)

### 증상

Agent 질문 결과가 `CALCULATION_UNAVAILABLE`로 표시되고, `analytics.v_shipment_by_hoc`를 스키마 캐시에서 찾을 수 없다는 오류가 발생했습니다.

### 원인

`core.v_shipment_by_hoc`는 XCN 연계를 위한 원천 집계 뷰이고, Agent가 조회해야 하는 화면용 결과 뷰는 `analytics.v_shipment_trend`입니다. 조회 함수가 존재하지 않는 `analytics.v_shipment_by_hoc`를 직접 요청하고 있었습니다.

### 해결

`getShipmentTrend`가 `analytics.v_shipment_trend`를 조회하도록 수정하고 Agent Tool 설명도 실제 화면용 뷰와 일치시켰습니다. 화면용 analytics 뷰는 원천 `core.v_shipment_by_hoc`를 내부에서 사용하므로 XCN 합산 규칙도 유지됩니다.

## Agent JSON 응답 fallback 실패 (2026-09-10)

### 증상

Agent 질문이 `LLM HTTP 400`으로 실패하며, `json_object` 응답 형식 사용 시 `messages`에 `json`이라는 단어가 필요하다는 오류가 표시됐습니다.

### 원인

모델이 `json_schema`를 지원하지 않아 `json_object`로 한 번 재시도했지만, 재시도 요청의 messages에 JSON 응답 지시가 없었습니다.

### 해결

`json_schema` fallback 시 JSON 지시 system message를 한 번 추가하도록 수정했습니다. 기존 messages에 이미 JSON 지시가 있으면 중복 추가하지 않습니다.
