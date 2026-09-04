import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/migrations/20260828001300_create_safety_stock_recommendation.sql', import.meta.url), 'utf8');

test('Safety Stock uses forecast error, lead time variability, service policy and z value', () => {
  assert.match(sql, /analytics\.v_safety_stock/i);
  assert.match(sql, /sigma_dlt/i);
  assert.match(sql, /std_days/i);
  assert.match(sql, /z_value/i);
  assert.match(sql, /sqrt/i);
});

test('Purchase Recommendation applies demand basis, MOQ and pack size in SQL', () => {
  assert.match(sql, /v_purchase_recommendation/i);
  assert.match(sql, /greatest\([\s\S]*forecast_qty[\s\S]*confirmed_sales_order/i);
  assert.match(sql, /moq/i);
  assert.match(sql, /pack_size/i);
  assert.match(sql, /ceil/i);
  assert.match(sql, /calculation_trace/i);
});

test('unavailable inputs remain null with explicit reason codes', () => {
  for (const reason of ['NO_FORECAST','NO_INVENTORY_DATA','NO_LEADTIME','INSUFFICIENT_FORECAST_ERROR','NO_SERVICE_LEVEL','NO_ITEM_POLICY']) assert.match(sql, new RegExp(reason));
  assert.match(sql, /CALCULATION_UNAVAILABLE/);
  assert.match(sql, /NO_ORDER_REQUIRED/);
});

test('recommended order date exposes overdue and immediate status', () => {
  assert.match(sql, /recommended_order_date/i);
  assert.match(sql, /is_immediate/i);
  assert.match(sql, /is_overdue/i);
  assert.match(sql, /safety_buffer_days/i);
});
