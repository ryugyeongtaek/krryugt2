import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForecastResult } from './scm-model.ts';

const engine = readFileSync(join(process.cwd(), 'lib/forecast-engine.ts'), 'utf8');
const queries = readFileSync(join(process.cwd(), 'lib/scm.ts'), 'utf8');

test('Forecast Result는 nullable interval과 model version을 보존한다', () => {
  const row = normalizeForecastResult({ run_id: 'run-1', model_id: 'MA_3M', model_version: 'v-1', item_id: 'ITEM001', period: '2026-09-01', predicted_qty: 10, p50: 10, p80: null, p90: null, sigma: null, basis: 'MA_3M', reason_code: 'SIGMA_UNAVAILABLE' });
  assert.equal(row.modelVersion, 'v-1');
  assert.equal(row.p50, 10);
  assert.equal(row.p80, null);
  assert.equal(row.reasonCode, 'SIGMA_UNAVAILABLE');
});

test('Forecast 실행 경계는 ADMIN 확인 후 RPC를 호출한다', () => {
  assert.match(engine, /requireAdmin/);
  assert.match(engine, /run_baseline_forecast/);
});

test('Forecast 조회 코드는 analytics View만 사용한다', () => {
  assert.match(queries, /v_model_config/);
  assert.match(queries, /v_forecast_run/);
  assert.match(queries, /v_forecast_result/);
  assert.doesNotMatch(engine + queries, /raw\.usage_history|core\.v_test_actual/);
});
