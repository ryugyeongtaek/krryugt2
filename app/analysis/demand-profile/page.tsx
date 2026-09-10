import AnalysisFrame from '@/components/analysis/analysis-frame';
import DemandProfileRtTable from '@/components/analysis/demand-profile-rt-table';
import Panel from '@/components/ui/panel';
import { getDemandProfileRt } from '@/lib/scm';

export const dynamic = 'force-dynamic';

export default async function DemandProfilePage() {
  const { rows, error } = await getDemandProfileRt();

  if (error) {
    return <AnalysisFrame title="SKU 수요 프로파일" description="학습 구간의 SKU별 수요 특성을 분류합니다."><div className="card"><p className="text-danger">조회에 실패했습니다.</p><p className="muted">{error}</p></div></AnalysisFrame>;
  }

  return <AnalysisFrame title="SKU 수요 프로파일" description="학습 구간 데이터만 사용해 SKU별 수요 패턴과 Forecast 모델 후보를 확인합니다.">
    <Panel className="section" title="실데이터 SKU별 수요 특성" description="analytics.v_item_demand_profile · 6개월 미만 관측은 유형을 추정하지 않습니다.">
      {rows.length === 0 ? <p className="muted">데이터가 없습니다. 실데이터 View와 Supabase 노출 스키마를 확인하세요.</p> : <DemandProfileRtTable rows={rows} />}
    </Panel>
  </AnalysisFrame>;
}
