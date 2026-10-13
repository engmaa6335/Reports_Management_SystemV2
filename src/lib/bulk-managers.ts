import { supabase } from './supabase';

export interface BulkManagerInput {
  email: string;
  full_name: string;
  employee_number?: string;
  phone?: string;
  entity_name: string;
  entity_type: 'school' | 'tls_center';
}

export interface BulkManagerResult {
  email: string;
  full_name: string;
  entity_name: string;
  entity_type: string;
  status: 'created' | 'skipped' | 'failed';
  user_id?: string;
  entity_id?: string;
  error?: string;
}

export async function bulkImportManagers(
  managers: BulkManagerInput[],
  schoolPassword: string,
  tlsPassword: string
): Promise<BulkManagerResult[]> {
  const { data, error } = await supabase.functions.invoke(
    'bulk-import-managers',
    {
      body: {
        managers,
        schoolPassword,
        tlsPassword,
      },
    }
  );

  if (error) throw error;
  if (!data?.results) throw new Error('No results returned');

  return data.results;
}