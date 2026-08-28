import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDemandProfile } from './scm-model.ts';

test('Demand Profile은 DB 코드와 nullable 통계를 보존한다', () => {
  const row = normalizeDemandProfile({
    item_id: 'ITEM001', item_name: '품목 1', n_periods: 24, n_nonzero_periods: 20,
    adi: 1.2, cv: 0.5, cv_squared: 0.25, zero_demand_rate: 0.16,
    trend: 2.1, recent_change_rate: null, peak_period: '2026-01-01',
    demand_type: 'SMOOTH', seasonality: 'SEASONAL', reason_code: null, stability: 'STABLE',
  });
  assert.equal(row.itemId, 'ITEM001');
  assert.equal(row.demandType, 'SMOOTH');
  assert.equal(row.recentChangeRate, null);
  assert.equal(row.seasonality, 'SEASONAL');
});

test('지원하지 않는 Demand Type은 계산 불가로 보존한다', () => {
  const row = normalizeDemandProfile({ item_id: 'ITEM002', demand_type: 'UNKNOWN', reason_code: 'INSUFFICIENT_PERIODS' });
  assert.equal(row.demandType, null);
  assert.equal(row.reasonCode, 'INSUFFICIENT_PERIODS');
});
