import Sidebar from '@/components/shell/sidebar';
import Topbar from '@/components/shell/topbar';
import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';

export default function AdminPage() {
  return <div className="app-shell"><Sidebar role="ADMIN" /><main className="main"><Topbar title="관리자 설정" /><div className="content"><PageHeader eyebrow="ADMIN" title="관리자 설정" description="공급처 기준과 시스템 운영 설정을 관리합니다." /><Panel title="관리 메뉴 준비 중" description="관리자 전용 기능은 다음 단계에서 연결됩니다."><p className="muted">현재는 route group과 메뉴 권한 분리를 위한 기반 화면입니다.</p></Panel></div></main></div>;
}
