# SKU Demand Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학습 구간 전용 SQL 계산으로 SKU별 수요 패턴을 분류하고 `/analysis/demand-profile`에서 조회·필터링한다.

**Architecture:** `core.v_train_demand`를 유일한 입력으로 월간 기간 Grid와 SKU 통계를 SQL CTE로 계산한다. `analytics` View가 결과와 KPI를 제공하고, Next.js 서버 페이지는 View를 조회해 공통 분석 프레임과 클라이언트 필터 테이블에 전달한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase PostgreSQL, 순수 CSS, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-28-sku-demand-profile-design.md`

## Global Constraints

- Demand Profile은 `core.v_train_demand`만 사용한다.
- `raw.usage_history`와 `core.v_test_actual`은 계산 경로에 사용하지 않는다.
- 모든 수요 패턴 계산은 SQL에서 수행한다.
- 계산 불가 값은 임의 숫자가 아닌 `NULL + reason_code`로 반환한다.
- React/TypeScript에서는 통계를 재계산하지 않고 저장된 analytics 결과만 필터링한다.
- 새 CSS 프레임워크와 기존 raw 테이블 drop/recreate를 사용하지 않는다.
- 화면 문구와 주석은 한국어, DB 코드값은 `SMOOTH`, `INTERMITTENT`, `ERRATIC`, `LUMPY`를 사용한다.

---

### Task 1: SQL Demand Profile View

**Files:**
- Create: `supabase/migrations/20260828000700_create_demand_profile.sql`
- Test: `lib/demand-profile-sql.test.ts`

**Interfaces:**
- Consumes: `core.v_train_demand`, `core.forecast_setting`, `core.v_item_master`
- Produces: `analytics.v_sku_demand_profile`, `analytics.v_demand_profile_kpi`

- [ ] **Step 1: Write failing SQL contract tests**

Assert that the migration contains both View names, only references `core.v_train_demand` for demand input, contains all required columns, exact SBC thresholds, 24-month seasonality guard, and authenticated SELECT grants.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test lib/demand-profile-sql.test.ts`

Expected: FAIL because the migration and View contract do not exist.

- [ ] **Step 3: Create the migration**

Build CTEs in this order: `settings`, `periods`, `items`, `observed_months`, `grid`, `stats`, `classified`. Use `date_trunc('month', train_start)` through `date_trunc('month', train_end)` for the Grid. Keep `is_gap_period` separate from source null quantities. Use `stddev_samp` only when positive observations are at least two, `regr_slope` only when Grid periods are at least two, and earliest `peak_period` on ties. Return `NULL` reason codes for unavailable calculations. Apply the four exact SBC branches and aggregate the KPI View.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test lib/demand-profile-sql.test.ts`

Expected: PASS with no direct raw usage source in the profile View.

- [ ] **Step 5: Commit the SQL layer**

```bash
git add supabase/migrations/20260828000700_create_demand_profile.sql lib/demand-profile-sql.test.ts
git commit -m "STEP 5 SKU 수요 프로파일 SQL 계산 추가"
```

### Task 2: Model and Query Boundary

**Files:**
- Modify: `lib/scm-model.ts`
- Modify: `lib/scm.ts`
- Test: `lib/demand-profile-model.test.ts`

**Interfaces:**
- Consumes: the analytics View column contract from Task 1
- Produces: `DemandProfileRow`, `DemandProfileKpi`, `getDemandProfiles()`, `getDemandProfileKpi()`

- [ ] **Step 1: Write failing normalization tests**

Cover all four DB code values, nullable ADI/CV²/trend/seasonality, `reason_code`, and KPI counts without calculating values in TypeScript.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `node --test lib/demand-profile-model.test.ts`

Expected: FAIL because the profile model and query functions are not defined.

- [ ] **Step 3: Add types, normalization, and analytics-only queries**

Use a `value(row, candidates)` helper consistent with existing `scm-model.ts`. Query only `analytics.v_sku_demand_profile` and `analytics.v_demand_profile_kpi`, preserving `null` values and distinguishing query errors from empty data.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `node --test lib/demand-profile-model.test.ts`

Expected: PASS with no `raw.usage_history` or `core.v_test_actual` reference in the new application query code.

- [ ] **Step 5: Commit the model boundary**

```bash
git add lib/scm-model.ts lib/scm.ts lib/demand-profile-model.test.ts
git commit -m "STEP 5 수요 프로파일 조회 모델 추가"
```

### Task 3: Demand Profile Screen and Filters

**Files:**
- Create: `components/analysis/demand-profile-table.tsx`
- Create: `app/analysis/demand-profile/page.tsx`
- Modify: `lib/menu.ts`
- Modify: `styles/components.css` only if an existing class is insufficient

**Interfaces:**
- Consumes: `getDemandProfiles()`, `getDemandProfileKpi()`, `DemandProfileRow`, shared `AnalysisFrame`, `Badge`, `EmptyValue`, `Panel`
- Produces: `/analysis/demand-profile` route and USER/ADMIN menu item

- [ ] **Step 1: Write the route/menu contract test**

Assert the menu includes `/analysis/demand-profile` for both roles, the page calls `getDemandProfiles`, and the client table does not contain ADI, CV, trend, or seasonality calculations.

- [ ] **Step 2: Run the test and confirm failure**

Run: `node --test lib/demand-profile-screen.test.ts`

Expected: FAIL because the route and table do not exist.

- [ ] **Step 3: Implement server page and filter table**

The server page authenticates with `requireUser`, fetches analytics rows and KPI in parallel, and distinguishes errors from empty results. The client table filters stored rows by Demand Type, calculation availability, and SKU substring. Render nullable metrics with `EmptyValue`; render Demand Type with the shared Badge mapping while keeping DB codes separate from Korean labels.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `node --test lib/demand-profile-screen.test.ts`

Expected: PASS and route/menu contract is satisfied.

- [ ] **Step 5: Commit the screen**

```bash
git add components/analysis/demand-profile-table.tsx app/analysis/demand-profile/page.tsx lib/menu.ts styles/components.css lib/demand-profile-screen.test.ts
git commit -m "STEP 5 SKU 수요 프로파일 화면 추가"
```

### Task 4: Live Supabase Verification and Regression Tests

**Files:**
- Modify: `lib/forecast-model.test.ts` or create `lib/demand-profile-live-contract.test.ts`
- Modify: `error.md` only if a new execution error occurs

**Interfaces:**
- Consumes: Task 1 View objects and existing Supabase session
- Produces: verified live View/KPI results and documented limitations

- [ ] **Step 1: Run the full local test suite**

Run: `npm test`

Expected: all existing tests and Demand Profile tests pass.

- [ ] **Step 2: Apply the migration in Supabase SQL Editor**

Run the complete `20260828000700_create_demand_profile.sql` once in the target project. Do not alter raw data.

- [ ] **Step 3: Run read-only verification queries**

Check View columns, profile row count, KPI counts, `demand_type` values, `seasonality IS NULL` with `INSUFFICIENT_PERIODS`, and that profile rows fall within the configured train boundaries. Confirm no test-period rows enter the View.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: exit code 0 and `/analysis/demand-profile` listed as a dynamic route.

- [ ] **Step 5: Commit any test-only documentation and push**

```bash
git status --short
git push origin main
```

Do not claim completion unless the test command exits with zero and the build output confirms the route.
