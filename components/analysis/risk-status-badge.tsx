import { AlertTriangle, CircleHelp, ShieldCheck, Clock3 } from 'lucide-react';
import type { StockoutRiskStatus } from '@/lib/scm-model';
import Badge from '@/components/ui/badge';

const labels: Record<StockoutRiskStatus, string> = {
  SAFE: '안전',
  WARNING: '주의',
  CRITICAL: '위험',
  CALCULATION_UNAVAILABLE: '계산 불가',
  UNKNOWN: '판정 불가',
};

export default function RiskStatusBadge({ status }: { status: StockoutRiskStatus }) {
  const Icon = status === 'SAFE' ? ShieldCheck : status === 'WARNING' ? Clock3 : status === 'CRITICAL' ? AlertTriangle : CircleHelp;
  const normalized = status === 'SAFE' || status === 'WARNING' || status === 'CRITICAL' || status === 'CALCULATION_UNAVAILABLE' ? status : 'CALCULATION_UNAVAILABLE';
  return <Badge status={normalized}><Icon size={11} /> {labels[status]}</Badge>;
}
