import type { ReactNode } from 'react';

export default function InsightBanner({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <aside className="ui-insight-banner" role="note">{icon}<div>{children}</div></aside>;
}
