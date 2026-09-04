export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export type LlmToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type ChatMessage = {
  role: ChatRole;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: LlmToolCall[];
};

export type ChatTool = Record<string, unknown>;

export type ChatRequest = {
  messages: ChatMessage[];
  tools?: ChatTool[];
  tool_choice?: 'auto' | 'none' | 'required' | Record<string, unknown>;
  temperature?: number;
  response_format?: Record<string, unknown>;
};

export type ChatResult = {
  content?: string | null;
  message?: ChatMessage | null;
  toolCalls?: LlmToolCall[];
  error?: string;
};

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type CallOptions = {
  timeoutMs?: number;
};

const fallbackMemory = new Set<string>();

function envValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function errorResult(error: string): ChatResult {
  return { error };
}

function parseToolCalls(value: unknown): LlmToolCall[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;

  const calls: LlmToolCall[] = [];
  for (const call of value) {
    if (call === null || typeof call !== 'object') return null;
    const record = call as Record<string, unknown>;
    const fn = record.function;
    if (
      typeof record.id !== 'string' ||
      record.type !== 'function' ||
      fn === null ||
      typeof fn !== 'object' ||
      typeof (fn as Record<string, unknown>).name !== 'string' ||
      typeof (fn as Record<string, unknown>).arguments !== 'string'
    ) return null;
    calls.push({
      id: record.id,
      type: 'function',
      function: {
        name: (fn as Record<string, unknown>).name as string,
        arguments: (fn as Record<string, unknown>).arguments as string,
      },
    });
  }
  return calls;
}

function parseResponse(text: string): ChatResult {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return errorResult('LLM 응답 JSON 파싱에 실패했습니다.');
  }

  if (payload === null || typeof payload !== 'object') return errorResult('LLM 응답 형식이 올바르지 않습니다.');
  const choices = (payload as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0 || choices[0] === null || typeof choices[0] !== 'object') {
    return errorResult('LLM 응답에 choices가 없습니다.');
  }
  const message = (choices[0] as Record<string, unknown>).message;
  if (message === null || typeof message !== 'object') return errorResult('LLM 응답에 message가 없습니다.');
  const messageRecord = message as Record<string, unknown>;
  const role = messageRecord.role;
  const content = messageRecord.content;
  if ((role !== 'system' && role !== 'user' && role !== 'assistant' && role !== 'tool') || (content !== null && typeof content !== 'string')) {
    return errorResult('LLM message 형식이 올바르지 않습니다.');
  }
  const toolCalls = parseToolCalls(messageRecord.tool_calls);
  if (toolCalls === null) return errorResult('LLM tool_calls 형식이 올바르지 않습니다.');

  const parsedMessage: ChatMessage = { role, content: content as string | null, tool_calls: toolCalls };
  return { content: parsedMessage.content, message: parsedMessage, toolCalls };
}

async function readResponseBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ response?: Response; error?: string }> {
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Response>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error('LLM 요청 시간이 초과되었습니다.'));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchImpl(url, { ...init, signal: controller.signal }),
      timeout,
    ]);
    return { response };
  } catch (error) {
    if (timedOut) return { error: 'LLM 요청 시간이 초과되었습니다.' };
    return { error: `LLM 네트워크 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function makeBody(request: ChatRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: envValue('OPENAI_MODEL'),
    messages: request.messages,
    temperature: request.temperature ?? 0,
  };
  if (request.tools !== undefined) {
    body.tools = request.tools;
    body.tool_choice = request.tool_choice ?? 'auto';
  } else if (request.tool_choice !== undefined) {
    body.tool_choice = request.tool_choice;
  }
  if (request.response_format !== undefined) body.response_format = request.response_format;
  return body;
}

function isJsonSchema(body: Record<string, unknown>): boolean {
  const responseFormat = body.response_format;
  return responseFormat !== null && typeof responseFormat === 'object' && (responseFormat as Record<string, unknown>).type === 'json_schema';
}

export async function callLlm(
  request: ChatRequest,
  fetchImpl: FetchLike = fetch,
  options: CallOptions = {},
): Promise<ChatResult> {
  const baseUrl = envValue('OPENAI_BASE_URL');
  if (!baseUrl) return errorResult('OPENAI_BASE_URL 환경변수가 없습니다.');
  const apiKey = envValue('OPENAI_API_KEY');
  if (!apiKey) return errorResult('OPENAI_API_KEY 환경변수가 없습니다.');
  const model = envValue('OPENAI_MODEL');
  if (!model) return errorResult('OPENAI_MODEL 환경변수가 없습니다.');

  let body = makeBody(request);
  const memoryKey = `${baseUrl}|${model}`;
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const timeoutMs = options.timeoutMs ?? 60_000;

  for (;;) {
    let serialized: string;
    try {
      serialized = JSON.stringify(body);
    } catch {
      return errorResult('LLM 요청 JSON 직렬화에 실패했습니다.');
    }
    const fetched = await fetchWithTimeout(fetchImpl, url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: serialized,
    }, timeoutMs);
    if (fetched.error) return errorResult(fetched.error);
    if (!fetched.response) return errorResult('LLM 응답을 받지 못했습니다.');

    const responseText = await readResponseBody(fetched.response);
    if (fetched.response.ok) return parseResponse(responseText);

    if (fetched.response.status === 400 && !fallbackMemory.has(memoryKey)) {
      const lowerText = responseText.toLowerCase();
      if (lowerText.includes('temperature')) {
        fallbackMemory.add(memoryKey);
        const retryBody = { ...body };
        delete retryBody.temperature;
        body = retryBody;
        continue;
      }
      if (isJsonSchema(body)) {
        fallbackMemory.add(memoryKey);
        body = { ...body, response_format: { type: 'json_object' } };
        continue;
      }
    }

    return errorResult(`LLM HTTP ${fetched.response.status}: ${responseText || '응답 본문이 없습니다.'}`);
  }
}
