import ResetPasswordForm from './reset-password-form';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : '/workflow';
  return <ResetPasswordForm next={next} />;
}
