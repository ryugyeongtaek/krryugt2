import assert from 'node:assert/strict';
import test from 'node:test';

import type { AgentAnswer } from './schema.ts';
import type { ToolResult } from './tools.ts';
import { validateAnswerNumbers } from './guardrail.ts';

const baseAnswer = (overrides: Partial<AgentAnswer> = {}): AgentAnswer => ({
  answer: '분석 결과입니다.',
  verdict: 'SUPPORTED',
  evidence: [],
  data_as_of: null,
  risk: null,
  recommended_action: null,
  cannot_answer: false,
  cannot_answer_reason: null,
  ...overrides,
});

const tool = (name: string, numbers: Record<string, number>): { toolName: string; result: ToolResult } => ({
  toolName: name,
  result: { ok: true, data: [], numbers, dataAsOf: null, reason: null },
});

test('정상 숫자 1: 답변 본문의 정수가 ToolResult와 일치한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ answer: '현재고는 120개입니다.' }), [tool('getInventory', { available: 120 })]);
  assert.equal(result.ok, true);
});

test('정상 숫자 2: 천단위 쉼표와 소수가 일치한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ answer: '출고량은 1,234.5개입니다.' }), [tool('getShipmentTrend', { total: 1234.5 })]);
  assert.equal(result.ok, true);
});

test('정상 숫자 3: 음수와 백분율을 허용한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ answer: 'Bias는 -12.5이고 개선율은 25%입니다.' }), [tool('getOlAccuracy', { bias: -12.5, improvement: 0.25 })]);
  assert.equal(result.ok, true);
});

test('정상 숫자 4: evidence metric/value/reason의 숫자를 검증한다', () => {
  const result = validateAnswerNumbers(baseAnswer({
    evidence: [{ source: 'v_shipment_by_hoc', metric: '3M 평균', value: 772.3, data_as_of: null, reason_code: 'NO_DATA' }],
  }), [tool('getShipmentTrend', { avg_3m: 772.3 })]);
  assert.equal(result.ok, true);
});

test('정상 숫자 5: recommended_action의 숫자도 허용 사전과 대조한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ recommended_action: 'P80 기준 14일 전에 발주하세요.' }), [tool('getLeadtime', { p80_days: 14 })]);
  assert.equal(result.ok, true);
});

test('조작 숫자 1: 답변 본문에 출처 없는 숫자가 있으면 실패한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ answer: '현재고는 999개입니다.' }), [tool('getInventory', { available: 120 })]);
  assert.equal(result.ok, false);
  assert.equal(result.unmatched[0].value, 999);
});

test('조작 숫자 2: evidence value 조작을 탐지한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ evidence: [{ source: 'view', metric: '수요', value: 777, data_as_of: null, reason_code: null }] }), [tool('getShipmentTrend', { avg_3m: 772.3 })]);
  assert.equal(result.ok, false);
});

test('조작 숫자 3: recommended_action의 조작 숫자를 탐지한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ recommended_action: '7일 안에 발주하세요.' }), [tool('getLeadtime', { p80_days: 14 })]);
  assert.equal(result.ok, false);
});

test('조작 숫자 4: verdict에 삽입된 출처 없는 숫자를 탐지한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ verdict: 'CAUTION 42' as AgentAnswer['verdict'] }), [tool('getInventory', { available: 120 })]);
  assert.equal(result.ok, false);
});

test('조작 숫자 5: evidence reason의 조작 숫자를 탐지한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ evidence: [{ source: 'view', metric: '수요', value: null, data_as_of: null, reason_code: 'REASON_404' }] }), [tool('getShipmentTrend', { avg_3m: 772.3 })]);
  assert.equal(result.ok, false);
});

test('품목코드·기종코드·P80·연월·날짜·목록 번호는 숫자 검증에서 제외한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ answer: '602K02693, MDL121, P80, 2026-07, 2026-07-15, 1. 항목' }), []);
  assert.equal(result.ok, true);
  assert.equal(result.extracted.length, 0);
});

test('표시 자릿수 반올림은 제한적으로 허용한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ answer: '평균은 772.3입니다.' }), [tool('getShipmentTrend', { avg: 772.34 })]);
  assert.equal(result.ok, true);
});

test('0~1 비율의 백분율 표기만 변환해 허용한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ answer: 'zero-demand rate는 25%입니다.' }), [tool('getDemandProfile', { zero_demand_rate: 0.25 })]);
  assert.equal(result.ok, true);
});

test('null은 허용 숫자 사전에 들어가지 않으며 계산 불가 답변은 통과한다', () => {
  const result = validateAnswerNumbers(baseAnswer({ cannot_answer: true, verdict: 'CALCULATION_UNAVAILABLE', cannot_answer_reason: 'NO_FORECAST' }), [tool('getForecast', { forecast: 0 })]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.allowedNumbers, { 'getForecast.forecast': 0 });
});

test('ToolResult.numbers는 toolName.key 형태로 병합된다', () => {
  const result = validateAnswerNumbers(baseAnswer({ answer: '출고량 40개월, 최근 수량 779개입니다.' }), [tool('getShipmentTrend', { n_months: 40, latest_qty: 779 })]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.allowedNumbers, {
    'getShipmentTrend.n_months': 40,
    'getShipmentTrend.latest_qty': 779,
  });
});

test('정상 602K02693 답변의 기간 표현 숫자는 근거 숫자로 오인하지 않는다', () => {
  const result = validateAnswerNumbers(
    baseAnswer({ answer: '602K02693의 관측 개월은 40개월, 최근 수량은 779.0개, 3개월 평균은 772.3개입니다.' }),
    [tool('getShipmentTrend', { n_span: 40, latest_qty: 779, avg_3m: 772.3 })],
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.unmatched, []);
});
