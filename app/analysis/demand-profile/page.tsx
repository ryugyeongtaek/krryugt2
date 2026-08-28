import AnalysisFrame from '@/components/analysis/analysis-frame';
import DemandProfileTable from '@/components/analysis/demand-profile-table';
import EmptyValue from '@/components/ui/empty-value';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import { getDemandProfileKpi, getDemandProfiles } from '@/lib/scm';

export const dynamic = 'force-dynamic';

function kpiValue(value: number | undefined) {
  return value === undefined ? <EmptyValue reasonCode="KPI_UNAVAILABLE" /> : value.toLocaleString();
}

export default async function DemandProfilePage() {
  const [{ rows, error }, { data: kpi, error: kpiError }] = await Promise.all([getDemandProfiles(), getDemandProfileKpi()]);

  if (error || kpiError) {
    return <AnalysisFrame title="SKU 수요 프로파일" description="학습 구간의 SKU별 수요 특성을 분류합니다."><div className="card"><p className="text-danger">조회에 실패했습니다.</p><p className="muted">{error ?? kpiError}</p></div></AnalysisFrame>;
  }

  return <AnalysisFrame title="SKU 수요 프로파일" description="학습 구간 데이터만 사용해 SKU별 수요 패턴과 Forecast 모델 후보를 확인합니다.">
    <div className="grid grid-4">
      <KpiCard label="전체 SKU" value={kpiValue(kpi?.totalItems)} foot="학습 구간 대상" />
      <KpiCard label="Smooth" value={kpiValue(kpi?.nSmooth)} foot="안정 수요" tone="good" />
      <KpiCard label="Intermittent · Lumpy" value={kpiValue(kpi?.nCrostonNeeded)} foot="Croston 계열 후보" tone="warn" />
      <KpiCard label="계산 불가" value={kpiValue(kpi?.nCalculationUnavailable)} foot="기간·표본 확인 필요" />
    </div>
    <Panel className="section" title="SKU별 수요 특성" description="Syntetos–Boylan–Croston 기준 · 학습 구간 전용">
      {rows.length === 0 ? <p className="muted">데이터가 없습니다. forecast_setting의 학습 기간과 analytics View를 확인하세요.</p> : <DemandProfileTable rows={rows} />}
    </Panel>
  </AnalysisFrame>;
}
