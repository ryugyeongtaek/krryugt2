import Link from 'next/link';
import AnalysisFrame from '@/components/analysis/analysis-frame';
import DataTable, { formatNumber, type Column } from '@/components/analysis/data-table';
import RiskStatusBadge from '@/components/analysis/risk-status-badge';
import EmptyValue from '@/components/ui/empty-value';
import Panel from '@/components/ui/panel';
import { getPurchaseRecommendations } from '@/lib/scm';
import type { PurchaseRecommendation } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';
const value = (v: number | null, reason = 'CALCULATION_UNAVAILABLE') => v == null ? <EmptyValue reasonCode={reason} /> : formatNumber(v, ' EA');
const date = (v: string | null) => v ? v.slice(0, 10) : <EmptyValue reasonCode="CALCULATION_UNAVAILABLE" />;
const columns: Column<PurchaseRecommendation>[] = [
  { key: 'itemId', label: 'SKU', render: (r) => <Link href={`/analysis/purchase-recommendation/${encodeURIComponent(r.itemId)}`}>{r.itemId}</Link> },
  { key: 'itemName', label: '품목명', render: (r) => r.itemName ?? <EmptyValue reasonCode="NO_ITEM_POLICY" /> },
  { key: 'riskStatus', label: 'Risk', render: (r) => <RiskStatusBadge status={r.riskStatus} /> },
  { key: 'forecastQty', label: 'Forecast', align: 'right', render: (r) => value(r.forecastQty, 'NO_FORECAST') },
  { key: 'confirmedOrderQty', label: '확정수주', align: 'right', render: (r) => value(r.confirmedOrderQty) },
  { key: 'availableInventory', label: '재고', align: 'right', render: (r) => value(r.availableInventory, 'NO_INVENTORY_DATA') },
  { key: 'safetyStock', label: 'Safety Stock', align: 'right', render: (r) => value(r.safetyStock) },
  { key: 'stockoutDate', label: '소진 기간', render: (r) => date(r.stockoutDate) },
  { key: 'requiredQty', label: 'Required', align: 'right', render: (r) => value(r.requiredQty) },
  { key: 'moq', label: 'MOQ', align: 'right', render: (r) => value(r.moq, 'NO_ITEM_POLICY') },
  { key: 'packSize', label: 'Pack', align: 'right', render: (r) => value(r.packSize, 'NO_ITEM_POLICY') },
  { key: 'recommendedQty', label: 'Recommended', align: 'right', render: (r) => r.calculationStatus === 'NO_ORDER_REQUIRED' ? '0 EA' : value(r.recommendedQty, r.reasonCode ?? 'CALCULATION_UNAVAILABLE') },
  { key: 'recommendedOrderDate', label: '권고일', render: (r) => <>{date(r.recommendedOrderDate)}{r.isImmediate && <span className="text-danger"> · 즉시</span>}</> },
];

export default async function PurchaseRecommendationPage() {
  const { rows, error } = await getPurchaseRecommendations();
  return <AnalysisFrame title="발주 추천" description="Forecast Accuracy와 Inventory Projection을 결합한 SKU별 안전재고·발주추천 결과입니다.">
    {error ? <div className="card"><p className="text-danger">조회에 실패했습니다.</p><p className="muted">{error}</p></div> : <Panel title="Purchase Recommendation" description="화면에서는 DB에 저장된 계산 결과와 계산 근거만 표시합니다."><DataTable columns={columns} rows={rows} rowKey={(r) => r.itemId} empty="추천 결과가 없습니다. Forecast, Champion, 재고와 정책 설정을 확인하세요." /></Panel>}
  </AnalysisFrame>;
}
