import test from 'node:test';
import assert from 'node:assert/strict';
import { formatEmptyValue } from './ui-model.ts';

test('계산 불가 값은 0 대신 대시와 reason code를 표시한다', () => {
  assert.equal(formatEmptyValue(null, 'NO_USAGE'), '— + NO_USAGE');
  assert.equal(formatEmptyValue(undefined, 'NO_LEADTIME'), '— + NO_LEADTIME');
});
