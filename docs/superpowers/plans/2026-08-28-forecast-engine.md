# Forecast Engine Baseline(SQL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학습 데이터만 사용하는 SQL Baseline Forecast 실행 파이프라인과 모델·버전·결과·stale 이력 화면을 구축한다.

**Architecture:** 기존 `core.forecast_run`을 ALTER로 확장하고 `model_config`, `model_version`, `forecast_result`를 추가한다. PostgreSQL 함수가 forecast 설정·활성 모델·학습 Grid를 읽어 모델별 결과와 residual sigma를 저장하며, Next.js는 analytics View만 조회한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase PostgreSQL, 순수 CSS, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-28-forecast-engine-design.md` (STEP 6 승인 설계; 구현 전 생성)

## Global Constraints

- Forecast 계산은 `core.v_train_demand` 또는 학습 Grid만 사용한다.
- `raw.usage_history`, `core.v_test_actual`, test actual, 미래 보정은 사용하지 않는다.
- 모델 parameters와 enabled 상태는 DB의 `core.model_config`에서 관리한다.
- 모든 결과는 `run_id`, `model_id`, `model_version`을 가진다.
- 계산 불가 값은 0으로 치환하지 않고 `NULL + reason_code` 또는 결과 행 미생성으로 처리한다.
- 화면은 Forecast를 실행하지 않고 analytics View에 저장된 결과만 조회한다.
- 기존 테이블을 drop/recreate하지 않고 ALTER/CREATE 방식으로 확장한다.

---

### Task 1: Model Registry and Forecast SQL Pipeline

**Files:**
- Create: `docs/superpowers/specs/2026-08-28-forecast-engine-design.md`
- Create: `supabase/migrations/20260828000800_create_forecast_engine.sql`
- Test: `lib/forecast-engine-sql.test.ts`

**Interfaces:**
- Consumes: `core.v_train_demand`, `core.v_sku_demand_profile`, `core.forecast_setting`, existing `core.forecast_run`
- Produces: `core.model_config`, `core.model_version`, extended `core.forecast_run`, `core.forecast_result`, `core.run_baseline_forecast()` and four analytics Views

- [ ] **Step 1: Write failing SQL contract tests**

Assert registry columns, five model IDs, snapshot/result columns, function name, status values, all analytics View names, and no direct `raw.usage_history`/`core.v_test_actual` forecast source.

- [ ] **Step 2: Run focused test and verify expected failure**

Run: `node --test lib/forecast-engine-sql.test.ts`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Add registry, result tables, defaults, RLS, and SQL function**

Register `MA_3M`, `MA_6M`, `WMA_3M`, `PY_SAME_MONTH`, `SEASONAL_NAIVE` with DB parameters: lookback, weights `3:2:1`, seasonal lag `12`, and z-scores `0.841621`/`1.281552`. Build monthly training Grid from `core.v_train_demand`, fit historical forecasts only where enough prior actual periods exist, compute residual sigma with at least two residuals, and generate horizon periods from `train_end` and `forecast_horizon`. Save RUNNING → snapshots → results → SUCCESS; catch errors and save FAILED. Use `SECURITY DEFINER`, `core.is_admin()`, and a fixed allowed-model registry without dynamic raw writes from the client.

- [ ] **Step 4: Run focused test and verify pass**

Run: `node --test lib/forecast-engine-sql.test.ts`

Expected: PASS with exact baseline IDs and no forbidden data source.

- [ ] **Step 5: Commit SQL pipeline**

```bash
git add docs/superpowers/specs/2026-08-28-forecast-engine-design.md supabase/migrations/20260828000800_create_forecast_engine.sql lib/forecast-engine-sql.test.ts
git commit -m "STEP 6 SQL Forecast Engine 기반 추가"
```

### Task 2: Forecast Model and Query Boundary

**Files:**
- Modify: `lib/scm-model.ts`
- Modify: `lib/scm.ts`
- Create: `lib/forecast-engine.ts`
- Test: `lib/forecast-engine-model.test.ts`

**Interfaces:**
- Consumes: analytics View contracts from Task 1
- Produces: typed normalization, `getModelConfigs()`, `getForecastRuns()`, `getForecastResults()`, and `runBaselineForecast()` server boundary

- [ ] **Step 1: Write failing normalization and source-boundary tests**

Cover nullable P50/P80/P90/sigma, model version, stale, and server action calling `requireAdmin` before RPC.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test lib/forecast-engine-model.test.ts`

Expected: FAIL because the new types and query boundary are absent.

- [ ] **Step 3: Implement typed analytics queries and ADMIN RPC wrapper**

Preserve nulls, query only `analytics.v_model_config`, `analytics.v_forecast_run`, `analytics.v_forecast_result`, and `analytics.v_forecast_run_kpi`, and call `core.run_baseline_forecast` only after `requireAdmin()`.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `node --test lib/forecast-engine-model.test.ts`

Expected: PASS without React-side forecast math.

- [ ] **Step 5: Commit boundary code**

```bash
git add lib/scm-model.ts lib/scm.ts lib/forecast-engine.ts lib/forecast-engine-model.test.ts
git commit -m "STEP 6 Forecast 조회 경계 추가"
```

### Task 3: Admin Model and Run Screens

**Files:**
- Create: `app/(admin)/admin/forecast-models/page.tsx`
- Create: `app/(admin)/admin/forecast-runs/page.tsx`
- Create: `app/(admin)/admin/forecast-runs/actions.ts`
- Modify: `lib/menu.ts`
- Modify: `styles/components.css` only if needed
- Test: `lib/forecast-engine-screen.test.ts`

**Interfaces:**
- Consumes: Task 2 query functions and shared `Topbar`, `Sidebar`, `Panel`, `Badge`, `EmptyValue`
- Produces: ADMIN-only model configuration and run-history routes

- [ ] **Step 1: Write failing route/menu contract tests**

Assert both routes, ADMIN auth, model fields, run fields, stale label, and execute action are present.

- [ ] **Step 2: Run focused test and verify failure**

Run: `node --test lib/forecast-engine-screen.test.ts`

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement screens and execute action**

Render stored model parameters and enabled/applicable types; provide ADMIN-only enable/disable and parameter update through a server action with audit logging. Provide ADMIN-only “Baseline Forecast 실행” that calls the RPC, plus run/result/stale summaries. Never calculate forecast values in components.

- [ ] **Step 4: Run focused test and verify pass**

Run: `node --test lib/forecast-engine-screen.test.ts`

Expected: PASS and menus are ADMIN-only.

- [ ] **Step 5: Commit screens**

```bash
git add app/(admin)/admin/forecast-models app/(admin)/admin/forecast-runs lib/menu.ts styles/components.css lib/forecast-engine-screen.test.ts
git commit -m "STEP 6 Forecast 관리자 화면 추가"
```

### Task 4: Live Apply, Verification, Tests, Build, Push

**Files:**
- Modify: `error.md` only if a new Supabase/build error occurs

**Interfaces:**
- Consumes: migration and application routes from Tasks 1–3
- Produces: live SQL objects, verified run behavior, green test/build, pushed main branch

- [ ] **Step 1: Run full tests and build**

Run: `npm test` and `npm run build`; expect all tests pass and the two admin routes appear.

- [ ] **Step 2: Apply migration in Supabase SQL Editor**

Execute the complete migration without modifying raw data.

- [ ] **Step 3: Read-only verify registry, run, result, and stale Views**

Check five models, parameters, RLS grants, View columns, and initial run state. If forecast dates are not configured, do not invent dates; record the operational prerequisite.

- [ ] **Step 4: Execute one ADMIN baseline run when settings are configured**

Verify RUNNING→SUCCESS, model snapshots, result rows, null behavior for unavailable models, and stale behavior after a newer data snapshot.

- [ ] **Step 5: Push verified commits**

```bash
git status --short
git push origin main
```
