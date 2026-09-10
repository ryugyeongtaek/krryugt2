import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { agentTools, collectNumbers, compactToolData } from './tools.ts';

test('Agent Tool 이름은 유일하고 필수 메타데이터를 가진다', () => {
  const names = agentTools.map((tool) => tool.name);

  assert.equal(new Set(names).size, 4);
  for (const tool of agentTools) {
    assert.ok(tool.description.length > 0);
    assert.deepEqual(tool.roles, ['USER', 'ADMIN']);
    assert.equal(tool.parameters.type, 'object');
    assert.equal(tool.parameters.additionalProperties, false);
    assert.ok(Array.isArray(tool.parameters.required));
    assert.equal(typeof tool.run, 'function');
  }
});

test('Tool parameters는 추가 속성을 허용하지 않고 모든 속성을 required로 선언한다', () => {
  for (const tool of agentTools) {
    const properties = Object.keys(tool.parameters.properties);
    assert.deepEqual(tool.parameters.required, properties);
  }
});

test('허용되지 않은 역할은 SCM 모듈을 호출하지 않고 거부한다', async () => {
  const tool = agentTools[0];
  const result = await tool.run({ itemCode: '602K02693' }, 'ANON');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'ROLE_NOT_ALLOWED');
  assert.deepEqual(result.numbers, {});
});

test('조회 데이터의 모든 수치를 경로별로 수집하고 null은 보존한다', () => {
  assert.deepEqual(
    collectNumbers({ rows: [{ qty: 779, avg: null }, { qty: 772.3 }], count: 40 }),
    { 'rows[0].qty': 779, 'rows[1].qty': 772.3, count: 40 },
  );
});

test('대용량 Agent 조회 결과는 모델 컨텍스트에 맞게 제한한다', () => {
  const rows = Array.from({ length: 250 }, (_, index) => ({ item_code: `ITEM${index}`, qty: index }));

  const compacted = compactToolData(rows);

  assert.equal(compacted.length, 100);
  assert.equal(compacted[99].item_code, 'ITEM99');
});

test('Agent Tool은 Supabase를 직접 조회하지 않고 scm을 동적으로 import한다', () => {
  const source = readFileSync(join(process.cwd(), 'lib/agent/tools.ts'), 'utf8');

  const forbiddenClientName = ['create', 'Supabase', 'ServerClient'].join('');
  assert.doesNotMatch(source, new RegExp(forbiddenClientName));
  assert.match(source, /await import\(['"]\.\.\/scm(?:\.ts)?['"]\)/);
});

test('출고 추이 Tool은 analytics의 저장 결과 뷰를 조회한다', () => {
  const source = readFileSync(join(process.cwd(), 'lib/scm.ts'), 'utf8');
  const shipmentFunction = source.slice(source.indexOf('export async function getShipmentTrend'));

  assert.match(shipmentFunction, /from\('v_shipment_trend'\)/);
  assert.doesNotMatch(shipmentFunction, /from\('v_shipment_by_hoc'\)/);
});
