import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  await requireUser('/analysis/model-comparison');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('analytics').from('v_model_performance').select('*').order('item_id').order('rank');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const headers = ['item_id','model_id','model_version','n_periods','wape','mape','bias','rmse','mae','baseline_improvement','rank','calculation_status','reason_code'];
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers.join(','), ...(data ?? []).map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="model-performance.csv"' } });
}
