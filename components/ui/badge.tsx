import type { ReactNode } from 'react';

export type Status = 'SAFE' | 'WARNING' | 'CRITICAL' | 'CALCULATION_UNAVAILABLE';
const labels: Record<Status, string> = { SAFE: '정상', WARNING: '주의', CRITICAL: '위험', CALCULATION_UNAVAILABLE: '계산 불가' };

export default function Badge({ status, children }: { status: Status; children?: ReactNode }) {
  return <span className={`ui-badge tag ${status === 'SAFE' ? 'green' : status === 'WARNING' ? 'amber' : status === 'CRITICAL' ? 'red' : 'gray'}`} aria-label={labels[status]}>{children ?? labels[status]}</span>;
}
