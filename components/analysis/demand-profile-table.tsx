'use client';

import { useMemo, useState } from 'react';
import DataTable, { formatNumber, type Column } from '@/components/analysis/data-table';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import type { DemandProfile, DemandType } from '@/lib/scm-model';

const demandTypeLabels: Record<DemandType, string> = {
  SMOOTH: 'Smooth',
  INTERMITTENT: 'Intermittent',
  ERRATIC: 'Erratic',
  LUMPY: 'Lumpy',
};

function demandTypeStatus(type: DemandType | null) {
  if (type === 'SMOOTH') return 'SAFE' as const;
  if (type === 'INTERMITTENT' || type === 'ERRATIC') return 'WARNING' as const;
  if (type === 'LUMPY') return 'CRITICAL' as const;
  return 'CALCULATION_UNAVAILABLE' as const;
}

function percentage(value: number | null, reasonCode = 'CALCULATION_UNAVAILABLE') {
  return value === null ? <EmptyValue reasonCode={reasonCode} /> : `${(value * 100).toFixed(1)}%`;
}

const columns: Column<DemandProfile>[] = [
  { key: 'itemId', label: 'SKU' },
  { key: 'itemName', label: '품목명', render: (row) => row.itemName ?? <EmptyValue reasonCode="ITEM_NAME_UNAVAILABLE" /> },
  { key: 'adi', label: 'ADI', align: 'right', render: (row) => row.adi === null ? <EmptyValue reasonCode={row.reasonCode ?? 'ADI_UNAVAILABLE'} /> : formatNumber(row.adi) },
  { key: 'cvSquared', label: 'CV²', align: 'right', render: (row) => row.cvSquared === null ? <EmptyValue reasonCode={row.reasonCode ?? 'CV_SQUARED_UNAVAILABLE'} /> : formatNumber(row.cvSquared) },
  { key: 'zeroDemandRate', label: 'Zero-demand Rate', align: 'right', render: (row) => percentage(row.zeroDemandRate) },
  { key: 'trend', label: 'Trend', align: 'right', render: (row) => row.trend === null ? <EmptyValue reasonCode={row.reasonCode ?? 'TREND_UNAVAILABLE'} /> : formatNumber(row.trend, '/월') },
  { key: 'demandType', label: 'Demand Type', render: (row) => <Badge status={demandTypeStatus(row.demandType)}>{row.demandType ? demandTypeLabels[row.demandType] : '계산 불가'}</Badge> },
  { key: 'seasonality', label: 'Seasonality', render: (row) => row.seasonality ?? <EmptyValue reasonCode={row.reasonCode ?? 'SEASONALITY_UNAVAILABLE'} /> },
  { key: 'reasonCode', label: 'Reason', render: (row) => row.reasonCode ? <span className="muted">{row.reasonCode}</span> : <EmptyValue /> },
];

export default function DemandProfileTable({ rows }: { rows: DemandProfile[] }) {
  const [type, setType] = useState<'ALL' | DemandType>('ALL');
  const [availability, setAvailability] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [query, setQuery] = useState('');
  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesType = type === 'ALL' || row.demandType === type;
    const matchesAvailability = availability === 'ALL' || (availability === 'AVAILABLE' ? row.demandType !== null : row.demandType === null);
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || row.itemId.toLowerCase().includes(normalizedQuery) || (row.itemName ?? '').toLowerCase().includes(normalizedQuery);
    return matchesType && matchesAvailability && matchesQuery;
  }), [availability, query, rows, type]);

  return <>
    <div className="demand-profile-filters" aria-label="Demand Profile 필터">
      <label>Demand Type<select value={type} onChange={(event) => setType(event.target.value as 'ALL' | DemandType)}><option value="ALL">전체</option><option value="SMOOTH">SMOOTH</option><option value="INTERMITTENT">INTERMITTENT</option><option value="ERRATIC">ERRATIC</option><option value="LUMPY">LUMPY</option></select></label>
      <label>계산 상태<select value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)}><option value="ALL">전체</option><option value="AVAILABLE">계산 가능</option><option value="UNAVAILABLE">계산 불가</option></select></label>
      <label>SKU 검색<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SKU 또는 품목명" /></label>
    </div>
    <DataTable columns={columns} rows={filteredRows} rowKey={(row) => row.itemId} empty="조건에 맞는 SKU가 없습니다." />
  </>;
}
