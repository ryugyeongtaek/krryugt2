import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedRow } from './types';

export async function parseImportFile(file: File): Promise<{ columns: string[]; rows: ParsedRow[] }> {
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension === 'csv') {
    const result = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true });
    if (result.errors.length) throw new Error(`CSV_PARSE_ERROR: ${result.errors[0].message}`);
    const columns = result.meta.fields ?? [];
    return { columns, rows: result.data.map((values, index) => ({ rowNumber: index + 2, values })) };
  }
  if (extension === 'xlsx') {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    const columns = (matrix[0] ?? []).map(String);
    return { columns, rows: matrix.slice(1).map((row, index) => ({ rowNumber: index + 2, values: Object.fromEntries(columns.map((column, columnIndex) => [column, row[columnIndex] ?? ''])) })) };
  }
  throw new Error('UNSUPPORTED_FILE_TYPE: CSV 또는 XLSX 파일만 업로드할 수 있습니다.');
}
