import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import EmptyValue from '@/components/ui/empty-value';
import { requireAdmin } from '@/lib/auth';
import { getLeadtimePolicies } from '@/lib/scm';
import { setLeadtimePolicyAction } from './actions';

export const dynamic = 'force-dynamic';
function Value({ value, reason = 'NO_LEADTIME' }: { value: unknown; reason?: string }) { return value === null || value === undefined || value === '' ? <EmptyValue reasonCode={reason} /> : <>{String(value)}</>; }

export default async function LeadtimePolicyPage() {
  await requireAdmin('/admin/scm-policies/lead-time');
  const { rows, error } = await getLeadtimePolicies();
  return <div className="app-shell"><Sidebar role="ADMIN" /><main className="main"><Topbar title="Lead Time 정책" subtitle="ADMIN / SCM POLICIES" /><div className="content"><PageHeader eyebrow="ADMIN / SCM POLICIES" title="Effective Lead Time 관리" description="관리자 확정값을 우선 적용하고, 없을 때만 실적 P80을 사용합니다. 모든 변경은 이력과 감사 로그에 기록됩니다." />{error && <p className="text-danger" role="alert">조회에 실패했습니다: {error}</p>}<Panel title="품목·공급처별 Lead Time" description="확정값이 없으면 Effective Lead Time은 P80 fallback입니다."><div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>Item</th><th>Supplier</th><th>실적</th><th>P50</th><th>P80</th><th>P90</th><th>확정값</th><th>Effective</th><th>적용일</th><th>변경 사유</th><th>변경</th></tr></thead><tbody>{rows.map((r, i) => <tr key={`${r.policyId ?? r.supplierId}-${r.itemId ?? i}`}><td><Value value={r.itemId} reason="ITEM_NOT_CONFIGURED" /></td><td><Value value={r.supplierName ?? r.supplierId} reason="SUPPLIER_NOT_CONFIGURED" /></td><td><Value value={r.actualLeadTime} /></td><td><Value value={r.p50} /></td><td><Value value={r.p80} /></td><td><Value value={r.p90} /></td><td><Value value={r.confirmedLeadTime} /></td><td><Value value={r.effectiveLeadTime} /></td><td><Value value={r.effectiveFrom} reason="EFFECTIVE_DATE_REQUIRED" /></td><td><Value value={r.reason} reason="REASON_REQUIRED" /></td><td><form action={setLeadtimePolicyAction} className="inline-form"><input type="hidden" name="item_id" value={r.itemId ?? ''} /><input type="hidden" name="supplier_id" value={r.supplierId ?? ''} /><input name="confirmed_lead_time" type="number" min="0.01" step="0.01" placeholder="확정 일수" aria-label="확정 리드타임" /><input name="effective_from" type="date" aria-label="적용일" /><input name="reason" required placeholder="변경 사유" aria-label="변경 사유" /><button className="button primary" type="submit">저장</button></form></td></tr>)}{rows.length === 0 && <tr><td colSpan={11}><EmptyValue reasonCode="NO_LEADTIME" /></td></tr>}</tbody></table></div></Panel></div></main></div>;
}
