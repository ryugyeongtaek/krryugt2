import { AlertTriangle, CircleHelp, ShieldCheck } from 'lucide-react';
import type { StockoutRiskStatus } from '@/lib/scm-model';

const labels: Record<StockoutRiskStatus, string> = {
  SAFE: '안전',
  CRITICAL: '위험',
  UNKNOWN: '판정 불가',
};

export default function RiskStatusBadge({ status }: { status: StockoutRiskStatus }) {
  const Icon = status === 'SAFE' ? ShieldCheck : status === 'CRITICAL' ? AlertTriangle : CircleHelp;
  const tone = status === 'SAFE' ? 'green' : status === 'CRITICAL' ? 'red' : 'gray';

  return <span className={`tag ${tone}`}><Icon size={11} /> {labels[status]}</span>;
}
