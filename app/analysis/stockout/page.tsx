import AnalysisFrame from '@/components/analysis/analysis-frame';
import DataTable, { formatNumber, type Column } from '@/components/analysis/data-table';
import RiskStatusBadge from '@/components/analysis/risk-status-badge';
import { getStockoutKpi, getStockoutRisks } from '@/lib/scm';
import type { StockoutRisk } from '@/lib/scm-model';
import EmptyValue from '@/components/ui/empty-value';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';

export const dynamic = 'force-dynamic';

function formatDate(value: string | null) {
  if (!value) return <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" />;
  return value.slice(0, 10);
}

function formatKpi(data: Record<string, unknown> | null, key: string) {
  const value = data?.[key];
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" />;
}

function reasonLabel(reason: StockoutRisk['reason']) {
  if (reason === 'NO_USAGE') return '사용 이력 없음';
  if (reason === 'NO_LEADTIME') return '리드타임 없음';
  return <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" />;
}

const columns: Column<StockoutRisk>[] = [
  { key: 'itemId', label: '품목코드' },
  { key: 'itemName', label: '품목명' },
  { key: 'supplier', label: '공급처' },
  { key: 'availableQty', label: '가용수량', align: 'right', render: (row) => row.availableQty === null ? <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" /> : formatNumber(row.availableQty, ' EA') },
  { key: 'dailyUsageAvg', label: '일평균 사용량', align: 'right', render: (row) => row.dailyUsageAvg === null ? <EmptyValue reasonCode={row.reason ?? 'NO_USAGE'} /> : formatNumber(row.dailyUsageAvg, ' EA/일') },
  { key: 'plannedLeadTime', label: '계획 리드타임', align: 'right', render: (row) => row.plannedLeadTime === null ? <EmptyValue reasonCode="NO_LEADTIME" /> : formatNumber(row.plannedLeadTime, '일') },
  { key: 'stockoutDays', label: '예상 소진일수', align: 'right', render: (row) => row.stockoutDays === null ? <EmptyValue reasonCode={row.reason ?? 'CALCULATION_UNAVAILABLE'} /> : formatNumber(row.stockoutDays, '일') },
  { key: 'stockoutDate', label: '예상 소진일', render: (row) => formatDate(row.stockoutDate) },
  { key: 'riskStatus', label: '위험 상태', render: (row) => <RiskStatusBadge status={row.riskStatus} /> },
  { key: 'reason', label: '판정 사유', render: (row) => row.reason ? <span className="muted">{reasonLabel(row.reason)}</span> : <EmptyValue /> },
];

export default async function StockoutPage() {
  const [{ rows, error }, { data: kpi, error: kpiError }] = await Promise.all([
    getStockoutRisks(),
    getStockoutKpi(),
  ]);

  if (error || kpiError) {
    return (
      <AnalysisFrame
        title="소진 위험"
        description="가용수량과 일평균 사용량을 기준으로 품목별 예상 소진 위험을 확인합니다."
      >
        <div className="card">
          <p className="text-danger">조회에 실패했습니다.</p>
          <p className="muted">{error ?? kpiError}</p>
        </div>
      </AnalysisFrame>
    );
  }

  const kpiRecord = (kpi ?? null) as Record<string, unknown> | null;

  return (
    <AnalysisFrame
      title="소진 위험"
      description="가용수량과 일평균 사용량을 기준으로 품목별 예상 소진일과 리드타임 내 공급 가능 여부를 확인합니다."
    >
      <div className="grid grid-4">
        <KpiCard label="전체 품목" value={formatKpi(kpiRecord, 'n_items')} foot="분석 대상 품목" />
        <KpiCard label="위험 품목" value={formatKpi(kpiRecord, 'n_critical')} foot="리드타임 내 소진 위험" tone="warn" />
        <KpiCard label="안전 품목" value={formatKpi(kpiRecord, 'n_safe')} foot="현재 기준 안전" tone="good" />
        <KpiCard label="판정 불가" value={formatKpi(kpiRecord, 'n_unknown')} foot="사용량·리드타임 확인 필요" />
      </div>

      <div className="section grid grid-2">
        <KpiCard label="30일 이내 소진" value={formatKpi(kpiRecord, 'n_within_30d')} foot="우선 검토 대상" tone="warn" />
        <KpiCard label="평균 예상 소진일수" value={<>{formatKpi(kpiRecord, 'avg_stockout_days')}<span className="metric-unit">일</span></>} foot="분석 가능한 품목 기준" />
      </div>

      <Panel className="section" title="품목별 소진 위험" description="가용수량 ÷ 일평균 사용량">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.itemId}
          empty="데이터가 없습니다. Exposed schemas 와 analytics.v_stockout_risk 를 확인하세요."
        />
      </Panel>
    </AnalysisFrame>
  );
}
