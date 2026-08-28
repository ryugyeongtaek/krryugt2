import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageUser, hasRole, safeNextPath } from './auth-model.ts';

test('next 경로는 내부 경로만 허용한다', () => {
  assert.equal(safeNextPath('/admin/users'), '/admin/users');
  assert.equal(safeNextPath('https://evil.example'), '/workflow');
  assert.equal(safeNextPath('//evil.example'), '/workflow');
});

test('ADMIN만 관리자 권한을 가진다', () => {
  assert.equal(hasRole('ADMIN', 'ADMIN'), true);
  assert.equal(hasRole('USER', 'ADMIN'), false);
});

test('자신의 role 제거와 active 해제는 허용하지 않는다', () => {
  assert.equal(canManageUser('u1', 'u1', 'ADMIN', true, 'USER', true), false);
  assert.equal(canManageUser('u1', 'u1', 'ADMIN', true, 'ADMIN', false), false);
  assert.equal(canManageUser('u1', 'u2', 'ADMIN', true, 'USER', false), true);
  assert.equal(canManageUser('u1', 'u2', 'USER', true, 'USER', true), false);
});
