'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Boxes, Check, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck, FileSpreadsheet, FileText, Gauge, Layers3, PackageCheck, Settings2, ShoppingCart, Upload, Workflow, Wrench } from 'lucide-react';
import DashboardStep from '@/components/workflow/dashboard-step';
import DemandStep from '@/components/workflow/demand-step';
import SupplyStep from '@/components/workflow/supply-step';
import MasterStep from '@/components/workflow/master-step';
import CalculationStep from '@/components/workflow/calculation-step';
import ReportStep from '@/components/workflow/report-step';
import Sidebar from '@/components/shell/sidebar';
import { logoutAction } from '@/app/(auth)/login/logout';

export type StepId = 'dashboard' | 'demand' | 'supply' | 'master' | 'calculation' | 'report';

const steps: { id: StepId; label: string; short: string; kicker: string; icon: typeof Gauge }[] = [
  { id: 'dashboard', label: '전체 현황', short: '현황', kicker: 'OVERVIEW', icon: Gauge },
  { id: 'demand', label: '수요 확정', short: '수요', kicker: 'DEMAND', icon: BarChart3 },
  { id: 'supply', label: '재고·공급', short: '재고', kicker: 'SUPPLY', icon: Boxes },
  { id: 'master', label: '마스터 검증', short: '기준', kicker: 'MASTER DATA', icon: Settings2 },
  { id: 'calculation', label: '발주량 계산', short: '계산', kicker: 'CALCULATION', icon: ShoppingCart },
  { id: 'report', label: '보고자료', short: '보고', kicker: 'EXECUTIVE REPORT', icon: FileText },
];

export default function ProcurementApp({ role = 'USER' }: { role?: 'USER' | 'ADMIN' }) {
  const [active, setActive] = useState<StepId>('dashboard');
  const currentIndex = steps.findIndex((step) => step.id === active);
  const current = steps[currentIndex];
  const completedCount = Math.max(0, currentIndex);
  const navigate = (index: number) => setActive(steps[Math.max(0, Math.min(index, steps.length - 1))].id);
  const goNext = () => navigate(currentIndex + 1);
  const goBack = () => navigate(currentIndex - 1);

  const page = useMemo(() => {
    const props = { onNext: goNext, onBack: goBack };
    switch (active) {
      case 'demand': return <DemandStep {...props} />;
      case 'supply': return <SupplyStep {...props} />;
      case 'master': return <MasterStep {...props} />;
      case 'calculation': return <CalculationStep {...props} />;
      case 'report': return <ReportStep {...props} />;
      default: return <DashboardStep onStart={goNext} onOpenStep={setActive} />;
    }
  }, [active]);

  return (
    <div className="app-shell">
      <Sidebar role={role} />
      <main className="main">
        <header className="topbar">
          <div><div className="eyebrow">MONTHLY PROCUREMENT CONTROL</div><h1>{current.label}</h1></div>
          <div className="top-meta"><span className="local-badge">LOCAL PROTOTYPE</span><span>기준월도 <b>2026.09</b></span><form action={logoutAction}><button className="button quiet" type="submit">로그아웃</button></form></div>
        </header>
        <div className="content">
          <div className="progress-wrap">
            <div className="progress-track">
              {steps.map((step, index) => <div key={step.id} className="progress-step-wrap" style={{ display: 'contents' }}>
                <button className={`progress-step ${index === currentIndex ? 'active' : ''} ${index < currentIndex ? 'done' : ''}`} onClick={() => navigate(index)}>
                  <span className="progress-kicker">{step.kicker}</span>
                  <span className="progress-dot">{index < currentIndex ? <Check size={12} strokeWidth={3} /> : index + 1}</span>
                  <span className="progress-label">{step.label}</span>
                </button>
                {index < steps.length - 1 && <span className="progress-line" />}
              </div>)}
            </div>
            <div className="progress-caption"><span>전체 업무 플로우</span><span>{completedCount} / {steps.length - 1} 단계 진행</span></div>
          </div>
          {page}
        </div>
      </main>
    </div>
  );
}

export const Icons = { AlertTriangle, ClipboardCheck, CircleDollarSign, FileSpreadsheet, Layers3, PackageCheck, Upload, Workflow, Wrench };
