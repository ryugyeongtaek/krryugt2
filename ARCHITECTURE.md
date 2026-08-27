# ARCHITECTURE.md

기기·옵션 월간 발주계획 MVP의 현재 코드와 데이터베이스 정의를 실제 파일 기준으로 정리한 문서입니다.

> 분석 기준: `superSCM-main` 작업 트리의 소스, SQL, Supabase dump, 프로젝트 문서
>
> 범위 주의: 현재 구현은 Phase 1 프로토타입입니다. 화면의 상당수 수치와 워크플로우 상태는 컴포넌트 내부 샘플값이며, 실제 저장·계산·보고서 생성까지 연결된 상태는 아닙니다.

## 1. 전체 아키텍처 한눈에 보기

### 1.1 시스템 성격

- **애플리케이션**: Next.js 15 App Router 기반 단일 웹 애플리케이션
- **UI**: React 19, TypeScript, 순수 CSS(`app/globals.css`), `lucide-react` 아이콘
- **현재 업무 화면**: 전체 현황 → 수요 확정 → 재고·공급 → 마스터 검증 → 발주량 계산 → 보고자료의 단계형 로컬 프로토타입
- **실제 데이터 화면**: `/analysis/leadtime`에서 서버 측 Supabase 조회로 `analytics.v_leadtime_gap`을 표시
- **DB 분석 구조**: `raw` 원본 → `core` 정제·기준 → `analytics` 화면용 뷰
- **DB 입력 구조**: Supabase migration에는 수요 확정용 `public` 테이블 6개가 정의되어 있으나, 현재 React 화면은 해당 테이블을 호출하지 않음
- **배포 대상**: `vercel.json`에 Next.js 프레임워크로 정의된 Vercel 배포 구성

### 1.2 논리 구성

```text
브라우저
  ├─ /                         Next.js 페이지
  │    └─ ProcurementApp       클라이언트 상태 기반 6단계 워크플로우
  │         └─ workflow/*      화면별 샘플 입력·상태·계산 미리보기
  └─ /analysis/leadtime        서버 컴포넌트 분석 화면
       └─ lib/scm.ts            서버 Supabase 조회
            └─ lib/supabase/*  환경변수 기반 클라이언트 생성
                 └─ Supabase analytics.v_leadtime_gap

Supabase dump.sql
  raw 원본 테이블
       ↓ 정규화·품질 판정
  core 뷰/확정 기준 테이블
       ↓ KPI·위험·분석 뷰
  analytics 뷰

Supabase migration
  public.planning_runs
       ├─ public.ol_demand
       ├─ public.sfdc_pipeline
       ├─ public.bulk_deals
       ├─ public.historical_actuals
       └─ public.demand_confirmations
```

### 1.3 현재 연결 상태 요약

| 영역 | 구현 상태 | 근거 |
|---|---|---|
| 초기 페이지 | 연결됨 | `app/page.tsx` → `ProcurementApp` |
| 6단계 워크플로우 | 화면만 구현 | `components/workflow/*.tsx` 내부 상수·React state |
| 수요 저장 | 미연결 | 화면에 “SQLite 저장은 다음 단계” 문구, API 호출 없음 |
| 발주량 계산 | 미연결 | `calculation-step.tsx`의 샘플 테이블, 계산 서비스 없음 |
| 보고서 다운로드 | 미연결 | 버튼 disabled |
| 리드타임 분석 | Supabase 조회 연결 | `app/analysis/leadtime/page.tsx` → `lib/scm.ts` |
| 소진위험 KPI | 조회 함수만 존재 | `getStockoutKpi()`는 있으나 호출 화면 없음 |
| Supabase health | 환경 설정 여부만 확인 | `/api/health/supabase` |

## 2. 각 폴더의 기능 요약

| 폴더 | 기능 요약 |
|---|---|
| `app/` | Next.js App Router의 라우트, 루트 레이아웃, 전역 CSS, health API |
| `app/analysis/` | 실제 Supabase 분석 데이터를 표시하는 서버 렌더링 분석 라우트 |
| `app/api/` | 애플리케이션 상태가 아니라 Supabase 환경 설정 상태를 확인하는 API 라우트 |
| `components/` | 페이지에서 사용하는 UI·업무 화면 컴포넌트 |
| `components/workflow/` | 6단계 월간 발주계획 업무 흐름의 프로토타입 화면 |
| `components/analysis/` | 분석 화면 공통 프레임과 제네릭 표 |
| `lib/` | Supabase 접근, 분석 조회, DB 행 정규화와 타입 |
| `lib/supabase/` | 브라우저/서버 Supabase 클라이언트와 환경변수 처리 |
| `sql/` | Supabase 권한과 RLS 정책 보완 SQL |
| `supabase/` | 로컬 Supabase 설정과 수요확정용 migration |
| `docs/` | 실습 안내와 Superpowers 기반 요구사항·계획 문서 |
| `outputs/` | 프로세스 정의 Excel, 미리보기 이미지 등 생성 산출물 |
| 프로젝트 루트 | 실행 설정, 데이터 dump, 샘플 데이터/워크북 생성 스크립트, 프로젝트 문서 |

`node_modules/`, `.next/`, `.git/` 및 빌드/캐시 산출물은 애플리케이션 소스 구조에서 제외했습니다.

## 3. 각 폴더 안의 주요 파일과 역할 요약

### `app/`

| 파일 | 역할 |
|---|---|
| `app/layout.tsx` | 한국어 HTML 루트와 메타데이터를 설정하고 `globals.css`를 로드 |
| `app/page.tsx` | `/` 진입점. `ProcurementApp` 렌더링 |
| `app/globals.css` | 앱·워크플로우·분석 화면의 전체 스타일과 반응형 규칙 |
| `app/analysis/leadtime/page.tsx` | 공급처별 마스터 리드타임과 실제 P80 격차 분석 화면 |
| `app/api/health/supabase/route.ts` | Supabase 환경변수 존재 여부를 GET으로 반환 |

### `components/`

| 파일 | 역할 |
|---|---|
| `components/procurement-app.tsx` | 클라이언트 앱 셸, 단계 목록, 현재 단계 상태, 단계 이동 제어 |
| `components/analysis/analysis-frame.tsx` | 분석 화면 제목·설명·상태 배지 공통 레이아웃 |
| `components/analysis/data-table.tsx` | 컬럼 정의와 행 배열을 받아 표로 렌더링하는 제네릭 테이블 |
| `components/workflow/step-frame.tsx` | 워크플로우 공통 이전/다음 하단 영역 |
| `components/workflow/dashboard-step.tsx` | 전체 현황과 프로세스 준비 상태 샘플 |
| `components/workflow/demand-step.tsx` | OL, SFDC, Bulk-deal, Trend, 수급회의 입력·검증·확정 미리보기 |
| `components/workflow/supply-step.tsx` | 재고·Open PO 준비 상태 샘플 |
| `components/workflow/master-step.tsx` | 품목·BOM·장착율·MOQ·Lead Time 기준 검증 샘플 |
| `components/workflow/calculation-step.tsx` | 발주량·예외 검토 결과 샘플 |
| `components/workflow/report-step.tsx` | 경영 보고 수치와 Excel/PDF 출력 미리보기 |

### `lib/`

| 파일 | 역할 |
|---|---|
| `lib/scm-model.ts` | `LeadtimeGap` 화면 모델, DB 컬럼 후보 정규화, 안전한 숫자 변환 |
| `lib/scm.ts` | `analytics` 스키마의 리드타임 격차와 소진위험 KPI 조회 함수 |
| `lib/scm-model.test.ts` | 리드타임 행 정규화와 영문/한글 별칭 처리 테스트 |
| `lib/supabase.ts` | Supabase 브라우저·서버 클라이언트와 환경변수 함수의 재-export |
| `lib/supabase/env.ts` | 공개 URL·publishable key 읽기 및 누락 시 오류 처리 |
| `lib/supabase/client.ts` | 클라이언트 컴포넌트용 Supabase 클라이언트 |
| `lib/supabase/server.ts` | 서버 조회용 Supabase 클라이언트. 세션 지속성 비활성화 |

### `sql/` 및 `supabase/`

| 파일 | 역할 |
|---|---|
| `sql/01-grants.sql` | `anon`/`authenticated`에 `core`, `analytics` 사용·조회 권한 부여 |
| `sql/02-policies.sql` | `core.leadtime_plan`, `core.usage_profile`의 수업용 전체 허용 RLS 정책과 쓰기 권한 |
| `supabase/config.toml` | 로컬 Supabase 프로젝트 ID, API, PostgreSQL 15, Studio 설정 |
| `supabase/migrations/20260813000100_create_procurement_demand_core.sql` | 수요확정 입력 저장용 `public` 테이블 6개, 인덱스, `updated_at` 트리거 생성 |

### 루트 주요 파일

| 파일 | 역할 |
|---|---|
| `package.json` | Next.js 실행·빌드·테스트 스크립트와 의존성 |
| `tsconfig.json` | 엄격한 TypeScript, `@/*` 경로 별칭, Next 플러그인 설정 |
| `next.config.ts` | React Strict Mode 활성화 |
| `vercel.json` | Vercel에서 Next.js 프레임워크로 배포 |
| `AGENTS.md` | 프로젝트 작업 규칙, 데이터 계층·환경변수·검증 원칙 |
| `SCHEMA.md` | `raw`/`core`/`analytics` 역할과 주요 뷰 컬럼 계약 |
| `README.md` | 실행 방법, 현재 Phase 1 범위, Supabase 연결 절차 |
| `dump.sql` | `raw`, `core`, `analytics` 스키마·테이블·뷰·샘플 데이터·RLS의 DB dump |
| `build_dummy_demand_data.mjs` | 더미 수요확정 Excel 생성 및 기본 수식 오류 검사 |
| `build_workbook.mjs` | 프로세스 정의서 Excel 생성, 선택 영역 검사, 수식 오류 검사 |
| `.env.example`, `.env.local.example` | Supabase URL과 publishable key의 설정 템플릿 |

## 4. 폴더별·파일별 상세 설명

### 4.1 `app/`: 라우팅과 화면 진입점

`app/layout.tsx`는 모든 라우트의 루트입니다. `lang="ko"`, 제품명 메타데이터, 전역 스타일을 지정합니다. 인증·Provider·DB 초기화 코드는 여기에서 확인되지 않습니다.

`app/page.tsx`는 별도 데이터 로딩 없이 `ProcurementApp`만 렌더링합니다. 따라서 첫 화면의 표시값은 Supabase 조회 결과가 아니라 클라이언트 컴포넌트에 의해 결정됩니다.

`app/analysis/leadtime/page.tsx`는 `dynamic = 'force-dynamic'`을 지정한 async 서버 컴포넌트입니다. `getLeadtimeGap()` 결과를 오류/정상으로 나눠 표시하고, 행 수·양의 격차 수·표본 부족 수를 화면에서 집계합니다. 실제 DB 필드와 화면 필드 사이의 변환은 `lib/scm-model.ts`가 담당합니다.

`app/api/health/supabase/route.ts`는 DB에 접속하거나 쿼리하지 않습니다. 환경변수 두 개가 있는지만 확인하므로, `configured: true`가 실제 네트워크 연결·권한·뷰 존재를 보장하지는 않습니다.

### 4.2 `components/procurement-app.tsx`: 클라이언트 워크플로우 조정자

`'use client'` 컴포넌트이며 `StepId` 유니온으로 6개 단계를 정의합니다. `active` 상태와 현재 인덱스로 사이드바·상단 진행 표시·이전/다음 이동을 동기화합니다. `useMemo`의 switch가 현재 단계에 해당하는 화면을 선택합니다.

`dashboard`는 별도 `onBack` 없이 시작·카드 클릭으로 다른 단계를 열고, 분석 화면은 Next.js `Link`로 `/analysis/leadtime`에 연결됩니다. 워크플로우 단계 간 데이터 저장소나 전역 업무 객체는 현재 존재하지 않으므로, 단계 이동만으로 입력 내용이 서비스 계층에 저장되지는 않습니다.

### 4.3 `components/workflow/`: 업무 단계 상세

- `dashboard-step.tsx`: 2026.09 계획, 총 발주금액, 수요 상태, 예외 건수 등 하드코딩된 샘플 지표를 표시합니다. 체크리스트와 계획 목록도 정적 배열/마크업입니다.
- `demand-step.tsx`: 유일하게 상당한 클라이언트 상호작용을 포함합니다. 월 변경, OL 행 추가·수정, SFDC 수량/확률 수정, Bulk 상태·사전재고 토글, 회의 정보 수정, 검증·확정 상태를 React state로 관리합니다. `confirmedDemand`는 `OL 합계 + SFDC 수량×확률 + Bulk 수량×반영률`로 계산되며, 이 계산은 화면 코드에 직접 있습니다. 저장 버튼은 DB/API가 아니라 `confirmed` state와 안내 문구만 변경합니다.
- `supply-step.tsx`: 재고·Open PO·공급망 입력 항목의 샘플값을 표시합니다. 실제 재고나 PO 조회는 없습니다.
- `master-step.tsx`: 계산에 필요한 기준 항목을 정적 목록으로 표시합니다. Lead Time만 입력 필요 상태로 시각화하며, 실제 마스터 검증 로직은 없습니다.
- `calculation-step.tsx`: 기기/옵션/부품의 샘플 계산 결과와 Flex·MOQ·납기 예외를 표시합니다. 계산 서비스, DB 쓰기, 수동 조정 저장은 연결되어 있지 않습니다.
- `report-step.tsx`: 발주금액 비교와 보고서 미리보기를 정적 화면으로 표시합니다. Excel/PDF 버튼은 disabled입니다.
- `step-frame.tsx`: 모든 단계 화면에 공통 하단 네비게이션과 Phase 1 안내를 제공합니다.

### 4.4 `components/analysis/`: DB 분석 화면 공통 UI

`analysis-frame.tsx`는 제목·설명·`SUPABASE LIVE` 배지를 감싸는 표현 계층입니다. `data-table.tsx`는 `Column<T>`의 `key`, `label`, 정렬, 사용자 렌더러를 받아 행을 그립니다. `formatNumber()`는 null을 `—`, 정수를 정수 표기, 소수를 소수 첫째 자리로 표현합니다. 표의 데이터 정합성·정렬·페이징은 담당하지 않습니다.

### 4.5 `lib/`: 조회와 모델 경계

`lib/scm.ts`는 화면이 Supabase를 직접 호출하지 않도록 조회를 모읍니다. `getLeadtimeGap()`은 `analytics.v_leadtime_gap` 전체를 읽어 `normalizeLeadtimeGap()`으로 변환하고, 조회 오류와 예외를 `{ rows, error }` 형태로 반환합니다. `getStockoutKpi()`는 `analytics.v_stockout_kpi`에서 단일 행을 읽지만 현재 호출하는 페이지는 없습니다.

`lib/scm-model.ts`의 `value()`는 여러 컬럼 후보 중 첫 유효값을 선택하고, `numberValue()`는 숫자 변환 실패를 null로 바꿉니다. 이는 뷰 컬럼명이 달라져도 화면 모델을 유지하기 위한 호환 계층입니다. 현재 테스트는 영문 실제 컬럼, 별칭, 한글 컬럼과 기본값을 검증합니다.

`lib/supabase/env.ts`는 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 사용합니다. `requireSupabaseEnv()`는 누락 시 한국어 오류를 던집니다. `client.ts`는 브라우저용 기본 Supabase client를 만들고, `server.ts`는 동일 publishable key로 세션 지속·자동 갱신을 끈 읽기 중심 client를 만듭니다. 서버 client에 사용자 세션·쿠키 연동은 구현되어 있지 않습니다.

### 4.6 `dump.sql`: 분석 데이터 계층의 실제 정의

`dump.sql`은 다음 계층을 정의합니다.

1. `raw`: `shipment_log`, `supplier_master`, `item_master`, `inventory`, `usage_history`, `forecast`, `goods_receipt`, `purchase_order` 등 원본 테이블
2. `core`: 정제·품질·기준 적용 뷰와 확정 입력 테이블
3. `analytics`: UI/AI가 소비할 리드타임·소진위험·사용량 분석 뷰

주요 흐름은 다음과 같습니다.

```text
raw.shipment_log
  → core.v_fact_shipment       코드/운송수단 정규화, 구간일수, 품질 플래그
  → core.v_shipment_valid       완료·정상·양수 리드타임만 통과
  → core.v_leadtime_stat        공급처별 평균·P50/P80/P90·표본 신뢰도
  → analytics.v_leadtime_gap    마스터 표준값과 P80의 차이
```

재고 소진 흐름은 다음과 같습니다.

```text
raw.item_master → core.v_item_master
raw.inventory   → core.v_stock_on_hand
raw.shipment_log(IN_TRANSIT) → core.v_inbound_qty
raw.usage_history → core.v_usage_effective
core.leadtime_plan → core.v_leadtime_effective
        ↓
analytics.v_stockout_risk → analytics.v_stockout_kpi
```

`v_stockout_risk`는 `available_qty = current_stock + inbound_qty`, `stockout_days = available_qty / daily_usage_avg`를 계산하고, 사용량 또는 리드타임이 없으면 UNKNOWN과 사유 코드를 반환합니다. `v_usage_anomaly`는 평균 대비 3표준편차 초과 또는 음수 사용량을 찾고 RETURN/PROJECT/UNEXPLAINED로 분류합니다. `v_usage_profile`은 변동계수에 따라 안정성 문구를 붙입니다.

### 4.7 `supabase/migrations/`: 수요확정 저장 모델

migration은 `public.planning_runs`를 부모로 하여 OL, SFDC pipeline, Bulk deal, 과거 실적, 수요 확정 결과를 저장하는 테이블을 생성합니다. 모든 자식 테이블은 `planning_run_id` 외래키와 인덱스를 가지며, 수정 시각 자동 갱신을 위한 `set_updated_at()` 트리거가 있습니다.

이 모델은 `dump.sql`의 `raw/core/analytics` 분석 모델과 별도의 축입니다. 현재 소스에서 이 `public` 테이블을 읽거나 쓰는 조회 함수/API/서버 액션은 확인되지 않았습니다. 따라서 “migration에 저장 구조가 정의되어 있다”와 “화면이 실제 저장한다”는 서로 다른 사실입니다.

### 4.8 권한과 보안

`dump.sql`에는 raw 및 core 입력 테이블의 RLS 활성화가 포함되어 있습니다. `sql/01-grants.sql`은 `anon`과 `authenticated`에 `core`·`analytics` 사용/조회 권한을 주고, raw는 의도적으로 공개하지 않습니다. `sql/02-policies.sql`은 수업용으로 `core.leadtime_plan`, `core.usage_profile`을 누구나 전체 조작할 수 있게 하므로 운영 환경에는 부적합하며, 파일 주석도 `auth.uid()` 기반 제한이 필요하다고 명시합니다.

현재 인증 코드가 없고 publishable key가 브라우저 사용을 전제로 하므로, 운영 적용 시 RLS 정책·인증·쓰기 경로를 별도로 강화해야 합니다. 이 문서는 보안 개선을 구현한 것이 아니라 현재 상태를 기록한 것입니다.

## 5. 주요 실행 흐름·데이터 흐름·의존관계

### 5.1 브라우저 초기 실행

1. Next.js가 `app/layout.tsx`로 HTML 루트와 전역 CSS를 준비합니다.
2. `/`의 `app/page.tsx`가 `ProcurementApp`을 렌더링합니다.
3. `ProcurementApp`이 기본 `active = 'dashboard'`로 시작합니다.
4. 사용자가 사이드바, 진행 표시, 카드, 이전/다음 버튼으로 단계 상태를 바꿉니다.
5. 각 화면은 자체 샘플값 또는 로컬 React state를 사용합니다.

### 5.2 리드타임 분석 조회

1. 사용자가 워크플로우의 “분석” 링크로 `/analysis/leadtime`에 이동합니다.
2. 서버 컴포넌트가 `getLeadtimeGap()`을 호출합니다.
3. `createSupabaseServerClient()`가 환경변수로 client를 생성합니다.
4. `analytics.v_leadtime_gap`를 `select('*')`로 조회합니다.
5. 각 행을 `normalizeLeadtimeGap()`으로 화면 모델에 매핑합니다.
6. 페이지가 오류 카드 또는 KPI 카드와 `DataTable`을 렌더링합니다.

### 5.3 수요 확정 프로토타입 흐름

```text
월 선택
  → OL 샘플 행 재생성
  → OL/SFDC/Bulk 입력 state 수정
  → OL 오류 수 계산
  → 검증 실행
  → 확정 버튼
  → confirmed state와 안내 문구만 변경
```

실제 `public.demand_confirmations` insert, `planning_runs.status` 갱신, 파일 업로드, 사용자/감사 이력 기록은 코드에서 확인되지 않습니다.

### 5.4 의존관계

```text
app/page.tsx
  → components/procurement-app.tsx
       → components/workflow/*.tsx
       → /analysis/leadtime Link

app/analysis/leadtime/page.tsx
  → components/analysis/analysis-frame.tsx
  → components/analysis/data-table.tsx
  → lib/scm.ts
       → lib/supabase/server.ts
       → lib/scm-model.ts

app/api/health/supabase/route.ts
  → lib/supabase/env.ts
```

DB 내부에서는 `raw`가 입력, `core`가 정제·기준, `analytics`가 소비 계층입니다. `analytics` 뷰가 raw를 직접 읽는 일부 정의도 있으나, 애플리케이션 화면은 `analytics`만 조회하도록 설계되어 있습니다.

## 6. 진입점·설정·DB·API·서비스 계층 등 핵심 구조

### 6.1 진입점

| 종류 | 진입점 |
|---|---|
| 웹 루트 | `app/page.tsx` |
| HTML/메타데이터 | `app/layout.tsx` |
| 분석 라우트 | `app/analysis/leadtime/page.tsx` |
| health API | `app/api/health/supabase/route.ts`의 `GET()` |
| 개발 서버 | `npm run dev` → `next dev` |
| 운영 빌드 | `npm run build` → `next build` |
| 테스트 | `npm test` → `node --test "lib/**/*.test.ts"` |

### 6.2 설정

- TypeScript path alias `@/*`는 프로젝트 루트로 매핑됩니다.
- `next.config.ts`는 React Strict Mode만 활성화합니다.
- Supabase 연결에는 URL과 publishable key가 필요합니다.
- `supabase/config.toml`의 로컬 프로젝트 ID는 `procurement-planning`입니다.
- `vercel.json`은 Next.js 배포 프레임워크만 명시합니다. 런타임 환경변수·도메인·보안 설정은 이 저장소에서 확인되지 않습니다.

### 6.3 DB·서비스 계층

현재 서비스 계층은 얇습니다. `lib/scm.ts`가 유일한 명시적 도메인 조회 계층이며, 리드타임 정규화는 `lib/scm-model.ts`에 있습니다. 발주량 계산 도메인 서비스, 수요 확정 저장 서비스, 보고서 생성 서비스, 파일 업로드 서비스는 아직 구현되지 않았습니다.

DB는 분석 계산을 SQL 뷰에 두는 방향입니다. 특히 `core.v_leadtime_effective`는 확정된 계획 리드타임이 있으면 그것을, 없으면 실적 P80을 사용하며, `analytics.v_stockout_risk`는 그 결과를 사용합니다. 따라서 `core.leadtime_plan`의 값 변경은 애플리케이션 코드 변경 없이 소진위험 결과를 바꿉니다.

### 6.4 현재 확인된 불명확·추가 확인 필요 사항

- **대상 프로젝트 경로**: 실행 컨텍스트의 projectless 작업 폴더에는 소스가 없었고, 상위 경로에서 확인된 `Desktop/superSCM-main`을 분석 대상으로 삼았습니다.
- **배포 프로젝트 연결**: `vercel.json`은 있으나 실제 Vercel 프로젝트 ID·배포 URL은 파일에서 확인되지 않습니다.
- **Supabase 원격 상태**: 로컬 `dump.sql`과 migration의 정의는 확인했지만 원격 DB가 어느 파일을 실제 적용했는지는 확인할 수 없습니다.
- **dump와 migration의 통합**: dump는 `raw/core/analytics`, migration은 `public` 수요 테이블을 사용합니다. 두 모델을 어떤 배포 순서와 애플리케이션 서비스로 통합할지는 코드에 구현되어 있지 않습니다.
- **인증/권한 운영 정책**: 인증 Provider와 사용자별 권한 모델은 없습니다. `sql/02-policies.sql`의 수업용 전체 허용 정책을 운영에 사용할 수 없습니다.
- **실제 발주 계산식**: `calculation-step.tsx`는 샘플 결과만 표시하며, PRD·Excel·DB 중 어느 것이 최종 계산 규칙의 실행 기준인지 코드 서비스로 고정되어 있지 않습니다.
- **파일 업로드/보고서 출력**: UI 버튼과 생성 스크립트는 있지만 웹 사용자 입력을 DB로 적재하거나 Excel/PDF를 다운로드하는 연결은 확인되지 않습니다.
- **날짜 기준**: 워크플로우 샘플은 2026.09를 표시하고 `demand-step.tsx` 샘플 월은 2025-01~2025-12를 사용합니다. 실제 업무 기준월의 단일 출처는 아직 없습니다.

## 7. 구현 범위와 다음 연결 지점

현재 구조를 실제 시스템으로 확장할 때의 자연스러운 연결 지점은 다음과 같습니다.

1. `lib/scm-model.ts`에 수요·재고·발주계산 모델과 정규화 타입을 추가합니다.
2. `lib/scm.ts`에 `public` 입력 테이블 및 `analytics` 뷰 조회/저장 함수를 추가합니다.
3. `components/workflow/*`의 샘플 state를 서버 조회 결과와 명시적 저장 액션으로 교체합니다.
4. 계산식은 화면 컴포넌트가 아니라 DB 뷰 또는 별도 순수 모델/서비스로 이동합니다.
5. `planning_runs`를 워크플로우 전체의 기준 키로 연결하고 각 단계 완료 시 상태를 갱신합니다.
6. 인증·RLS·감사 이력을 운영 요구사항에 맞게 정의한 뒤 수업용 전체 허용 정책을 제거합니다.

