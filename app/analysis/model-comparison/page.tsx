import AnalysisFrame from '@/components/analysis/analysis-frame';
import ForecastOverlayChart from '@/components/chart/forecast-overlay-chart';
import EmptyValue from '@/components/ui/empty-value';
import Badge from '@/components/ui/badge';
import { getBacktestPerformances, getChampions, getComparisonPoints } from '@/lib/scm';

export const dynamic = 'force-dynamic';
const pct = (v: number | null) => v === null ? <EmptyValue reasonCode="METRIC_UNAVAILABLE" /> : `${(v * 100).toFixed(1)}%`;
export default async function ModelComparisonPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [{ rows: performance, error: performanceError }, { rows: champions }, { rows: points, error: pointsError }] = await Promise.all([getBacktestPerformances(), getChampions(), getComparisonPoints()]);
  if (performanceError || pointsError) return <AnalysisFrame title="Model Comparison" description="검증기간 Actual과 저장된 Forecast 결과를 비교합니다."><p className="text-danger">조회에 실패했습니다: {performanceError ?? pointsError}</p></AnalysisFrame>;
  const filteredPerformance = performance.filter((row) => (!params.sku || row.itemId.toLowerCase().includes(params.sku.toLowerCase())) && (!params.model || row.modelId === params.model) && (!params.run || row.forecastRunId === params.run));
  const filteredPoints = points.filter((row) => (!params.sku || row.itemId.toLowerCase().includes(params.sku.toLowerCase())) && (!params.model || row.modelId === params.model) && (!params.run || row.runId === params.run) && (!params.period || row.period === params.period));
  const champion = new Map(champions.map((c) => [`${c.backtestRunId}:${c.itemId}`, c.championModelId]));
  const models = Array.from(new Set(performance.map((row) => row.modelId)));
  const runs = Array.from(new Set(performance.map((row) => row.forecastRunId)));
  return <AnalysisFrame title="Model Comparison" description="저장된 Forecast Result와 Backtest Performance를 비교합니다. 모델 토글은 재실행 없이 화면만 필터링합니다."><form className="import-form" method="get"><input name="sku" placeholder="SKU 검색" defaultValue={params.sku} /><select name="model" defaultValue={params.model ?? ''}><option value="">모든 모델</option>{models.map((model) => <option key={model}>{model}</option>)}</select><select name="run" defaultValue={params.run ?? ''}><option value="">모든 Forecast Run</option>{runs.map((run) => <option key={run}>{run}</option>)}</select><input name="period" placeholder="기간 (YYYY-MM-01)" defaultValue={params.period} /><button className="button" type="submit">필터 적용</button></form><ForecastOverlayChart points={filteredPoints} /><div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>SKU</th><th>Model</th><th>WAPE</th><th>MAPE</th><th>Bias</th><th>RMSE</th><th>MAE</th><th>Rank</th><th>Champion</th></tr></thead><tbody>{filteredPerformance.map((row) => <tr key={`${row.backtestRunId}-${row.itemId}-${row.modelId}`}><td>{row.itemId}</td><td>{row.modelId}</td><td>{pct(row.wape)}</td><td>{pct(row.mape)}</td><td>{row.bias ?? <EmptyValue reasonCode={row.reasonCode ?? 'BIAS_UNAVAILABLE'} />}</td><td>{row.rmse ?? <EmptyValue reasonCode={row.reasonCode ?? 'RMSE_UNAVAILABLE'} />}</td><td>{row.mae ?? <EmptyValue reasonCode={row.reasonCode ?? 'MAE_UNAVAILABLE'} />}</td><td>{row.rank ?? <EmptyValue reasonCode={row.reasonCode ?? 'RANK_UNAVAILABLE'} />}</td><td>{champion.get(`${row.backtestRunId}:${row.itemId}`) === row.modelId && <Badge status="SAFE">Champion</Badge>}</td></tr>)}{filteredPerformance.length === 0 && <tr><td colSpan={9}><EmptyValue reasonCode="NO_BACKTEST_PERFORMANCE" /></td></tr>}</tbody></table></div></AnalysisFrame>;
}
