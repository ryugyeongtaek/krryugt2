import type { AgentAnswer } from '@/lib/agent/schema';
import type { AgentTraceEntry } from '@/lib/agent/orchestrator';

export type AgentActionState = { status: 'idle' | 'success' | 'error'; answer: AgentAnswer | null; trace: AgentTraceEntry[]; error: string | null };
export const initialAgentState: AgentActionState = { status: 'idle', answer: null, trace: [], error: null };
export const exampleQuestions = ['최근 출고 추이와 수요 위험을 알려줘', '이 품목의 발주 추천 근거를 설명해줘', '현재 소진 위험이 높은 품목을 알려줘', '예측 결과를 기준으로 주의할 점을 알려줘'] as const;
export function validateAgentQuestion(question: string): string | null { return question.trim() ? null : '질문을 입력해 주세요.'; }
export function answerPresentation(answer: AgentAnswer): { state: 'ready' | 'unavailable'; reason: string | null } {
  return answer.cannot_answer || answer.verdict === 'CALCULATION_UNAVAILABLE' ? { state: 'unavailable', reason: answer.cannot_answer_reason } : { state: 'ready', reason: null };
}
