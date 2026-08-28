import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20260828000900_create_backtest_champion.sql'), 'utf8');

test('Backtest는 저장된 Forecast Result와 test actual을 연결한다', () => {
  assert.match(sql, /core\.forecast_result/);
  assert.match(sql, /core\.v_test_actual/);
  assert.doesNotMatch(sql, /raw\.usage_history/);
});

test('WAPE, MAPE, Bias, RMSE, MAE와 계산 불가 사유를 SQL에서 저장한다', () => {
  for (const field of ['wape', 'mape', 'bias', 'rmse', 'mae', 'reason_code']) assert.match(sql, new RegExp(field));
  assert.match(sql, /ACTUAL_SUM_ZERO/);
  assert.match(sql, /MAPE_DENOMINATOR_ZERO/);
  assert.match(sql, /predicted_qty - actual_qty/);
});

test('Champion은 metric·tie-break·후보 전체 성능을 저장한다', () => {
  assert.match(sql, /champion_metric/);
  assert.match(sql, /abs\(p\.bias\)/);
  assert.match(sql, /jsonb_agg/);
  assert.match(sql, /selection_method.*AUTO/);
  assert.match(sql, /MANUAL_CHAMPION_REASON_REQUIRED/);
});
