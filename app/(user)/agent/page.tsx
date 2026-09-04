import AnalysisFrame from '@/components/analysis/analysis-frame';
import { requireUser } from '@/lib/auth';
import ChatForm from './chat-form';

export const dynamic = 'force-dynamic';

export default async function AgentPage() {
  const user = await requireUser('/agent');
  const llmConfigured = [process.env.OPENAI_BASE_URL, process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL].every((value) => Boolean(value?.trim()));
  return <AnalysisFrame title="SCM Agent" description="저장된 SCM 분석 결과를 근거와 함께 확인합니다."><ChatForm userName={user.name || user.email} llmConfigured={llmConfigured} /></AnalysisFrame>;
}
