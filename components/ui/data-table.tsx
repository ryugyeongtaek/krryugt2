import type { ReactNode } from 'react';

export type UiColumn<T> = { key: string; label: string; align?: 'left' | 'right' | 'center'; render?: (row: T) => ReactNode };
export default function UiDataTable<T extends Record<string, unknown>>({ columns, rows, empty = '표시할 데이터가 없습니다.', rowKey }: { columns: UiColumn<T>[]; rows: T[]; empty?: ReactNode; rowKey?: (row: T, index: number) => string }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return <div className="analysis-table-wrap"><table className="analysis-table"><thead><tr>{columns.map((column) => <th key={column.key} style={column.align ? { textAlign: column.align } : undefined}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={rowKey?.(row, index) ?? String(index)}>{columns.map((column) => <td key={column.key} style={column.align ? { textAlign: column.align } : undefined}>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>;
}
