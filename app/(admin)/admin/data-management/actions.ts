'use server';

import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { parseImportFile } from '@/lib/import/parse';
import { importSchemas, suggestMapping } from '@/lib/import/schema';
import { stageImport, importBatch, rollbackBatch } from '@/lib/import/repository';
import { validateRows } from '@/lib/import/validate';
import type { ImportMode, ImportType } from '@/lib/import/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function prepareImportAction(formData: FormData) {
  await requireAdmin('/admin/data-management');
  const file = formData.get('file');
  const importType = String(formData.get('import_type') ?? '') as ImportType;
  const importMode = String(formData.get('import_mode') ?? 'append') as ImportMode;
  if (!(file instanceof File) || !file.size) redirect('/admin/data-management?error=FILE_REQUIRED');
  if (!importSchemas[importType]) redirect('/admin/data-management?error=IMPORT_TYPE_NOT_ALLOWED');
  const parsed = await parseImportFile(file);
  const { data: savedMappings } = await (await createSupabaseServerClient()).schema('core').from('column_mapping').select('source_column,target_column').eq('import_type', importType);
  const suggestions = suggestMapping(parsed.columns, importType, Object.fromEntries((savedMappings ?? []).map((mapping) => [mapping.source_column, mapping.target_column])));
  const mappedRows = parsed.rows.map((row) => ({ rowNumber: row.rowNumber, values: Object.fromEntries(suggestions.filter((mapping) => mapping.targetColumn).map((mapping) => [mapping.targetColumn!, row.values[mapping.sourceColumn]])) }));
  const supabase = await createSupabaseServerClient();
  const [{ data: items }, { data: suppliers }] = await Promise.all([
    supabase.schema('core').from('v_item_master').select('item_id'),
    supabase.schema('core').from('v_leadtime_gap').select('supplier_id'),
  ]);
  const issues = validateRows(importType, mappedRows, { itemIds: new Set((items ?? []).map((row) => row.item_id)), supplierIds: new Set((suppliers ?? []).map((row) => row.supplier_id)) });
  const batchId = await stageImport({ fileName: file.name, importType, importMode, rows: mappedRows, issues });
  await (await createSupabaseServerClient()).schema('core').from('column_mapping').upsert(suggestions.filter((mapping) => mapping.targetColumn).map((mapping) => ({ import_type: importType, source_column: mapping.sourceColumn, target_column: mapping.targetColumn, used_by: null })), { onConflict: 'import_type,source_column' });
  redirect(`/admin/data-management?batch=${encodeURIComponent(batchId)}`);
}

export async function confirmImportAction(formData: FormData) {
  await requireAdmin('/admin/data-management');
  const batchId = String(formData.get('batch_id') ?? '');
  const replaceConfirmed = formData.get('replace_confirmed') === 'true';
  try { await importBatch(batchId, replaceConfirmed); redirect('/admin/data-management?imported=true'); }
  catch (error) { redirect(`/admin/data-management?error=${encodeURIComponent(error instanceof Error ? error.message : 'IMPORT_FAILED')}`); }
}

export async function rollbackBatchAction(formData: FormData) {
  await requireAdmin('/admin/data-management');
  try { await rollbackBatch(String(formData.get('batch_id') ?? '')); redirect('/admin/data-management?rolled_back=true'); }
  catch (error) { redirect(`/admin/data-management?error=${encodeURIComponent(error instanceof Error ? error.message : 'ROLLBACK_FAILED')}`); }
}
