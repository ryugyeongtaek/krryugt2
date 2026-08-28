import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const page = readFileSync(join(process.cwd(), 'app/analysis/demand-profile/page.tsx'), 'utf8');
const table = readFileSync(join(process.cwd(), 'components/analysis/demand-profile-table.tsx'), 'utf8');

test('Demand Profile route는 저장된 analytics 결과와 공통 화면을 사용한다', () => {
  assert.match(page, /getDemandProfiles/);
  assert.match(page, /getDemandProfileKpi/);
  assert.match(page, /AnalysisFrame/);
  assert.match(table, /demandType|demand_type/);
});

test('Demand Profile 필터는 통계 계산 없이 저장된 행을 필터링한다', () => {
  assert.match(table, /useMemo/);
  assert.match(table, /calculation/i);
  assert.doesNotMatch(table, /stddev|regr_slope|reduce\(/i);
});
