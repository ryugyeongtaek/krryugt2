import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

test('공통 분석 프레임은 실제 role로 Sidebar를 렌더링한다', () => {
  const source = readFileSync(join(process.cwd(), 'components/analysis/analysis-frame.tsx'), 'utf8');
  assert.match(source, /getRole/);
  assert.match(source, /<Sidebar role=\{role\}/);
});
