import type { ReactNode } from 'react';

export default function PageHeader({ eyebrow = 'SCM ANALYSIS', title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="analysis-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions}</div>;
}
