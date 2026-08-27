import AnalysisFrame from '@/components/analysis/analysis-frame';
import DataTable, { formatNumber, type Column } from '@/components/analysis/data-table';
import RiskStatusBadge from '@/components/analysis/risk-status-badge';
import { getStockoutKpi, getStockoutRisks } from '@/lib/scm';
import type { StockoutRisk } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

function formatDate(value: string | null) {
  if (!value) return '—';
  return value.slice(0, 10);
}

function formatKpi(data: Record<string, unknown> | null, key: string) {
  const value = data?.[key];
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : '—';
}

function reasonLabel(reason: StockoutRisk['reason']) {
  if (reason === 'NO_USAGE') return '사용 이력 없음';
  if (reason === 'NO_LEADTIME') return '리드타임 없음';
  return '—';
}

const columns: Column<StockoutRisk>[] = [
  { key: 'itemId', label: '품목코드' },
  { key: 'itemName', label: '품목명' },
  { key: 'supplier', label: '공급처' },
  { key: 'availableQty', label: '가용수량', align: 'right', render: (row) => formatNumber(row.availableQty, ' EA') },
  { key: 'dailyUsageAvg', label: '일평균 사용량', align: 'right', render: (row) => formatNumber(row.dailyUsageAvg, ' EA/일') },
  { key: 'plannedLeadTime', label: '계획 리드타임', align: 'right', render: (row) => formatNumber(row.plannedLeadTime, '일') },
  { key: 'stockoutDays', label: '예상 소진일수', align: 'right', render: (row) => formatNumber(row.stockoutDays, '일') },
  { key: 'stockoutDate', label: '예상 소진일', render: (row) => formatDate(row.stockoutDate) },
  { key: 'riskStatus', label: '위험 상태', render: (row) => <RiskStatusBadge status={row.riskStatus} /> },
  { key: 'reason', label: '판정 사유', render: (row) => row.reason ? <span className="muted">{reasonLabel(row.reason)}</span> : '—' },
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
        <div className="card metric"><div className="metric-label">전체 품목</div><div className="metric-value">{formatKpi(kpiRecord, 'n_items')}</div><div className="metric-foot">분석 대상 품목</div></div>
        <div className="card metric"><div className="metric-label">위험 품목</div><div className="metric-value">{formatKpi(kpiRecord, 'n_critical')}</div><div className="metric-foot warn">리드타임 내 소진 위험</div></div>
        <div className="card metric"><div className="metric-label">안전 품목</div><div className="metric-value">{formatKpi(kpiRecord, 'n_safe')}</div><div className="metric-foot good">현재 기준 안전</div></div>
        <div className="card metric"><div className="metric-label">판정 불가</div><div className="metric-value">{formatKpi(kpiRecord, 'n_unknown')}</div><div className="metric-foot">사용량·리드타임 확인 필요</div></div>
      </div>

      <div className="section grid grid-2">
        <div className="card metric"><div className="metric-label">30일 이내 소진</div><div className="metric-value">{formatKpi(kpiRecord, 'n_within_30d')}</div><div className="metric-foot warn">우선 검토 대상</div></div>
        <div className="card metric"><div className="metric-label">평균 예상 소진일수</div><div className="metric-value">{formatKpi(kpiRecord, 'avg_stockout_days')}<span style={{ fontSize: 15, fontWeight: 600 }}>일</span></div><div className="metric-foot">분석 가능한 품목 기준</div></div>
      </div>

      <div className="section card">
        <div className="card-title">
          <h3>품목별 소진 위험</h3>
          <span>가용수량 ÷ 일평균 사용량</span>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.itemId}
          empty="데이터가 없습니다. Exposed schemas 와 analytics.v_stockout_risk 를 확인하세요."
        />
      </div>
    </AnalysisFrame>
  );
}
