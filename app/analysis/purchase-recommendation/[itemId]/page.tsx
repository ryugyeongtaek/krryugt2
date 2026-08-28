import AnalysisFrame from '@/components/analysis/analysis-frame';
import EmptyValue from '@/components/ui/empty-value';
import Panel from '@/components/ui/panel';
import { getInventoryProjections, getPurchaseRecommendations } from '@/lib/scm';

export const dynamic = 'force-dynamic';
export default async function PurchaseRecommendationDetail({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const decoded = decodeURIComponent(itemId);
  const [{ rows, error }, { rows: projections, error: projectionError }] = await Promise.all([getPurchaseRecommendations(decoded), getInventoryProjections()]);
  const recommendation = rows[0];
  const itemProjections = projections.filter((row) => row.itemId === decoded);
  const unavailableValue = (value: number | null, reasonCode: string | null) => value ?? <EmptyValue reasonCode={reasonCode ?? 'CALCULATION_UNAVAILABLE'} />;
  return <AnalysisFrame title={`${decoded} 발주 추천 상세`} description="Forecast → Inventory Projection → Safety Stock → Stockout → Purchase Recommendation 흐름을 확인합니다.">
    {(error || projectionError) && <p className="text-danger">조회에 실패했습니다: {error ?? projectionError}</p>}
    {!recommendation && !error && <EmptyValue reasonCode="NO_FORECAST" />}
    {recommendation && <><Panel title="계산 결과" description="계산 근거는 analytics.v_purchase_recommendation.calculation_trace에 저장됩니다."><div className="analysis-table-wrap"><table className="analysis-table"><tbody>{[['Forecast', recommendation.forecastQty],['확정수주', recommendation.confirmedOrderQty],['Demand Basis', recommendation.demandBasisQty],['Safety Stock', recommendation.safetyStock],['Available Inventory', recommendation.availableInventory],['Scheduled Receipt', recommendation.scheduledReceipt],['Required Qty', recommendation.requiredQty],['MOQ', recommendation.moq],['Pack Size', recommendation.packSize],['Recommended Qty', recommendation.recommendedQty],['Recommended Order Date', recommendation.recommendedOrderDate],['상태', recommendation.calculationStatus],['사유', recommendation.reasonCode]].map(([label, val]) => <tr key={String(label)}><th>{label}</th><td>{typeof val === 'number' ? `${val} EA` : val ?? <EmptyValue reasonCode={recommendation.reasonCode ?? 'CALCULATION_UNAVAILABLE'} />}</td></tr>)}</tbody></table></div></Panel><Panel title="Inventory Projection" description="STEP 9 저장 결과"><div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>기간</th><th>기초</th><th>입고</th><th>Forecast</th><th>기말</th><th>Risk</th></tr></thead><tbody>{itemProjections.map((p) => <tr key={p.period}><td>{p.period.slice(0,10)}</td><td>{unavailableValue(p.beginningInventory, p.reasonCode)}</td><td>{unavailableValue(p.scheduledReceipt, p.reasonCode)}</td><td>{unavailableValue(p.forecastDemand, p.reasonCode)}</td><td>{unavailableValue(p.endingProjectedInventory, p.reasonCode)}</td><td>{p.riskStatus}</td></tr>)}</tbody></table></div></Panel></>}
  </AnalysisFrame>;
}
