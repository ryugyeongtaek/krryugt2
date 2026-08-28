import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20260828000700_create_demand_profile.sql'), 'utf8');

test('Demand Profile SQL은 학습 View와 KPI View를 정의한다', () => {
  assert.match(migration, /create or replace view analytics\.v_sku_demand_profile/i);
  assert.match(migration, /create or replace view analytics\.v_demand_profile_kpi/i);
  for (const column of ['item_id', 'item_name', 'n_periods', 'n_nonzero_periods', 'adi', 'cv', 'cv_squared', 'zero_demand_rate', 'trend', 'recent_change_rate', 'peak_period', 'demand_type', 'seasonality', 'reason_code', 'stability']) {
    assert.match(migration, new RegExp(`\\b${column}\\b`, 'i'));
  }
});

test('Demand Type은 SBC 기준과 24개월 Seasonality 경계를 사용한다', () => {
  assert.match(migration, /1\.32/);
  assert.match(migration, /0\.49/);
  assert.match(migration, /insufficient_periods/i);
  assert.match(migration, /intermittent.*lumpy|lumpy.*intermittent/is);
});

test('Demand Profile은 raw usage와 test actual을 사용하지 않는다', () => {
  assert.match(migration, /core\.v_train_demand/i);
  assert.doesNotMatch(migration, /from\s+raw\.usage_history/i);
  assert.doesNotMatch(migration, /core\.v_test_actual/i);
});
