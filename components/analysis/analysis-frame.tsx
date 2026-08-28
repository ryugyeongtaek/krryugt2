import type { ReactNode } from 'react';
import PageHeader from '@/components/shell/page-header';
import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import { getRole } from '@/lib/auth';

export default async function AnalysisFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const role = (await getRole()) ?? 'USER';
  return <div className="app-shell"><Sidebar role={role} /><main className="main"><Topbar title={title} /><div className="content"><section className="analysis-page"><PageHeader eyebrow="ANALYSIS" title={title} description={description} actions={<span className="local-badge">SUPABASE LIVE</span>} />{children}</section></div></main></div>;
}
