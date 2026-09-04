import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { answerPresentation, validateAgentQuestion } from '../app/(user)/agent/state.ts';
import type { AgentAnswer } from './agent/schema.ts';

const root = 'C:/Users/fujifilm/Desktop/superSCM-main';

test('빈 질문은 전송할 수 없다', () => {
  assert.equal(validateAgentQuestion('   '), '질문을 입력해 주세요.');
  assert.equal(validateAgentQuestion('재고 위험을 알려줘'), null);
});

test('계산 불가 답변은 계산 불가 상태로 표현한다', () => {
  const answer: AgentAnswer = {
    answer: '현재 질문에 답할 수 없습니다.',
    verdict: 'CALCULATION_UNAVAILABLE',
    evidence: [],
    data_as_of: null,
    risk: null,
    recommended_action: null,
    cannot_answer: true,
    cannot_answer_reason: 'NO_FORECAST',
  };
  assert.deepEqual(answerPresentation(answer), { state: 'unavailable', reason: 'NO_FORECAST' });
});

test('정상 답변은 준비 상태와 표시 필드를 유지한다', () => {
  const answer: AgentAnswer = {
    answer: '출고량이 안정적입니다.',
    verdict: 'SUPPORTED',
    evidence: [{ source: '출고 추이', metric: '최근 수량', value: 120, data_as_of: '2026-09-01', reason_code: null }],
    data_as_of: '2026-09-01',
    risk: 'SAFE',
    recommended_action: '현재 정책을 유지하세요.',
    cannot_answer: false,
    cannot_answer_reason: null,
  };
  assert.deepEqual(answerPresentation(answer), { state: 'ready', reason: null });
});

test('Agent 페이지는 서버에서 사용자 인증을 요구한다', () => {
  const source = readFileSync(`${root}/app/(user)/agent/page.tsx`, 'utf8');
  assert.match(source, /requireUser\(['"]\/agent['"]\)/);
});

test('Agent 메뉴가 사용자 메뉴에 포함된다', () => {
  const source = readFileSync(`${root}/lib/menu.ts`, 'utf8');
  assert.match(source, /href:\s*['"]\/agent['"]/);
});

test('클라이언트 파일에는 API key와 원본 Tool data를 전달하지 않는다', () => {
  const source = readFileSync(`${root}/app/(user)/agent/chat-form.tsx`, 'utf8');
  assert.doesNotMatch(source, /OPENAI_API_KEY|ToolResult|raw\./);
});
