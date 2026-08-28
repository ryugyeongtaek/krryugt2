import { formatEmptyValue } from '@/lib/ui-model';

export default function EmptyValue({ reasonCode }: { reasonCode?: string }) {
  return <span className="ui-empty-value" title={reasonCode ? `사유: ${reasonCode}` : undefined}>{formatEmptyValue(null, reasonCode)}</span>;
}
