import type { ReactNode } from 'react';
import Badge, { type Status } from './badge';

export default function AlertRow({ status, message, detail }: { status: Status; message: string; detail?: ReactNode }) {
  return <div className={`ui-alert-row ${status === 'CRITICAL' ? 'critical' : ''}`}><div><strong>{message}</strong>{detail && <div className="muted">{detail}</div>}</div><Badge status={status} /></div>;
}
