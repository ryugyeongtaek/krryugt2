export type EmptyReason = 'NO_USAGE' | 'NO_LEADTIME' | 'CALCULATION_UNAVAILABLE' | string;

export function formatEmptyValue(value: number | string | null | undefined, reasonCode?: EmptyReason) {
  if (value !== null && value !== undefined && value !== '') return String(value);
  return reasonCode ? `— + ${reasonCode}` : '—';
}
