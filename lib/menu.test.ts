import test from 'node:test';
import assert from 'node:assert/strict';
import { getMenuItems, type MenuRole } from './menu.ts';

test('USER 메뉴에는 분석 화면이 포함되고 ADMIN 전용 메뉴는 노출하지 않는다', () => {
  const userItems = getMenuItems('USER');
  assert.ok(userItems.some((item) => item.href === '/analysis/leadtime'));
  assert.ok(userItems.some((item) => item.href === '/analysis/stockout'));
  assert.ok(userItems.every((item) => item.roles.includes('USER')));
});

test('ADMIN 메뉴는 USER 메뉴와 분리되어 관리 경로를 제공한다', () => {
  const roles: MenuRole[] = ['ADMIN'];
  const adminItems = getMenuItems(roles[0]);
  assert.ok(adminItems.some((item) => item.href === '/admin'));
  assert.ok(adminItems.every((item) => item.roles.includes('ADMIN')));
});
