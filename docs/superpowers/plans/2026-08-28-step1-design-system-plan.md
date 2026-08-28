# STEP 1 SCM Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앞으로 추가될 SCM 화면이 동일한 토큰, 공통 UI, 메뉴 정의와 route group 구조를 사용하도록 STEP 1 기반을 만든다.

**Architecture:** 화면 색상과 간격은 CSS 변수로 중앙화하고, shell과 UI 컴포넌트는 순수 CSS 파일을 사용한다. 메뉴는 `lib/menu.ts`의 역할별 정의를 소비하며, 기존 workflow는 `/workflow` 레거시 route로 격리한다. Lead Time과 Stockout은 새 UI 컴포넌트로 공통 재사용성을 검증한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, 순수 CSS, Node test runner, lucide-react.

**Spec:** `design.md` 및 사용자 제공 STEP 1 요구사항

## Global Constraints

- Tailwind, styled-components, CSS Modules를 추가하지 않는다.
- 화면 컴포넌트에 hex 색상을 하드코딩하지 않는다.
- 계산 로직과 기존 DB 조회 로직을 변경하지 않는다.
- 계산 불가 값은 0이 아니라 `— + reason_code` 형식으로 표시한다.
- 화면 문구와 주석은 한국어를 사용한다.
- 완료 전 `npm test`와 `npm run build`를 실행한다.

### Task 1: 테스트 기준과 메뉴 모델

**Files:**
- Create: `lib/menu.test.ts`
- Create: `lib/menu.ts`
- Create: `lib/ui-model.test.ts`
- Create: `lib/ui-model.ts`

- [x] **Step 1: Write failing tests** for USER/ADMIN menu separation and nullable value formatting.
- [x] **Step 2: Run `npm test` and confirm the new tests fail because modules are missing.**
- [x] **Step 3: Implement typed menu definitions and `formatEmptyValue(value, reasonCode)`.**
- [x] **Step 4: Run `npm test` and confirm all tests pass.**

### Task 2: CSS token and style separation

**Files:**
- Modify: `app/globals.css`
- Create: `styles/shell.css`
- Create: `styles/components.css`
- Create: `styles/chart.css`

- [x] **Step 1: Define light canvas/surface tokens, primary green scale, state colors, spacing, radii and typography in `app/globals.css`.**
- [x] **Step 2: Add shell layout and navigation styles to `styles/shell.css`.**
- [x] **Step 3: Add card, panel, button, badge, table, alert and empty-value styles to `styles/components.css`.**
- [x] **Step 4: Add chart surface and data visualization primitives to `styles/chart.css`.**
- [x] **Step 5: Import the three style files from `app/globals.css` and preserve only compatibility base rules there.**

### Task 3: Shared shell and UI components

**Files:**
- Create: `components/shell/sidebar.tsx`
- Create: `components/shell/topbar.tsx`
- Create: `components/shell/page-header.tsx`
- Create: `components/ui/kpi-card.tsx`
- Create: `components/ui/panel.tsx`
- Create: `components/ui/badge.tsx`
- Create: `components/ui/button.tsx`
- Create: `components/ui/data-table.tsx`
- Create: `components/ui/alert-row.tsx`
- Create: `components/ui/insight-banner.tsx`
- Create: `components/ui/empty-value.tsx`

- [x] **Step 1: Implement typed status and variant props without adding calculation logic.**
- [x] **Step 2: Implement `EmptyValue` using the tested `formatEmptyValue` helper.**
- [x] **Step 3: Implement generic table rendering with right-aligned numeric cells and accessible headers.**
- [x] **Step 4: Implement shell components that consume `lib/menu.ts` rather than defining menu labels locally.**

### Task 4: Route groups and legacy isolation

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(user)/layout.tsx`
- Create: `app/(admin)/layout.tsx`
- Create: `app/(legacy)/workflow/page.tsx`
- Modify: `app/page.tsx`

- [x] **Step 1: Add lightweight route-group layouts with no duplicate DB or calculation logic.**
- [x] **Step 2: Move workflow entry rendering to `/workflow` under `(legacy)`.**
- [x] **Step 3: Redirect `/` to `/workflow` to preserve the existing entry point.**

### Task 5: Analysis migration and verification

**Files:**
- Modify: `components/analysis/analysis-frame.tsx`
- Modify: `components/analysis/data-table.tsx`
- Modify: `app/analysis/leadtime/page.tsx`
- Modify: `app/analysis/stockout/page.tsx`

- [x] **Step 1: Replace analysis frame and table markup with shared shell/UI components.**
- [x] **Step 2: Use `EmptyValue` for nullable lead-time and stockout values, preserving existing model/database behavior.**
- [x] **Step 3: Verify analysis pages contain no hex colors and retain distinct error versus empty-result handling.**
- [x] **Step 4: Run `npm test`.**
- [x] **Step 5: Run `npm run build`.**
