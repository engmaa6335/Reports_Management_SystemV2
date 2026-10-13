import { supabase } from './supabase';

export interface BulkEntityInput {
  name_en: string;
  type: 'school' | 'tls_center';
  region_code: string;
  phone?: string;
  email?: string;
  emp_name?: string;
  emp_num?: string;
}

export interface BulkEntityResult {
  name_en: string;
  status: 'created' | 'skipped' | 'failed';
  entity_id?: string;
  error?: string;
}

export async function bulkImportEntities(
  entities: BulkEntityInput[]
): Promise<BulkEntityResult[]> {
  const { data, error } = await supabase.functions.invoke(
    'bulk-import-entities',
    { body: { entities } }
  );

  if (error) throw error;
  if (!data?.results) throw new Error('No results returned');

  return data.results;
}