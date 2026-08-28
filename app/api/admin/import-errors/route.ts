import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  await requireAdmin('/admin/data-management');
  const batchId = new URL(request.url).searchParams.get('batch_id');
  if (!batchId) return new NextResponse('batch_id가 필요합니다.', { status: 400 });
  const supabase = await createSupabaseServerClient();
  const [{ data: errors, error }, { data: rows }] = await Promise.all([
    supabase.schema('core').from('validation_error').select('*').eq('batch_id', batchId).in('severity', ['ERROR', 'WARNING']).order('row_number'),
    supabase.schema('core').from('import_staging').select('row_number,mapped_data').eq('batch_id', batchId).order('row_number'),
  ]);
  if (error) return new NextResponse(error.message, { status: 500 });
  const lines = ['row_number,error_code,error_message,severity,original_data'];
  for (const issue of errors ?? []) {
    const row = (rows ?? []).find((candidate) => candidate.row_number === issue.row_number);
    const values = JSON.stringify(row?.mapped_data ?? {}).replaceAll('"', '""');
    lines.push(`${issue.row_number},${issue.error_code},"${issue.error_message.replaceAll('"', '""')}",${issue.severity},"${values}"`);
  }
  return new NextResponse(`\uFEFF${lines.join('\n')}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="validation-errors-${batchId}.csv"` } });
}
