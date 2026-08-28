# STEP 2 Authentication and RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ADMIN과 USER 권한을 프론트엔드, 서버, Supabase RLS 세 계층에서 강제하고 로그인·사용자 관리·감사 로그 기반을 추가한다.

**Architecture:** Supabase Auth 세션은 `@supabase/ssr` cookie client가 관리한다. 서버 helper와 middleware는 `core.app_user`의 active/role을 검증하고, 관리자 변경은 직접 테이블 update가 아니라 `core.admin_update_app_user` SECURITY DEFINER RPC와 audit trigger 경로를 사용한다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase SSR, PostgreSQL RLS, Node test runner.

**Spec:** 사용자 제공 STEP 2 요구사항, `AGENTS.md`, `SCHEMA.md`, `design.md`

## Global Constraints

- service_role key를 브라우저에 노출하지 않는다.
- anon write 허용 및 `using(true)` 정책을 제거한다.
- 클라이언트 메뉴 숨김은 보안 수단으로 사용하지 않는다.
- 기존 데이터 계산 SQL은 변경하지 않는다.
- role은 클라이언트 값이 아니라 서버의 `core.app_user` 조회 결과를 신뢰한다.
- 완료 전 `npm test`와 `npm run build`를 실행한다.

### Task 1: RBAC pure model and failing tests

**Files:**
- Create: `lib/auth-model.ts`
- Create: `lib/auth-model.test.ts`

- [ ] Test safe next path, role permission and self-change protection.
- [ ] Confirm tests fail before implementation.
- [ ] Implement pure functions with no Supabase dependency.

### Task 2: Database schema, trigger and RLS

**Files:**
- Create: `supabase/migrations/20260828000200_create_auth_rbac.sql`
- Modify: `sql/01-grants.sql`
- Modify: `sql/02-policies.sql`

- [ ] Create `core.app_user`, `core.audit_log`, auth trigger and `core.is_admin`.
- [ ] Create admin mutation RPC with self-protection and audit insertion.
- [ ] Revoke anon core/analytics access and grant authenticated read with admin mutation only through RPC.

### Task 3: SSR client and auth helpers

**Files:**
- Modify: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `lib/auth.ts`

- [ ] Replace stateless server client with cookie session client.
- [ ] Add `getRole`, `requireUser`, `requireAdmin` using `core.app_user`.
- [ ] Add middleware session refresh and protected path handling.

### Task 4: Auth routes and UI

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/login/actions.ts`
- Create: `app/(auth)/login/logout.ts`
- Create: `app/forbidden/page.tsx`
- Create: `middleware.ts`

- [ ] Implement email/password login, error message, safe next redirect and logout.
- [ ] Protect `/workflow`, `/analysis/*`, `/admin/*` and return HTTP 403 for non-admin admin paths.

### Task 5: Admin user management

**Files:**
- Create: `app/(admin)/admin/users/page.tsx`
- Create: `app/(admin)/admin/users/actions.ts`
- Modify: `lib/menu.ts`

- [ ] Add ADMIN-only user list and role/active controls.
- [ ] Call `requireAdmin` at the beginning of every mutation.
- [ ] Call the DB RPC and revalidate the page.

### Task 6: Verification

**Files:**
- Modify: `components/shell/sidebar.tsx` if menu state needs auth role.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Inspect SQL for anon revoke, authenticated-only grants, RPC self-protection and audit insertion.
- [ ] Report required Supabase dashboard settings and manual migration steps.
