import ProcurementApp from '@/components/procurement-app';
import { requireUser } from '@/lib/auth';

export default async function LegacyWorkflowPage() {
  const user = await requireUser('/workflow');
  return <ProcurementApp role={user.role} />;
}
