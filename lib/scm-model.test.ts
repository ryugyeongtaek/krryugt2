import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLeadtimeGap, normalizeStockoutRisk, normalizeShipmentTrend } from './scm-model.ts';

test('normalizes shipment trend rows and preserves the requested sample values', () => {
  const result = normalizeShipmentTrend({
    item_code: '602K02693',
    item_name: '테스트 품목',
    n_span: 40,
    latest_qty: 779,
    avg_3m: 772.3,
  });

  assert.equal(result.itemCode, '602K02693');
  assert.equal(result.nSpan, 40);
  assert.equal(result.latestQty, 779);
  assert.equal(result.avg3m, 772.3);
});

test('normalizes analytics leadtime rows into the screen model', () => {
  const result = normalizeLeadtimeGap({
    supplier_name: 'Fujifilm BI India',
    country: 'India',
    master_lt: 32,
    sample_count: 159,
    actual_avg: 37.6,
    p80: 44,
    gap: 12,
  });

  assert.deepEqual(result, {
    supplier: 'Fujifilm BI India',
    country: 'India',
    masterLeadTime: 32,
    sampleCount: 159,
    actualAverage: 37.6,
    p80: 44,
    gap: 12,
  });
});

test('uses Korean view aliases and safe defaults', () => {
  const result = normalizeLeadtimeGap({ 법인: 'Japan', 국가: 'Japan', 표준리드타임: 7, 표본수: 278, 실적평균: 14.5, P80: 18, 격차: 11 });
  assert.equal(result.supplier, 'Japan');
  assert.equal(result.masterLeadTime, 7);
  assert.equal(result.p80, 18);
  assert.equal(result.gap, 11);
});

test('reads the real analytics.v_leadtime_gap column names', () => {
  const result = normalizeLeadtimeGap({
    supplier_name: 'Fujifilm BI China',
    country: 'China',
    std_lead_time: 25,
    n_samples: 210,
    mean_days: 28.4,
    p80_days: 33,
    gap_days: 8,
  });

  assert.deepEqual(result, {
    supplier: 'Fujifilm BI China',
    country: 'China',
    masterLeadTime: 25,
    sampleCount: 210,
    actualAverage: 28.4,
    p80: 33,
    gap: 8,
  });
});

test('normalizes stockout risk rows and preserves nullable values', () => {
  const result = normalizeStockoutRisk({
    item_id: 'ITEM012',
    item_name: '정착 유닛',
    supplier_name: 'Fujifilm BI Japan',
    current_stock: 362,
    inbound_qty: 722,
    available_qty: 1084,
    daily_usage_avg: 60.22,
    planned_lead_time: 18,
    stockout_days: 18,
    stockout_date: '2026-09-18',
    risk_status: 'CRITICAL',
    reason: null,
  });

  assert.deepEqual(result, {
    itemId: 'ITEM012',
    itemName: '정착 유닛',
    supplier: 'Fujifilm BI Japan',
    currentStock: 362,
    inboundQty: 722,
    availableQty: 1084,
    dailyUsageAvg: 60.22,
    plannedLeadTime: 18,
    stockoutDays: 18,
    stockoutDate: '2026-09-18',
    riskStatus: 'CRITICAL',
    reason: null,
  });
});

test('normalizes unknown stockout reasons without inventing numbers', () => {
  const result = normalizeStockoutRisk({
    item_id: 'ITEM020',
    item_name: '신규 품목',
    supplier_id: 'SUP013',
    current_stock: 0,
    inbound_qty: 0,
    available_qty: 0,
    daily_usage_avg: null,
    planned_lead_time: null,
    stockout_days: null,
    stockout_date: null,
    risk_status: 'UNKNOWN',
    reason: 'NO_USAGE',
  });

  assert.equal(result.stockoutDays, null);
  assert.equal(result.stockoutDate, null);
  assert.equal(result.riskStatus, 'UNKNOWN');
  assert.equal(result.reason, 'NO_USAGE');
});
