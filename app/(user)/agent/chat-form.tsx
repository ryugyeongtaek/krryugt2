'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Badge, { type Status } from '@/components/ui/badge';
import Button from '@/components/ui/button';
import EmptyValue from '@/components/ui/empty-value';
import Panel from '@/components/ui/panel';
import { askAgent } from './actions';
import { answerPresentation, exampleQuestions, initialAgentState } from './state';

function statusForRisk(risk: string | null, unavailable: boolean): Status {
  if (unavailable) return 'CALCULATION_UNAVAILABLE';
  if (risk === 'CRITICAL') return 'CRITICAL';
  if (risk === 'WARNING') return 'WARNING';
  if (risk !== 'SAFE') return 'CALCULATION_UNAVAILABLE';
  return 'SAFE';
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button className="button primary" type="submit" disabled={disabled || pending}>{pending ? '분석 중...' : '분석 요청'}</button>;
}

function displayValue(value: string | number | null, reason?: string | null) {
  return value === null ? <EmptyValue reasonCode={reason ?? undefined} /> : String(value);
}

export default function ChatForm({ userName, llmConfigured }: { userName: string; llmConfigured: boolean }) {
  const [state, formAction] = useActionState(askAgent, initialAgentState);
  const [question, setQuestion] = useState('');
  const unavailable = state.answer ? answerPresentation(state.answer).state === 'unavailable' : false;
  return <div className="agent-page">
    <Panel title="SCM Agent" description={`${userName}님, 저장된 분석 결과를 질문으로 확인하세요.`}>
      {!llmConfigured && <div className="insight-banner"><strong>Agent 설정이 필요합니다.</strong><p className="muted">서버 OpenAI 설정이 없어 질문 전송이 비활성화되어 있습니다.</p></div>}
      <form action={formAction} className="agent-form">
        <label htmlFor="agent-question">질문</label>
        <textarea id="agent-question" name="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="예: 최근 출고량과 발주 위험을 알려줘" disabled={!llmConfigured} />
        <div className="button-row">{exampleQuestions.map((example) => <Button key={example} type="button" onClick={() => setQuestion(example)} disabled={!llmConfigured}>{example}</Button>)}<SubmitButton disabled={!llmConfigured || !question.trim()} /></div>
      </form>
      {state.error && <div className="alert-row" role="alert">{state.error}</div>}
    </Panel>
    {state.answer && <Panel title="Structured Answer" className="agent-answer">
      <div className="agent-answer-heading"><Badge status={statusForRisk(state.answer.risk, unavailable)}>{state.answer.verdict}</Badge><span className="muted">기준시각: {displayValue(state.answer.data_as_of)}</span></div>
      <p className="agent-answer-text">{state.answer.answer}</p>
      {unavailable && <p className="muted">계산 불가 사유: {displayValue(state.answer.cannot_answer_reason)}</p>}
      <div className="agent-grid"><div className="card"><span className="metric-label">Risk</span><div className="metric-value"><Badge status={statusForRisk(state.answer.risk, unavailable)}>{displayValue(state.answer.risk, state.answer.cannot_answer_reason)}</Badge></div></div><div className="card"><span className="metric-label">권고</span><p>{displayValue(state.answer.recommended_action)}</p></div></div>
      <div className="agent-evidence-grid">{state.answer.evidence.map((item, index) => <div className="card" key={`${item.source}-${item.metric}-${index}`}><strong>{item.source}</strong><span className="metric-label">{item.metric}</span><div className="metric-value">{displayValue(item.value, item.reason_code)}</div><small className="muted">{item.data_as_of ?? '기준시각 없음'}</small></div>)}</div>
      <details className="agent-trace"><summary>Tool trace ({state.trace.length})</summary><ul>{state.trace.map((entry, index) => <li key={`${entry.name}-${index}`}><code>{entry.name}</code> · {entry.ok ? '성공' : '실패'} · {entry.ms}ms{entry.reason ? ` · ${entry.reason}` : ''}</li>)}</ul></details>
    </Panel>}
  </div>;
}
