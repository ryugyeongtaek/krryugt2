import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

test('Model Comparison 화면은 저장된 analytics 결과와 공통 차트를 사용한다', () => {
  const page = readFileSync(join(process.cwd(), 'app/analysis/model-comparison/page.tsx'), 'utf8');
  assert.match(page, /getBacktestPerformances|getComparisonPoints/);
  assert.match(page, /ForecastOverlayChart/);
  assert.doesNotMatch(page, /raw\.usage_history|run_baseline_forecast|run_backtest/);
});
