import assert from 'node:assert/strict';
import test from 'node:test';

import {
  agentAnswerJsonSchema,
  cannotAnswer,
  parseAgentAnswer,
} from './schema.ts';

test('잘못된 JSON은 AgentAnswer로 파싱하지 않는다', () => {
  assert.equal(parseAgentAnswer('{not-json'), null);
});

test('필수 필드가 누락된 응답은 거부한다', () => {
  const incomplete = JSON.stringify({
    answer: '답변',
    verdict: 'SUPPORTED',
    evidence: [],
  });

  assert.equal(parseAgentAnswer(incomplete), null);
});

test('계산 불가 응답도 명시적인 사유와 함께 파싱한다', () => {
  const answer = cannotAnswer('NO_FORECAST');

  assert.deepEqual(answer, {
    answer: '현재 질문에 답할 수 없습니다.',
    verdict: 'CALCULATION_UNAVAILABLE',
    evidence: [],
    data_as_of: null,
    risk: null,
    recommended_action: null,
    cannot_answer: true,
    cannot_answer_reason: 'NO_FORECAST',
  });
  assert.deepEqual(parseAgentAnswer(JSON.stringify(answer)), answer);
});

test('Structured Outputs 스키마는 strict object 계약을 유지한다', () => {
  assert.equal(agentAnswerJsonSchema.type, 'object');
  assert.equal(agentAnswerJsonSchema.additionalProperties, false);
  assert.deepEqual(agentAnswerJsonSchema.required, [
    'answer',
    'verdict',
    'evidence',
    'data_as_of',
    'risk',
    'recommended_action',
    'cannot_answer',
    'cannot_answer_reason',
  ]);
  assert.equal(agentAnswerJsonSchema.properties.evidence.items.additionalProperties, false);
});
