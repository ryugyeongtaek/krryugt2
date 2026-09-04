import assert from 'node:assert/strict';
import test from 'node:test';

import { callLlm } from './llm.ts';

const originalEnv = {
  baseUrl: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL,
};

function setEnv(baseUrl?: string, apiKey?: string, model?: string) {
  if (baseUrl === undefined) delete process.env.OPENAI_BASE_URL;
  else process.env.OPENAI_BASE_URL = baseUrl;
  if (apiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = apiKey;
  if (model === undefined) delete process.env.OPENAI_MODEL;
  else process.env.OPENAI_MODEL = model;
}

test.after(() => setEnv(originalEnv.baseUrl, originalEnv.apiKey, originalEnv.model));

test('필수 LLM 환경변수가 없으면 error 결과를 반환한다', async () => {
  setEnv(undefined, 'key', 'model');

  const result = await callLlm({ messages: [{ role: 'user', content: '안녕' }] });

  assert.deepEqual(result, { error: 'OPENAI_BASE_URL 환경변수가 없습니다.' });
});

test('tool_calls 응답을 명확한 ToolCall 타입으로 파싱한다', async () => {
  setEnv('https://llm.example.test/v1/', ' key ', ' model-tools ');
  let request: RequestInit | undefined;
  let url = '';
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    url = String(input);
    request = init;
    return new Response(JSON.stringify({
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'getShipmentTrend', arguments: '{"itemCode":"602K02693"}' } }],
        },
      }],
    }), { status: 200 });
  };

  const result = await callLlm({
    messages: [{ role: 'user', content: '출고 추이' }],
    tools: [{ type: 'function', function: { name: 'getShipmentTrend', parameters: {} } }],
  }, fetchImpl);

  assert.equal(result.error, undefined);
  assert.equal(url, 'https://llm.example.test/v1/chat/completions');
  assert.equal((request?.headers as Record<string, string>).Authorization, 'Bearer key');
  assert.equal((request?.headers as Record<string, string>)['Content-Type'], 'application/json');
  assert.deepEqual(result.toolCalls, [{
    id: 'call_1',
    type: 'function',
    function: { name: 'getShipmentTrend', arguments: '{"itemCode":"602K02693"}' },
  }]);
  assert.equal(result.content, null);
});

test('json_schema 400이면 같은 모델에서 json_object로 한 번만 재시도한다', async () => {
  setEnv('https://fallback-schema.example.test', 'key', 'schema-fallback-model');
  const bodies: Record<string, unknown>[] = [];
  let calls = 0;
  const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    if (calls === 1) return new Response('json_schema is not supported', { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: '{"ok":true}' } }] }), { status: 200 });
  };

  const result = await callLlm({
    messages: [{ role: 'user', content: '질문' }],
    response_format: { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: {} } },
  }, fetchImpl);

  assert.equal(result.error, undefined);
  assert.equal(calls, 2);
  assert.deepEqual(bodies[1].response_format, { type: 'json_object' });
  assert.equal(bodies[1].temperature, 0);
});

test('temperature가 원인인 400이면 temperature 없이 한 번만 재시도한다', async () => {
  setEnv('https://fallback-temperature.example.test', 'key', 'temperature-fallback-model');
  const bodies: Record<string, unknown>[] = [];
  let calls = 0;
  const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    if (calls === 1) return new Response("'temperature' does not support 0 with this model", { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: '완료' } }] }), { status: 200 });
  };

  const result = await callLlm({ messages: [{ role: 'user', content: '질문' }] }, fetchImpl);

  assert.equal(result.error, undefined);
  assert.equal(calls, 2);
  assert.equal('temperature' in bodies[1], false);
});

test('응답 파싱 오류와 timeout은 throw하지 않고 error로 반환한다', async () => {
  setEnv('https://errors.example.test', 'key', 'error-model');
  const malformed = await callLlm({ messages: [{ role: 'user', content: '질문' }] }, async () => new Response('not-json', { status: 200 }));
  assert.match(malformed.error ?? '', /응답 JSON 파싱에 실패했습니다/);

  const timeout = await callLlm({ messages: [{ role: 'user', content: '질문' }] }, () => new Promise<Response>(() => {}), { timeoutMs: 5 });
  assert.match(timeout.error ?? '', /timeout|시간.*초과/i);
});
