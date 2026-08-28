import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, BarChart3, Gauge, Settings2, Workflow } from 'lucide-react';

export type MenuRole = 'USER' | 'ADMIN';

export type MenuItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  roles: MenuRole[];
  section: 'WORKFLOW' | 'ANALYSIS' | 'ADMIN';
};

export const menuItems: MenuItem[] = [
  { id: 'workflow', label: '월간 발주계획', href: '/workflow', icon: Workflow, roles: ['USER', 'ADMIN'], section: 'WORKFLOW' },
  { id: 'leadtime', label: '리드타임 분석', href: '/analysis/leadtime', icon: BarChart3, roles: ['USER', 'ADMIN'], section: 'ANALYSIS' },
  { id: 'stockout', label: '소진 위험 분석', href: '/analysis/stockout', icon: AlertTriangle, roles: ['USER', 'ADMIN'], section: 'ANALYSIS' },
  { id: 'admin', label: '관리자 설정', href: '/admin', icon: Settings2, roles: ['ADMIN'], section: 'ADMIN' },
  { id: 'admin-users', label: '사용자 관리', href: '/admin/users', icon: Settings2, roles: ['ADMIN'], section: 'ADMIN' },
  { id: 'admin-forecast-settings', label: 'Forecast 설정', href: '/admin/forecast-settings', icon: Settings2, roles: ['ADMIN'], section: 'ADMIN' },
];

export function getMenuItems(role: MenuRole): MenuItem[] {
  return menuItems.filter((item) => item.roles.includes(role));
}

export function getMenuBySection(role: MenuRole) {
  return getMenuItems(role).reduce<Record<MenuItem['section'], MenuItem[]>>((groups, item) => {
    groups[item.section].push(item);
    return groups;
  }, { WORKFLOW: [], ANALYSIS: [], ADMIN: [] });
}

export const workflowMenuIcon = Gauge;
