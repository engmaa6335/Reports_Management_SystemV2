import { supabase } from './supabase';
import type { ParsedExcelRow } from './excel-template';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface BulkImportResult {
  job_id: string | null;
  dry_run: boolean;
  matched: number;
  unmatched: number;
  ambiguous: number;
  created: number;
  ended: number;
  errors: Array<{
    row: number;
    type: string;
    message: string;
    [key: string]: any;
  }>;
}

export interface BulkImportJob {
  id: string;
  job_type: string;
  file_name: string | null;
  status: string;
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  ambiguous_rows: number;
  created_rows: number;
  ended_rows: number;
  error_count: number;
  started_at: string;
  completed_at: string | null;
  rollback_at: string | null;
  executed_by: string | null;
}

export interface EntitySuggestion {
  entity_id: string;
  name_ar: string;
  name_en: string | null;
  match_type: string;
  requires_confirmation: boolean;
}

// ═══════════════════════════════════════════════════════════
// RPC Calls
// ═══════════════════════════════════════════════════════════

export async function bulkReassignFromExcel(
  rows: ParsedExcelRow[],
  metadata: { job_type: string; file_name: string; file_hash?: string },
  dryRun: boolean
): Promise<BulkImportResult> {
  const { data, error } = await supabase.rpc('bulk_reassign_from_excel', {
    p_rows: rows,
    p_job_metadata: metadata,
    p_dry_run: dryRun,
  });

  if (error) throw new Error(error.message);
  return data as BulkImportResult;
}

export async function rollbackBulkImport(
  jobId: string
): Promise<{ job_id: string; rolled_back: number }> {
  const { data, error } = await supabase.rpc('rollback_bulk_import', {
    p_job_id: jobId,
  });

  if (error) throw new Error(error.message);
  return data;
}

// ═══════════════════════════════════════════════════════════
// Resolve Entity Name
// ═══════════════════════════════════════════════════════════

export async function resolveEntityName(
  name: string
): Promise<EntitySuggestion[]> {
  const { data, error } = await supabase.rpc('resolve_entity_name', {
    p_name: name,
  });

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) return [];

  const entityIds = data.map((r: any) => r.entity_id);
  const { data: entities, error: entitiesError } = await supabase
    .from('entities')
    .select('id, name_ar, name_en')
    .in('id', entityIds);

  if (entitiesError) throw new Error(entitiesError.message);

  const entityMap = new Map((entities || []).map((e: any) => [e.id, e]));

  return data.map((r: any) => {
    const e = entityMap.get(r.entity_id);
    return {
      entity_id: r.entity_id,
      name_ar: e?.name_ar || '',
      name_en: e?.name_en || null,
      match_type: r.match_type,
      requires_confirmation: r.requires_confirmation,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════

export async function getBulkImportJobs(): Promise<BulkImportJob[]> {
  const { data, error } = await supabase
    .from('bulk_import_jobs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getBulkImportRows(jobId: string) {
  const { data, error } = await supabase
    .from('bulk_import_rows')
    .select('*')
    .eq('job_id', jobId)
    .order('row_number', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getUserOverrides(userId: string) {
  const { data, error } = await supabase
    .from('permission_overrides')
    .select(
      `
      *,
      permission:permissions(code, name_ar, qualifier),
      entity:entities(name_ar)
    `
    )
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAllPermissions() {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('category', { ascending: true })
    .order('resource', { ascending: true })
    .order('action', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getActiveRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('is_active', true)
    .order('hierarchy_level', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}