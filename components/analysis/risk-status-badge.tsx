import { AlertTriangle, CircleHelp, ShieldCheck } from 'lucide-react';
import type { StockoutRiskStatus } from '@/lib/scm-model';
import Badge from '@/components/ui/badge';

const labels: Record<StockoutRiskStatus, string> = {
  SAFE: '안전',
  CRITICAL: '위험',
  UNKNOWN: '판정 불가',
};

export default function RiskStatusBadge({ status }: { status: StockoutRiskStatus }) {
  const Icon = status === 'SAFE' ? ShieldCheck : status === 'CRITICAL' ? AlertTriangle : CircleHelp;
  const normalized = status === 'SAFE' ? 'SAFE' : status === 'CRITICAL' ? 'CRITICAL' : 'CALCULATION_UNAVAILABLE';
  return <Badge status={normalized}><Icon size={11} /> {labels[status]}</Badge>;
}
