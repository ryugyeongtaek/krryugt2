import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { saveTurn, type SaveTurnInput } from './agent/conversation.ts';

const migration = readFileSync('supabase/migrations/20260904000200_agent_conversation.sql', 'utf8');

test('대화 저장 migration은 본인 소유 RLS와 관리자 조회 정책을 정의한다', () => {
  assert.match(migration, /create table if not exists core\.agent_conversation/);
  assert.match(migration, /create table if not exists core\.agent_message/);
  assert.match(migration, /auth\.uid\(\)/g);
  assert.match(migration, /core\.is_admin\(\)/);
  assert.match(migration, /create policy .*agent_conversation.*select/i);
  assert.match(migration, /create policy .*agent_message.*select/i);
  assert.match(migration, /revoke all .*core\.agent_conversation/i);
});

test('질문과 답변 저장은 하나의 RPC transaction 계약을 사용한다', () => {
  assert.match(migration, /create or replace function core\.save_agent_turn/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /insert into core\.agent_message/i);
  assert.match(migration, /p_question/);
  assert.match(migration, /p_answer/);
});

const input: SaveTurnInput = {
  conversationId: null,
  title: '재고 질문',
  question: '재고 위험을 알려줘',
  answer: { answer: '확인할 수 없습니다.', verdict: 'CALCULATION_UNAVAILABLE', evidence: [], data_as_of: null, risk: null, recommended_action: null, cannot_answer: true, cannot_answer_reason: 'NO_FORECAST' },
  toolTrace: [{ name: 'getStockoutRisks', args: '{}', ok: false, ms: 3, reason: 'NO_FORECAST' }],
  usage: null,
  guardrail: { ok: true },
};

test('저장 실패 시 Agent 답변을 버리지 않고 실패 결과를 반환한다', async () => {
  const result = await saveTurn(input, { currentUser: { user_id: 'user-1', email: 'user@example.com' }, rpc: async () => ({ data: null, error: { message: 'RLS_DENIED' } }) });
  assert.equal(result.saved, false);
  assert.equal(result.error, 'RLS_DENIED');
  assert.deepEqual(result.answer, input.answer);
});
