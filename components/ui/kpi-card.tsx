import type { ReactNode } from 'react';

export default function KpiCard({ label, value, foot, tone }: { label: string; value: ReactNode; foot?: ReactNode; tone?: 'good' | 'warn' | 'danger' }) {
  return <article className="card metric ui-kpi-card"><div className="metric-label">{label}</div><div className="metric-value">{value}</div>{foot && <div className={`metric-foot ${tone ?? ''}`}>{foot}</div>}</article>;
}
