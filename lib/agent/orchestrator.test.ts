import assert from 'node:assert/strict';
import test from 'node:test';

import type { AgentTool, ToolResult } from './tools.ts';
import type { ChatRequest, ChatResult } from './llm.ts';
import { runAgent } from './orchestrator.ts';

const parameters = {
  type: 'object' as const,
  additionalProperties: false as const,
  properties: { itemCode: { type: 'string' } },
  required: ['itemCode'],
};

function tool(overrides: Partial<AgentTool> = {}): AgentTool {
  return {
    name: 'getShipmentTrend',
    description: '출고 추이 조회',
    parameters,
    roles: ['USER', 'ADMIN'],
    run: async () => ({ ok: true, data: [], numbers: {}, dataAsOf: null, reason: null }),
    ...overrides,
  };
}

function finalResult(answer = '최종 설명'): ChatResult {
  return {
    message: { role: 'assistant', content: JSON.stringify({
      answer,
      verdict: 'SUPPORTED',
      evidence: [],
      data_as_of: null,
      risk: null,
      recommended_action: null,
      cannot_answer: false,
      cannot_answer_reason: null,
    }) },
    content: JSON.stringify({ answer }),
    toolCalls: [],
  };
}

function toolCallResult(name = 'getShipmentTrend', args = '{"itemCode":"602K02693"}'): ChatResult {
  return {
    message: {
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'call_1', type: 'function', function: { name, arguments: args } }],
    },
    content: null,
    toolCalls: [{ id: 'call_1', type: 'function', function: { name, arguments: args } }],
  };
}

test('User → LLM → Tool → Tool 결과 → LLM 설명 순서와 tool_call_id를 보존한다', async () => {
  const requests: ChatRequest[] = [];
  let calls = 0;
  const result = await runAgent({ question: '출고 추이를 알려줘', user: { role: 'USER' }, history: [] }, {
    tools: [tool()],
    llm: async (request) => {
      requests.push(request);
      calls += 1;
      return calls === 1 ? toolCallResult() : finalResult();
    },
  });

  assert.equal(result.answer.verdict, 'SUPPORTED');
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].messages.map((message) => message.role), ['user']);
  assert.equal(requests[0].messages[0].content, '출고 추이를 알려줘');
  assert.deepEqual(requests[1].messages.map((message) => message.role), ['user', 'assistant', 'tool']);
  assert.equal(requests[1].messages[2].tool_call_id, 'call_1');
  assert.equal(result.trace[0].name, 'getShipmentTrend');
  assert.equal(result.trace[0].ok, true);
});

test('첫 요청에는 현재 role에 허용된 Tool만 노출하고 미허용 Tool은 실행하지 않는다', async () => {
  let executed = false;
  const adminTool = tool({ name: 'adminOnly', roles: ['ADMIN'], run: async () => {
    executed = true;
    return { ok: true, data: [], numbers: {}, dataAsOf: null, reason: null } satisfies ToolResult;
  } });
  let firstRequest: ChatRequest | undefined;
  const result = await runAgent({ question: '관리 작업', user: { role: 'USER' } }, {
    tools: [adminTool],
    llm: async (request) => {
      firstRequest = request;
      return toolCallResult('adminOnly');
    },
  });

  assert.deepEqual(firstRequest?.tools, []);
  assert.equal(executed, false);
  assert.equal(result.answer.cannot_answer, true);
  assert.equal(result.answer.cannot_answer_reason, 'TOOL_NOT_ALLOWED');
});

test('잘못된 Tool arguments는 실행하지 않고 cannotAnswer로 변환한다', async () => {
  let executed = false;
  const result = await runAgent({ question: '출고 추이', user: { role: 'USER' } }, {
    tools: [tool({ run: async () => {
      executed = true;
      return { ok: true, data: [], numbers: {}, dataAsOf: null, reason: null };
    } })],
    llm: async () => toolCallResult('getShipmentTrend', '{bad-json'),
  });

  assert.equal(executed, false);
  assert.equal(result.answer.cannot_answer, true);
  assert.equal(result.answer.cannot_answer_reason, 'INVALID_TOOL_ARGUMENTS');
  assert.equal(result.trace[0].ok, false);
});

test('Tool loop는 최대 6회이며 매 호출 trace에 name,args,ok,ms,reason을 남긴다', async () => {
  let llmCalls = 0;
  const result = await runAgent({ question: '반복 질문', user: { role: 'USER' } }, {
    tools: [tool()],
    llm: async () => {
      llmCalls += 1;
      return toolCallResult(`getShipmentTrend`, `{"itemCode":"ITEM${llmCalls}"}`);
    },
  });

  assert.equal(llmCalls, 6);
  assert.equal(result.trace.length, 6);
  assert.equal(result.answer.cannot_answer_reason, 'MAX_TOOL_ROUNDS');
  for (const entry of result.trace) {
    assert.equal(typeof entry.name, 'string');
    assert.equal(typeof entry.args, 'string');
    assert.equal(typeof entry.ok, 'boolean');
    assert.equal(typeof entry.ms, 'number');
    assert.equal(entry.reason, null);
  }
});

test('이후 라운드는 json_object 형식을 유지해 fallback 400 재시도를 방지한다', async () => {
  const formats: unknown[] = [];
  let calls = 0;
  const result = await runAgent({ question: '출고 추이', user: { role: 'USER' } }, {
    tools: [tool()],
    llm: async (request) => {
      formats.push(request.response_format);
      calls += 1;
      return calls === 1 ? toolCallResult() : finalResult();
    },
  });

  assert.equal(result.answer.cannot_answer, false);
  assert.equal((formats[0] as { type: string }).type, 'json_schema');
  assert.deepEqual(formats[1], { type: 'json_object' });
});

test('LLM과 Tool 실패는 예외 대신 cannotAnswer로 변환한다', async () => {
  const llmFailure = await runAgent({ question: '질문', user: { role: 'USER' } }, {
    tools: [tool()],
    llm: async () => ({ error: 'LLM_DOWN' }),
  });
  assert.equal(llmFailure.answer.cannot_answer, true);
  assert.equal(llmFailure.answer.cannot_answer_reason, 'LLM_DOWN');

  const toolFailure = await runAgent({ question: '질문', user: { role: 'USER' } }, {
    tools: [tool({ run: async () => ({ ok: false, data: [], numbers: {}, dataAsOf: null, reason: 'NO_DATA' }) })],
    llm: async () => toolCallResult(),
  });
  assert.equal(toolFailure.answer.cannot_answer, true);
  assert.equal(toolFailure.answer.cannot_answer_reason, 'NO_DATA');
});

test('전체 Agent 실행 시간이 제한을 넘으면 AGENT_TIMEOUT으로 종료한다', async () => {
  const result = await runAgent({ question: '질문', user: { role: 'USER' } }, {
    tools: [tool()],
    llm: () => new Promise<ChatResult>(() => {}),
    timeoutMs: 5,
  });

  assert.equal(result.answer.cannot_answer_reason, 'AGENT_TIMEOUT');
});
