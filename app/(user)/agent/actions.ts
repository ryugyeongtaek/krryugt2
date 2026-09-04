'use server';

import { requireUser } from '@/lib/auth';
import { runAgent } from '@/lib/agent/orchestrator';
import { saveTurn } from '@/lib/agent/conversation';
import type { AgentActionState } from './state';

function isLlmConfigured() { return [process.env.OPENAI_BASE_URL, process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL].every((value) => Boolean(value?.trim())); }
export async function askAgent(_previous: AgentActionState, formData: FormData): Promise<AgentActionState> {
  const user = await requireUser('/agent');
  const question = String(formData.get('question') ?? '').trim();
  if (!question) return { status: 'error', answer: null, trace: [], error: '질문을 입력해 주세요.' };
  if (!isLlmConfigured()) return { status: 'error', answer: null, trace: [], error: 'Agent를 사용하려면 서버의 OpenAI 설정이 필요합니다.' };
  const result = await runAgent({ question, user: { id: user.user_id, email: user.email, role: user.role }, history: [] });
  const saved = await saveTurn({ conversationId: null, title: question.slice(0, 80), question, answer: result.answer, toolTrace: result.trace, usage: null, guardrail: { cannot_answer: result.answer.cannot_answer } }, { currentUser: { user_id: user.user_id, email: user.email } });
  return { status: 'success', answer: result.answer, trace: result.trace, error: saved.error ? `답변은 생성됐지만 대화 저장에 실패했습니다: ${saved.error}` : null };
}
