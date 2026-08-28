import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import { requireAdmin } from '@/lib/auth';
import { getModelConfigs } from '@/lib/scm';
import { updateModelConfigAction } from './actions';

export default async function ForecastModelsPage() {
  await requireAdmin('/admin/forecast-models');
  const { rows, error } = await getModelConfigs();
  return <div className="app-shell"><Sidebar role="ADMIN" /><main className="main"><Topbar title="Forecast 모델" subtitle="MODEL REGISTRY" /><div className="content"><PageHeader eyebrow="ADMIN / FORECAST" title="Forecast 모델 관리" description="모델 활성화와 파라미터는 DB 설정으로 관리하며, 실행 시점에 버전을 스냅샷합니다." />{error ? <p className="text-danger">모델 조회에 실패했습니다: {error}</p> : <Panel title="Model Registry"><div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>모델명</th><th>Family</th><th>Engine</th><th>Version</th><th>상태</th><th>적용 Demand Type</th><th>Parameters / 저장</th></tr></thead><tbody>{rows.map((model) => <tr key={model.modelId}><td><strong>{model.modelName}</strong><br /><span className="muted">{model.modelId}</span></td><td>{model.family}</td><td>{model.engine}</td><td>{model.version}</td><td><Badge status={model.enabled ? 'SAFE' : 'WARNING'}>{model.enabled ? 'ENABLED' : 'DISABLED'}</Badge></td><td>{model.applicableDemandType.join(', ') || <EmptyValue reasonCode="NO_APPLICABLE_TYPE" />}</td><td><form action={updateModelConfigAction} className="model-config-form"><input type="hidden" name="model_id" value={model.modelId} /><input type="hidden" name="enabled" value={model.enabled ? 'false' : 'true'} /><textarea name="parameters" defaultValue={JSON.stringify(model.parameters)} aria-label={`${model.modelId} parameters`} /><button className="button primary" type="submit">{model.enabled ? '비활성화 · 저장' : '활성화 · 저장'}</button></form></td></tr>)}{rows.length === 0 && <tr><td colSpan={7}><EmptyValue reasonCode="NO_MODEL_CONFIG" /></td></tr>}</tbody></table></div></Panel>}</div></main></div>;
}
