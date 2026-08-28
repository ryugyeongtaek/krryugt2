import type { ReactNode } from 'react';

export default function Panel({ title, description, actions, children, className = '' }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><>{(title || description || actions) && <div className="ui-panel-heading"><div>{title && <h3>{title}</h3>}{description && <p className="muted">{description}</p>}</div>{actions}</div>}</>{children}</section>;
}
