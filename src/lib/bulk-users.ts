import { supabase } from './supabase';

export interface BulkUserInput {
  email: string;
  password: string;
  username: string;
  full_name: string;
  phone?: string;
  employee_number?: string;
  specialization_name?: string;
  regions: string[];
  subjects: string[];
}

export interface BulkUserResult {
  email: string;
  status: 'created' | 'skipped' | 'failed';
  user_id?: string;
  error?: string;
}

export async function bulkCreateUsers(
  users: BulkUserInput[]
): Promise<BulkUserResult[]> {
  const { data, error } = await supabase.functions.invoke(
    'bulk-create-users',
    { body: { users } }
  );

  if (error) throw error;
  if (!data?.results) throw new Error('No results returned');

  return data.results;
}