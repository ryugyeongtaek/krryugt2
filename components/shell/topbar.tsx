import { logoutAction } from '@/app/(auth)/login/logout';

export default function Topbar({ title, subtitle = 'MONTHLY PROCUREMENT CONTROL' }: { title: string; subtitle?: string }) {
  return <header className="topbar"><div><div className="eyebrow">{subtitle}</div><h1>{title}</h1></div><div className="top-meta"><span className="local-badge">SUPABASE LIVE</span><span>기준월도 <b>2026.09</b></span><form action={logoutAction}><button className="button quiet" type="submit">로그아웃</button></form></div></header>;
}
