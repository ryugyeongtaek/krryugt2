import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/migrations/20260828001200_create_inventory_projection.sql', import.meta.url), 'utf8');

test('STEP 9 migration stores lead time policy history and enforces admin changes', () => {
  assert.match(sql, /create table if not exists core\.leadtime_policy/i);
  assert.match(sql, /create table if not exists core\.leadtime_policy_history/i);
  assert.match(sql, /core\.is_admin\(\)/i);
  assert.match(sql, /p_reason/i);
});

test('inventory projection is driven by champion forecast and period receipts', () => {
  assert.match(sql, /analytics\.v_champion_forecast/i);
  assert.match(sql, /analytics\.v_inventory_projection/i);
  assert.match(sql, /recursive/i);
  assert.match(sql, /납기예정일/);
  assert.match(sql, /forecast_demand/i);
});

test('risk view uses explicit unavailable reasons and four states', () => {
  for (const reason of ['NO_USAGE_HISTORY', 'NO_LEADTIME', 'NO_INVENTORY_DATA', 'NO_FORECAST']) assert.match(sql, new RegExp(reason));
  for (const status of ['SAFE', 'WARNING', 'CRITICAL', 'CALCULATION_UNAVAILABLE']) assert.match(sql, new RegExp(status));
  assert.match(sql, /create or replace view analytics\.v_stockout_risk/i);
});

test('projection does not use the old average-usage division formula', () => {
  assert.doesNotMatch(sql, /available_inventory\s*\/\s*average_usage/i);
  assert.match(sql, /ending_projected_inventory/i);
});
