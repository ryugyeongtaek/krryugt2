import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ImportMode, ImportType, ParsedRow, ValidationIssue } from './types';

export async function stageImport(input: { fileName: string; importType: ImportType; importMode: ImportMode; rows: ParsedRow[]; issues: ValidationIssue[] }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('stage_import', {
    p_file_name: input.fileName, p_import_type: input.importType, p_import_mode: input.importMode,
    p_rows: input.rows.map((row) => ({ row_number: row.rowNumber, mapped_data: row.values })),
    p_errors: input.issues.map((issue) => ({ ...issue, original_value: issue.originalValue === undefined ? null : String(issue.originalValue) })),
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function importBatch(batchId: string, replaceConfirmed: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('import_batch', { p_batch_id: batchId, p_replace_confirmed: replaceConfirmed });
  if (error) throw new Error(error.message);
  return data;
}

export async function rollbackBatch(batchId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('rollback_batch', { p_batch_id: batchId });
  if (error) throw new Error(error.message);
}
