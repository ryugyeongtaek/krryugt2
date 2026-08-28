import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/(admin)/admin/scm-policies/lead-time/page.tsx', import.meta.url), 'utf8');
const action = readFileSync(new URL('../app/(admin)/admin/scm-policies/lead-time/actions.ts', import.meta.url), 'utf8');
test('Lead Time 정책 화면은 ADMIN 보호와 analytics 조회를 사용한다', () => { assert.match(page, /requireAdmin/); assert.match(page, /getLeadtimePolicies/); assert.match(page, /effectiveLeadTime/); });
test('Lead Time 변경은 서버에서 사유를 검증하고 RPC를 호출한다', () => { assert.match(action, /requireAdmin/); assert.match(action, /LEADTIME|리드타임/); assert.match(action, /set_leadtime_policy/); assert.match(action, /p_reason/); });
