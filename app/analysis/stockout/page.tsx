import AnalysisFrame from '@/components/analysis/analysis-frame';
import DataTable, { formatNumber, type Column } from '@/components/analysis/data-table';
import RiskStatusBadge from '@/components/analysis/risk-status-badge';
import { getInventoryProjections, getStockoutKpi, getStockoutRisks } from '@/lib/scm';
import type { InventoryProjection, StockoutRisk } from '@/lib/scm-model';
import EmptyValue from '@/components/ui/empty-value';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';

export const dynamic = 'force-dynamic';

function formatDate(value: string | null) { return value ? value.slice(0, 10) : <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" />; }
function formatKpi(data: Record<string, unknown> | null, key: string) { const value = Number(data?.[key]); return Number.isFinite(value) ? value.toLocaleString() : <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" />; }
function reasonLabel(reason: StockoutRisk['reason']) { const labels: Record<string, string> = { NO_USAGE_HISTORY: '사용 이력 없음', NO_USAGE: '사용 이력 없음', NO_LEADTIME: '리드타임 없음', NO_INVENTORY_DATA: '현재 재고 없음', NO_FORECAST: 'Champion Forecast 없음', INSUFFICIENT_SAMPLE: '표본 부족' }; return reason ? labels[reason] ?? reason : <EmptyValue />; }
const columns: Column<StockoutRisk>[] = [
  { key: 'itemId', label: '품목코드' }, { key: 'itemName', label: '품목명' }, { key: 'supplier', label: '공급처' },
  { key: 'availableQty', label: '시작 재고', align: 'right', render: (r) => r.availableQty === null ? <EmptyValue reasonCode="NO_INVENTORY_DATA" /> : formatNumber(r.availableQty, ' EA') },
  { key: 'plannedLeadTime', label: 'Effective LT', align: 'right', render: (r) => r.plannedLeadTime === null ? <EmptyValue reasonCode="NO_LEADTIME" /> : formatNumber(r.plannedLeadTime, '일') },
  { key: 'stockoutDays', label: '예상 소진까지', align: 'right', render: (r) => r.stockoutDays === null ? <EmptyValue reasonCode={r.reason ?? 'CALCULATION_UNAVAILABLE'} /> : formatNumber(r.stockoutDays, '일') },
  { key: 'stockoutDate', label: '예상 소진 기간', render: (r) => formatDate(r.stockoutDate) },
  { key: 'endingProjectedInventory', label: '기말 예상재고', align: 'right', render: (r) => r.endingProjectedInventory == null ? <EmptyValue reasonCode={r.reason ?? 'CALCULATION_UNAVAILABLE'} /> : formatNumber(r.endingProjectedInventory, ' EA') },
  { key: 'riskStatus', label: '위험 상태', render: (r) => <RiskStatusBadge status={r.riskStatus} /> },
  { key: 'reason', label: '판정 사유', render: (r) => r.reason ? <span className="muted">{reasonLabel(r.reason)}</span> : <EmptyValue /> },
];
const projectionColumns: Column<InventoryProjection>[] = [
  { key: 'itemId', label: '품목코드' }, { key: 'period', label: '기간' },
  { key: 'beginningInventory', label: '기초 재고', align: 'right', render: (r) => r.beginningInventory == null ? <EmptyValue reasonCode={r.reasonCode ?? 'NO_INVENTORY_DATA'} /> : formatNumber(r.beginningInventory, ' EA') },
  { key: 'scheduledReceipt', label: '입고예정', align: 'right', render: (r) => formatNumber(r.scheduledReceipt ?? 0, ' EA') },
  { key: 'confirmedSalesOrder', label: '확정수주', align: 'right', render: (r) => formatNumber(r.confirmedSalesOrder ?? 0, ' EA') },
  { key: 'softAllocation', label: '가예약', align: 'right', render: (r) => formatNumber(r.softAllocation ?? 0, ' EA') },
  { key: 'forecastDemand', label: 'Forecast', align: 'right', render: (r) => r.forecastDemand == null ? <EmptyValue reasonCode="NO_FORECAST" /> : formatNumber(r.forecastDemand, ' EA') },
  { key: 'endingProjectedInventory', label: '기말 예상재고', align: 'right', render: (r) => r.endingProjectedInventory == null ? <EmptyValue reasonCode={r.reasonCode ?? 'CALCULATION_UNAVAILABLE'} /> : formatNumber(r.endingProjectedInventory, ' EA') },
  { key: 'stockoutPeriod', label: '소진 기간', render: (r) => r.stockoutPeriod ? r.stockoutPeriod.slice(0, 10) : <EmptyValue reasonCode="NO_FORECAST" /> },
  { key: 'daysOfSupply', label: 'Days of Supply', align: 'right', render: (r) => r.daysOfSupply == null ? <EmptyValue reasonCode={r.reasonCode ?? 'CALCULATION_UNAVAILABLE'} /> : formatNumber(r.daysOfSupply, '일') },
  { key: 'riskStatus', label: '상태', render: (r) => <RiskStatusBadge status={r.riskStatus} /> },
  { key: 'reasonCode', label: '사유', render: (r) => r.reasonCode ? <span className="muted">{r.reasonCode}</span> : <EmptyValue /> },
];
export default async function StockoutPage() {
  const [{ rows, error }, { data: kpi, error: kpiError }, { rows: projections, error: projectionError }] = await Promise.all([getStockoutRisks(), getStockoutKpi(), getInventoryProjections()]);
  if (error || kpiError || projectionError) return <AnalysisFrame title="소진 위험" description="Forecast 기반 재고 Projection을 조회합니다."><div className="card"><p className="text-danger">조회에 실패했습니다.</p><p className="muted">{error ?? kpiError ?? projectionError}</p></div></AnalysisFrame>;
  const record = (kpi ?? null) as Record<string, unknown> | null;
  return <AnalysisFrame title="소진 위험" description="Champion Forecast와 입고·수주·가예약을 기간별로 반영한 재고 Projection입니다.">
    <div className="grid grid-4"><KpiCard label="전체 품목" value={formatKpi(record, 'n_items')} foot="분석 대상 품목" /><KpiCard label="위험 품목" value={formatKpi(record, 'n_critical')} foot="예상 입고보다 빠른 소진" tone="warn" /><KpiCard label="주의 품목" value={formatKpi(record, 'n_warning')} foot="입고 전 대응 필요" tone="warn" /><KpiCard label="판정 불가" value={formatKpi(record, 'n_unknown')} foot="필수 데이터 확인 필요" /></div>
    <div className="section grid grid-2"><KpiCard label="30일 이내 소진" value={formatKpi(record, 'n_within_30d')} foot="우선 검토 대상" tone="warn" /><KpiCard label="평균 예상 소진일수" value={<>{formatKpi(record, 'avg_stockout_days')}<span className="metric-unit">일</span></>} foot="Projection 계산 가능 품목" /></div>
    <Panel className="section" title="품목별 소진 위험" description="Forecast 기반 기간별 Inventory Projection 요약"><DataTable columns={columns} rows={rows} rowKey={(r) => r.itemId} empty="데이터가 없습니다. Exposed schemas 와 analytics.v_stockout_risk 를 확인하세요." /></Panel>
    <Panel className="section" title="기간별 Inventory Projection" description="입고예정은 해당 기간에만 더하고, 확정수주·가예약·Forecast를 기간별로 반영합니다."><DataTable columns={projectionColumns} rows={projections} rowKey={(r) => `${r.itemId}-${r.period}`} empty="Projection 데이터가 없습니다. Forecast 실행과 Champion 선정을 먼저 확인하세요." /></Panel>
  </AnalysisFrame>;
}
