import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const migration = readFileSync(join(root, 'supabase/migrations/20260828000300_create_forecast_data_model.sql'), 'utf8');

test('Forecast 기간은 core 설정에서 읽고 train/test view가 분리된다', () => {
  assert.match(migration, /create table if not exists core\.forecast_setting/);
  assert.match(migration, /create or replace view core\.v_train_demand/);
  assert.match(migration, /create or replace view core\.v_test_actual/);
  assert.match(migration, /u\.use_date between s\.train_start and s\.train_end/);
  assert.match(migration, /u\.use_date between s\.test_start and s\.test_end/);
  assert.match(migration, /u\.use_date not between s\.test_start and s\.test_end/);
});

test('Forecast 관련 애플리케이션 코드가 raw usage_history를 직접 조회하지 않는다', () => {
  const files = readdirSync(join(root, 'lib'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => readFileSync(join(root, 'lib', entry.name), 'utf8'))
    .join('\n');
  assert.doesNotMatch(files, /raw\.usage_history/);
});

test('기간 경계는 TypeScript 코드에 날짜 리터럴로 고정되지 않는다', () => {
  const appFiles = readdirSync(join(root, 'app'), { recursive: true })
    .filter((file): file is string => typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.tsx')))
    .map((file) => readFileSync(join(root, 'app', file), 'utf8'))
    .join('\n');
  assert.doesNotMatch(appFiles, /20\d{2}-\d{2}-\d{2}/);
});
