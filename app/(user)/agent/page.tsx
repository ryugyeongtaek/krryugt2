import AnalysisFrame from '@/components/analysis/analysis-frame';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AgentPage() {
  const user = await requireUser('/agent');

  return (
    <AnalysisFrame title="Agent" description="실데이터 기반 SCM 분석을 준비하는 사용자 화면입니다.">
      <div className="card">
        <h3 className="card-title">SCM Agent</h3>
        <p className="muted">{user.name || user.email}님, 분석 데이터 연결이 준비되었습니다.</p>
      </div>
    </AnalysisFrame>
  );
}
