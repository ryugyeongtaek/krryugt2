# STEP 9 Inventory Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** STEP 7 Champion Forecast, 재고, 입고예정, 확정수주, 가예약과 Effective Lead Time을 SQL로 결합해 기간별 재고 전망과 소진 위험을 제공한다.

**Architecture:** 기존 raw 입력 구조는 보존하고, core에 리드타임 정책/이력과 관리자 RPC를 추가한다. analytics 뷰가 forecast 결과와 운영 데이터를 결합해 재귀적 inventory projection 및 최신 stockout summary를 계산하며, Next.js는 analytics 조회와 관리자 정책 변경만 담당한다.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL/Supabase SQL, 순수 CSS, Node test runner.

**Spec:** 사용자 제공 STEP 9 요구사항

## Global Constraints

- Forecast와 Inventory Projection 계산은 SQL에서만 수행한다.
- raw 테이블을 drop/recreate하지 않고 기존 컬럼과 명명 규칙을 보존한다.
- 계산 불가 값은 null과 reason_code로 남기며 임의의 0/기본 리드타임/날짜를 만들지 않는다.
- 화면은 analytics 뷰를 조회하고 서버에서 ADMIN 권한을 확인한다.
- Tailwind, styled-components, CSS Modules를 추가하지 않는다.

### Task 1: SQL projection foundation

**Files:** Create `supabase/migrations/20260828001200_create_inventory_projection.sql`; Test `lib/inventory-projection-sql.test.ts`.

- [ ] failing static tests for policy history, champion forecast source, recursive projection, reason codes, and replacement stockout view
- [ ] create `core.leadtime_policy`, `core.leadtime_policy_history`, policy RPC, analytics policy view
- [ ] create `analytics.v_champion_forecast`, `analytics.v_inventory_projection`, `analytics.v_stockout_risk`, `analytics.v_stockout_kpi`
- [ ] grant authenticated reads and ADMIN-only policy RPC/RLS
- [ ] verify SQL syntax through Supabase SQL Editor and query view columns

### Task 2: typed server access

**Files:** Modify `lib/scm-model.ts`, `lib/scm.ts`; Test `lib/scm-model.test.ts`.

- [ ] extend nullable stockout types and normalize new status/reason fields
- [ ] add `getInventoryProjections` and `getLeadtimePolicies` analytics queries

### Task 3: administrator lead-time screen

**Files:** Create `app/(admin)/admin/scm-policies/lead-time/page.tsx`, `app/(admin)/admin/scm-policies/lead-time/actions.ts`; Modify `lib/menu.ts`; Test `lib/leadtime-policy-screen.test.ts`.

- [ ] render item/supplier actual P50/P80/P90, confirmed/effective values and history
- [ ] call `requireAdmin` and policy RPC; require positive value and reason
- [ ] expose the route through the centralized ADMIN menu

### Task 4: projection screen integration

**Files:** Modify `app/analysis/stockout/page.tsx`; Test `lib/stockout-page.test.ts`.

- [ ] render projection fields and new four-state badge
- [ ] preserve `/analysis/stockout` route and distinguish query errors from empty data
- [ ] remove copy describing average-usage-only calculation

### Task 5: verification

- [ ] run focused tests, full `npm test`, and `npm run build`
- [ ] apply migration and run validation queries for view existence, null reasons, and projection source
- [ ] inspect git diff and report any data/config limitation
