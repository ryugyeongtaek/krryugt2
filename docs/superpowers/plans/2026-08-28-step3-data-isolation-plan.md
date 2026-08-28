# STEP 3 데이터 모델과 격리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** STEP 4 이후 적재와 Forecast가 사용할 raw/core/analytics 계약을 만들고 train/test Data Leakage를 DB에서 차단한다.

**Architecture:** 기존 raw 테이블은 보존하고 nullable 적재 추적 컬럼을 `ALTER TABLE`로 추가한다. 정책과 기간은 core 설정 테이블에서 관리하며, usage history는 기간 설정을 참조하는 `core.v_train_demand`와 `core.v_test_actual`로만 소비한다. analytics에는 운영자가 기간과 데이터 커버리지를 확인할 수 있는 단일 view를 제공한다.

**Tech Stack:** PostgreSQL/Supabase RLS, Next.js TypeScript tests, 순수 CSS.

**Spec:** STEP 3 사용자 요구사항 및 `SCHEMA.md`

## Global Constraints

- raw 원본 데이터는 직접 수정하지 않고 기존 테이블은 drop/recreate하지 않는다.
- 날짜와 정책값을 애플리케이션 코드에 하드코딩하지 않는다.
- anon 접근을 차단하고 정책 변경은 ADMIN만 허용한다.
- null을 임의의 숫자로 치환하지 않는다.

### Task 1: Migration

- Create: `supabase/migrations/20260828000300_create_forecast_data_model.sql`
- Add raw tables, ingestion metadata, policy tables, forecast setting, isolation views, coverage view, grants and RLS.

### Task 2: Query contracts and tests

- Create: `lib/forecast-model.test.ts`
- Verify SQL contains isolation boundaries, no raw usage read in application code, and no date literals in Forecast TypeScript.

### Task 3: Verification

- Run: `npm test`
- Run: `npm run build`
- Apply migration in Supabase SQL Editor and run the supplied read-only verification query.
