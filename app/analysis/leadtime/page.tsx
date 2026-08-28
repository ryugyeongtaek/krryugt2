// 리드타임 격차 화면 ── 새 분석 화면의 본보기
//
// 1  lib/scm-model.ts   LeadtimeGap 타입과 정규화 함수
// 2  lib/scm.ts         getLeadtimeGap 조회 함수
// 3  이 파일            화면
// 4  components/analysis/*  껍데기와 표는 재사용

import AnalysisFrame from '@/components/analysis/analysis-frame';
import DataTable, { formatNumber, type Column } from '@/components/analysis/data-table';
import { getLeadtimeGap } from '@/lib/scm';
import type { LeadtimeGap } from '@/lib/scm-model';
import EmptyValue from '@/components/ui/empty-value';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';

export const dynamic = 'force-dynamic';

function GapCell({ row }: { row: LeadtimeGap }) {
  if (row.gap === null) return <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" />;
  // 양수 = 실제가 마스터보다 길다 = 위험
  const tone = row.gap > 0 ? 'text-danger' : 'text-good';
  const sign = row.gap > 0 ? '+' : '';
  return <span className={tone}>{sign}{formatNumber(row.gap, '일')}</span>;
}

const columns: Column<LeadtimeGap>[] = [
  { key: 'supplier', label: '공급처' },
  { key: 'country', label: '국가' },
  { key: 'masterLeadTime', label: '마스터', align: 'right',
    render: (r) => r.masterLeadTime === null ? <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" /> : formatNumber(r.masterLeadTime, '일') },
  { key: 'sampleCount', label: '표본수', align: 'right',
    render: (r) => r.sampleCount.toLocaleString() },
  { key: 'actualAverage', label: '실적평균', align: 'right',
    render: (r) => r.actualAverage === null ? <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" /> : formatNumber(r.actualAverage, '일') },
  { key: 'p80', label: 'P80', align: 'right',
    render: (r) => r.p80 === null ? <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" /> : formatNumber(r.p80, '일') },
  { key: 'gap', label: '격차', align: 'right',
    render: (r) => <GapCell row={r} /> },
];

export default async function LeadtimePage() {
  const { rows, error } = await getLeadtimeGap();

  if (error) {
    return (
      <AnalysisFrame
        title="리드타임 격차"
        description="공급처별 마스터 리드타임과 실제 실적을 비교합니다."
      >
        <div className="card">
          <p className="text-danger">조회에 실패했습니다.</p>
          <p className="muted">{error}</p>
        </div>
      </AnalysisFrame>
    );
  }

  const nSuppliers = rows.length;
  const nLonger = rows.filter((r) => r.gap !== null && r.gap > 0).length;
  const nLowSample = rows.filter((r) => r.sampleCount < 10).length;

  return (
    <AnalysisFrame
      title="리드타임 격차"
      description="마스터에 적힌 표준 리드타임과 실제 실적 P80 을 비교해, 계획이 현실보다 짧게 잡혀 있는 공급처를 찾습니다."
    >
      <div className="grid grid-3">
        <KpiCard label="공급처" value={nSuppliers} foot="사용 중인 생산법인" />
        <KpiCard label="실제가 더 김" value={nLonger} foot="격차 &gt; 0 인 공급처" tone="warn" />
        <KpiCard label="표본 부족" value={nLowSample} foot="표본 10건 미만" />
      </div>

      <Panel className="section" title="공급처별 리드타임" description="격차 = P80 − 마스터">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r, i) => `${r.supplier}-${i}`}
          empty="데이터가 없습니다. Exposed schemas 와 analytics.v_leadtime_gap 을 확인하세요."
        />
      </Panel>
    </AnalysisFrame>
  );
}
