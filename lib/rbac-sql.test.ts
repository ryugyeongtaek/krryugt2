import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20260828000200_create_auth_rbac.sql', import.meta.url), 'utf8');

test('RBAC migration은 사용자, 감사 로그와 auth trigger를 정의한다', () => {
  assert.match(migration, /create table if not exists core\.app_user/);
  assert.match(migration, /create table if not exists core\.audit_log/);
  assert.match(migration, /create trigger on_auth_user_created after insert on auth\.users/);
  assert.match(migration, /create or replace function core\.is_admin/);
});

test('RBAC migration은 anon 쓰기를 회수하고 자기 관리자 잠금을 방지한다', () => {
  assert.match(migration, /revoke all on all tables in schema core from anon/);
  assert.match(migration, /revoke all on all tables in schema analytics from anon/);
  assert.match(migration, /SELF_ADMIN_LOCKOUT/);
  assert.match(migration, /USER_ROLE_CHANGED/);
  assert.doesNotMatch(migration, /using \(true\)/i);
});
