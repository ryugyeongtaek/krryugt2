'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getMenuBySection } from '@/lib/menu';

export default function Sidebar({ role = 'USER' }: { role?: 'USER' | 'ADMIN' }) {
  const pathname = usePathname();
  const groups = getMenuBySection(role);
  return <aside className="sidebar"><div className="brand"><div className="brand-mark">SCM</div><div className="brand-copy"><strong>월간 발주계획</strong><span>Supply Chain Management</span></div></div>{(['WORKFLOW', 'ANALYSIS', 'ADMIN'] as const).map((section) => groups[section].length > 0 && <div key={section}><div className="shell-nav-heading">{section}</div><nav className="shell-nav-group" aria-label={section}>{groups[section].map((item) => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link className={`nav-button shell-nav-link ${active ? 'active' : ''}`} href={item.href} key={item.id}><span className="nav-number"><Icon size={13} /></span><span>{item.label}</span></Link>; })}</nav></div>)}</aside>;
}
