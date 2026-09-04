import { cannotAnswer, parseAgentAnswer, agentAnswerStructuredOutput, type AgentAnswer } from './schema.ts';
import { validateAnswerNumbers } from './guardrail.ts';
import type { AgentTool, ToolResult } from './tools.ts';
import { agentTools as defaultTools } from './tools.ts';
import type { ChatMessage, ChatRequest, ChatResult, LlmToolCall } from './llm.ts';

export type AgentUser = {
  role: 'USER' | 'ADMIN';
  id?: string;
  email?: string;
};

export type RunAgentInput = {
  question: string;
  user: AgentUser;
  history?: ChatMessage[];
};

export type AgentTraceEntry = {
  name: string;
  args: string;
  ok: boolean;
  ms: number;
  reason: string | null;
};

export type AgentRunResult = {
  answer: AgentAnswer;
  trace: AgentTraceEntry[];
  history: ChatMessage[];
};

export type AgentLlm = (request: ChatRequest) => Promise<ChatResult>;

export type RunAgentOptions = {
  llm?: AgentLlm;
  tools?: AgentTool[];
  now?: () => number;
  timeoutMs?: number;
};

const MAX_TOOL_ROUNDS = 6;

function unavailable(reason: string, history: ChatMessage[], trace: AgentTraceEntry[]): AgentRunResult {
  return { answer: cannotAnswer(reason), trace, history };
}

function allowedTools(tools: AgentTool[], role: AgentUser['role']): AgentTool[] {
  const seen = new Set<string>();
  return tools.filter((tool) => {
    if (seen.has(tool.name) || !tool.roles.includes(role)) return false;
    seen.add(tool.name);
    return true;
  });
}

function openAiTools(tools: AgentTool[]): NonNullable<ChatRequest['tools']> {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function getToolCalls(result: ChatResult): LlmToolCall[] {
  if (result.toolCalls) return result.toolCalls;
  const calls = result.message?.tool_calls;
  return calls ?? [];
}

function toolMessage(call: LlmToolCall, result: ToolResult | { ok: false; reason: string }): ChatMessage {
  return {
    role: 'tool',
    content: JSON.stringify(result),
    tool_call_id: call.id,
  };
}

async function withinDeadline<T>(promise: Promise<T>, deadline: number, now: () => number): Promise<{ value?: T; timedOut: boolean }> {
  const remaining = deadline - now();
  if (remaining <= 0) return { timedOut: true };
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(new Error('AGENT_TIMEOUT'));
    }, remaining);
  });
  try {
    const value = await Promise.race([promise, timeout]);
    return { value, timedOut: false };
  } catch (error) {
    if (timedOut) return { timedOut: true };
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function parseArguments(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw);
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function finalAnswer(result: ChatResult): AgentAnswer | null {
  const content = result.message?.content ?? result.content;
  return typeof content === 'string' ? parseAgentAnswer(content) : null;
}

export async function runAgent(
  input: RunAgentInput,
  options: RunAgentOptions = {},
): Promise<AgentRunResult> {
  const now = options.now ?? Date.now;
  const deadline = now() + (options.timeoutMs ?? 60_000);
  const tools = options.tools ?? defaultTools;
  const visibleTools = allowedTools(tools, input.user.role);
  const trace: AgentTraceEntry[] = [];
  const history: ChatMessage[] = [
    ...(input.history ?? []),
    { role: 'user', content: input.question },
  ];
  const responseFormat = agentAnswerStructuredOutput as unknown as Record<string, unknown>;
  const fallbackResponseFormat: Record<string, unknown> = { type: 'json_object' };
  let useFallbackResponseFormat = false;
  let regenerated = false;
  const toolSources: Array<{ toolName: string; result: ToolResult }> = [];
  const llm = options.llm ?? (async (request: ChatRequest) => {
    const { callLlm } = await import('./llm.ts');
    return callLlm(request);
  });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const request: ChatRequest = {
      messages: [...history],
      tools: openAiTools(visibleTools),
      tool_choice: 'auto',
      response_format: useFallbackResponseFormat ? fallbackResponseFormat : responseFormat,
    };
    let llmResult: { value?: ChatResult; timedOut: boolean };
    try {
      llmResult = await withinDeadline(llm(request), deadline, now);
    } catch {
      return unavailable('LLM_ERROR', history, trace);
    }
    if (llmResult.timedOut) return unavailable('AGENT_TIMEOUT', history, trace);
    if (!llmResult.value || llmResult.value.error) return unavailable(llmResult.value?.error ?? 'LLM_ERROR', history, trace);

    const assistantMessage = llmResult.value.message ?? {
      role: 'assistant' as const,
      content: llmResult.value.content ?? null,
      tool_calls: llmResult.value.toolCalls ?? [],
    };
    history.push(assistantMessage);
    const calls = getToolCalls(llmResult.value);
    if (calls.length === 0) {
      const answer = finalAnswer(llmResult.value);
      if (!answer) return unavailable('INVALID_LLM_ANSWER', history, trace);
      const validation = validateAnswerNumbers(answer, toolSources);
      if (validation.ok) return { answer, trace, history };
      if (regenerated) return unavailable('UNSUPPORTED_NUMBERS', history, trace);
      regenerated = true;
      history.push({
        role: 'system',
        content: `숫자 검증에 실패했습니다. 출처가 없는 숫자를 제거하거나 Tool 결과와 일치하도록 수정해 한 번만 다시 답변하세요: ${validation.unmatched.map((entry) => entry.token).join(', ')}`,
      });
      useFallbackResponseFormat = true;
      continue;
    }

    useFallbackResponseFormat = true;
    for (const call of calls) {
      const startedAt = now();
      const args = call.function.arguments;
      const selectedTool = visibleTools.find((tool) => tool.name === call.function.name);
      if (!selectedTool || !selectedTool.roles.includes(input.user.role)) {
        trace.push({ name: call.function.name, args, ok: false, ms: Math.max(0, now() - startedAt), reason: 'TOOL_NOT_ALLOWED' });
        history.push(toolMessage(call, { ok: false, reason: 'TOOL_NOT_ALLOWED' }));
        return unavailable('TOOL_NOT_ALLOWED', history, trace);
      }
      const parsedArgs = parseArguments(args);
      if (!parsedArgs) {
        trace.push({ name: call.function.name, args, ok: false, ms: Math.max(0, now() - startedAt), reason: 'INVALID_TOOL_ARGUMENTS' });
        history.push(toolMessage(call, { ok: false, reason: 'INVALID_TOOL_ARGUMENTS' }));
        return unavailable('INVALID_TOOL_ARGUMENTS', history, trace);
      }

      let toolResult: ToolResult;
      try {
        const result = await withinDeadline(selectedTool.run(parsedArgs, input.user.role), deadline, now);
        if (result.timedOut || !result.value) {
          trace.push({ name: call.function.name, args, ok: false, ms: Math.max(0, now() - startedAt), reason: 'AGENT_TIMEOUT' });
          history.push(toolMessage(call, { ok: false, reason: 'AGENT_TIMEOUT' }));
          return unavailable('AGENT_TIMEOUT', history, trace);
        }
        toolResult = result.value;
      } catch {
        trace.push({ name: call.function.name, args, ok: false, ms: Math.max(0, now() - startedAt), reason: 'TOOL_ERROR' });
        history.push(toolMessage(call, { ok: false, reason: 'TOOL_ERROR' }));
        return unavailable('TOOL_ERROR', history, trace);
      }
      const reason = toolResult.reason;
      trace.push({ name: call.function.name, args, ok: toolResult.ok, ms: Math.max(0, now() - startedAt), reason });
      toolSources.push({ toolName: call.function.name, result: toolResult });
      history.push(toolMessage(call, toolResult));
      if (!toolResult.ok) return unavailable(reason ?? 'TOOL_ERROR', history, trace);
    }
  }

  return unavailable('MAX_TOOL_ROUNDS', history, trace);
}
