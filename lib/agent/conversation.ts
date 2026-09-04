import type { AgentAnswer } from './schema.ts';
export type ConversationTraceEntry = { name: string; args: string; ok: boolean; ms: number; reason: string | null };

export type AgentConversation = {
  conversation_id: string;
  user_id: string;
  user_email: string;
  title: string;
  started_at: string;
  last_at: string;
};

export type AgentMessage = {
  message_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  answer: AgentAnswer | null;
  tool_trace: ConversationTraceEntry[] | null;
  usage: Record<string, unknown> | null;
  guardrail: Record<string, unknown> | null;
  created_at: string;
};

export type SaveTurnInput = {
  conversationId: string | null;
  title: string;
  question: string;
  answer: AgentAnswer;
  toolTrace: ConversationTraceEntry[];
  usage: Record<string, unknown> | null;
  guardrail: Record<string, unknown> | null;
};

type RpcResult = { data: unknown; error: { message: string } | null };
type ConversationUser = { user_id: string; email: string };
type ConversationDeps = { rpc?: (name: string, args: Record<string, unknown>) => Promise<RpcResult>; currentUser?: ConversationUser };

async function serverClient() {
  const { createSupabaseServerClient } = await import('../supabase/server.ts');
  return createSupabaseServerClient();
}

async function authenticatedUser(next = '/agent') {
  const { requireUser } = await import('../auth.ts');
  return requireUser(next);
}

export async function listConversations(): Promise<{ rows: AgentConversation[]; error: string | null }> {
  const user = await authenticatedUser('/agent');
  try {
    const supabase = await serverClient();
    const { data, error } = await supabase.schema('core').from('agent_conversation').select('id, user_id, user_email, title, started_at, last_at').eq('user_id', user.user_id).order('last_at', { ascending: false });
    return { rows: (data ?? []).map((row) => ({ ...row, conversation_id: row.id })) as AgentConversation[], error: error?.message ?? null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : '대화 목록 조회에 실패했습니다.' };
  }
}

export async function getConversationMessages(conversationId: string): Promise<{ rows: AgentMessage[]; error: string | null }> {
  await authenticatedUser('/agent');
  try {
    const supabase = await serverClient();
    const { data, error } = await supabase.schema('core').from('agent_message').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    return { rows: (data ?? []) as AgentMessage[], error: error?.message ?? null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : '대화 메시지 조회에 실패했습니다.' };
  }
}

export async function saveTurn(input: SaveTurnInput, deps: ConversationDeps = {}): Promise<{ saved: boolean; conversationId: string | null; answer: AgentAnswer; error: string | null }> {
  const user = deps.currentUser ?? await authenticatedUser('/agent');
  const rpc = deps.rpc ?? (async (name, args) => (await (await serverClient()).schema('core').rpc(name, args)) as RpcResult);
  try {
    const result = await rpc('save_agent_turn', {
      p_conversation_id: input.conversationId,
      p_user_email: user.email,
      p_title: input.title,
      p_question: input.question,
      p_answer: input.answer,
      p_tool_trace: input.toolTrace,
      p_usage: input.usage,
      p_guardrail: input.guardrail,
    });
    if (result.error) return { saved: false, conversationId: input.conversationId, answer: input.answer, error: result.error.message };
    return { saved: true, conversationId: typeof result.data === 'string' ? result.data : input.conversationId, answer: input.answer, error: null };
  } catch (error) {
    return { saved: false, conversationId: input.conversationId, answer: input.answer, error: error instanceof Error ? error.message : 'AGENT_CONVERSATION_SAVE_FAILED' };
  }
}
