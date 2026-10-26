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

export interface PageWithPermissions {
  code: string;
  name_ar: string;
  name_en: string | null;
  module: string;
  icon: string | null;
  order_index: number;
  supported_permissions: string[];
  permission_resource: string | null;
  permissions: Array<{
    id: string;
    code: string;
    action: string;
    name_ar: string;
    qualifier: string | null;
  }>;
}

export interface OrphanPermission {
  id: string;
  code: string;
  resource: string;
  action: string;
  name_ar: string;
  category: string;
  qualifier: string | null;
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

// ═══════════════════════════════════════════════════════════
// Pages + Permissions (for dynamic RolesPage)
// ═══════════════════════════════════════════════════════════

/**
 * Returns all active pages + their permissions grouped by permission_resource.
 * Each page shows the permissions whose `resource` matches its `permission_resource`.
 */
export async function getPagesWithPermissions(): Promise<PageWithPermissions[]> {
  // 1. Fetch all active pages
  const { data: pages, error: pagesError } = await supabase
    .from('pages')
    .select('code, name_ar, name_en, module, icon, order_index, supported_permissions, permission_resource')
    .eq('is_active', true)
    .order('order_index');

  if (pagesError) throw new Error(pagesError.message);

  // 2. Fetch all permissions
  const { data: permissions, error: permsError } = await supabase
    .from('permissions')
    .select('id, code, resource, action, name_ar, qualifier, category')
    .order('action');

  if (permsError) throw new Error(permsError.message);

  // 3. Group permissions by resource
  const permsByResource = new Map<string, typeof permissions>();
  for (const perm of permissions || []) {
    const list = permsByResource.get(perm.resource) || [];
    list.push(perm);
    permsByResource.set(perm.resource, list);
  }

  // 4. Build result — match via permission_resource
  const result: PageWithPermissions[] = (pages || []).map((page: any) => {
    const resource = page.permission_resource as string | null;
    const pagePerms = resource ? (permsByResource.get(resource) || []) : [];

    return {
      code: page.code,
      name_ar: page.name_ar,
      name_en: page.name_en,
      module: page.module,
      icon: page.icon,
      order_index: page.order_index,
      supported_permissions: page.supported_permissions || [],
      permission_resource: resource,
      permissions: pagePerms.map((p: any) => ({
        id: p.id,
        code: p.code,
        action: p.action,
        name_ar: p.name_ar || p.action,
        qualifier: p.qualifier,
      })),
    };
  });

  return result;
}

/**
 * Returns orphan permissions (not linked to any page).
 * E.g.: reports.create.rl_specialist, reports.create.tls_specialist,
 *       aggregates.create.qa_chief_rl, etc.
 */
export async function getOrphanPermissions(
  linkedResources: string[]
): Promise<OrphanPermission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('id, code, resource, action, name_ar, category, qualifier')
    .order('category')
    .order('resource')
    .order('action');

  if (error) throw new Error(error.message);

  // Filter client-side to exclude resources linked to a page
  const linkedSet = new Set(linkedResources);
  const orphans = (data || []).filter(
    (p: any) => !linkedSet.has(p.resource)
  );

  return orphans as OrphanPermission[];
}