import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260828000800_create_forecast_engine.sql'), 'utf8');

test('Forecast Engine은 모델 레지스트리·버전·결과·실행 이력을 정의한다', () => {
  for (const objectName of ['core.model_config', 'core.model_version', 'core.forecast_result', 'core.run_baseline_forecast', 'analytics.v_model_config', 'analytics.v_forecast_run', 'analytics.v_forecast_result', 'analytics.v_forecast_run_kpi']) {
    assert.match(migration, new RegExp(objectName.replace('.', '\\.'), 'i'));
  }
  for (const modelId of ['MA_3M', 'MA_6M', 'WMA_3M', 'PY_SAME_MONTH', 'SEASONAL_NAIVE']) assert.match(migration, new RegExp(modelId));
  for (const status of ['RUNNING', 'SUCCESS', 'FAILED']) assert.match(migration, new RegExp(status));
});

test('Baseline 계산은 학습 데이터와 DB parameters를 사용한다', () => {
  assert.match(migration, /core\.v_train_demand/i);
  assert.match(migration, /parameters/i);
  assert.match(migration, /3.*2.*1/s);
  assert.doesNotMatch(migration, /from\s+raw\.usage_history/i);
  assert.doesNotMatch(migration, /core\.v_test_actual/i);
});

test('Forecast 결과는 model version, sigma, interval과 stale 정보를 보존한다', () => {
  for (const column of ['model_version', 'predicted_qty', 'p50', 'p80', 'p90', 'sigma', 'reason_code', 'data_snapshot_at', 'is_stale']) {
    assert.match(migration, new RegExp(`\\b${column}\\b`, 'i'));
  }
  assert.match(migration, /stddev_samp/i);
});
