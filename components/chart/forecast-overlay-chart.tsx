'use client';

import { useMemo, useState } from 'react';
import type { ComparisonPoint } from '@/lib/scm-model';

export default function ForecastOverlayChart({ points }: { points: ComparisonPoint[] }) {
  const models = useMemo(() => Array.from(new Set(points.map((p) => p.modelId))), [points]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const active = (model: string) => enabled[model] !== false;
  const shown = points.filter((p) => active(p.modelId));
  const values = shown.flatMap((p) => [p.actualQty, p.p50, p.p80, p.p90].filter((v): v is number => v !== null));
  const max = Math.max(...values, 1);
  const periods = Array.from(new Set(points.map((p) => p.period)));
  const path = (model: string | 'ACTUAL', field: 'p50' | 'p80' | 'p90' | 'actualQty') => periods.map((period, i) => { const row = points.find((p) => p.period === period && (model === 'ACTUAL' ? p.actualQty !== null : p.modelId === model)); const value = row ? row[field] : null; return value === null || value === undefined ? '' : `${i * (760 / Math.max(periods.length - 1, 1))},${220 - (value / max) * 190}`; }).filter(Boolean).join(' ');
  return <div className="chart-surface"><div className="chart-legend"><label><input type="checkbox" checked={true} readOnly /> Actual</label>{models.map((model) => <label key={model}><input type="checkbox" checked={active(model)} onChange={(e) => setEnabled((old) => ({ ...old, [model]: e.target.checked }))} /> {model} (P50 · P80 · P90)</label>)}</div><svg viewBox="0 0 800 250" role="img" aria-label="검증기간 Actual과 모델별 Forecast 및 Prediction Interval 비교"><line x1="20" y1="220" x2="780" y2="220" className="chart-grid-line" /><polyline points={path('ACTUAL', 'actualQty')} className="chart-series-primary" strokeWidth="3" />{models.filter(active).map((model) => <g key={model}><polyline points={path(model, 'p50')} className="chart-series-muted" strokeWidth="2" /><polyline points={path(model, 'p80')} className="chart-series-interval" strokeWidth="1.5" /><polyline points={path(model, 'p90')} className="chart-series-interval" strokeWidth="1" strokeDasharray="4 3" /></g>)}</svg>{periods.length === 0 && <p className="muted">비교 가능한 저장 결과가 없습니다.</p>}</div>;
}
