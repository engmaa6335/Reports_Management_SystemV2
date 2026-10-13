import { supabase } from './supabase';
import type {
  EntityType,
  EntityWithRelations,
  EntityFilters,
  CreateEntityPayload,
  UpdateEntityPayload,
  EntityActivity,
  EntityStats,
  LinkedUser,
  LinkedReport,
} from '../types/entities';

// ⭐ Helper: تحقق من صحة UUID
function isValidId(id: string | undefined | null): id is string {
  return !!id && id !== 'undefined' && id !== 'null' && id.length > 10;
}

// ================================================
// List Entity Types
// ================================================

export async function listEntityTypes(): Promise<EntityType[]> {
  const { data, error } = await supabase
    .from('entity_types')
    .select('*')
    .eq('is_active', true)
    .order('hierarchy_level');

  if (error) throw error;
  return (data || []) as EntityType[];
}

// ================================================
// List Entities
// ================================================

export async function listEntities(
  filters: EntityFilters
): Promise<EntityWithRelations[]> {
  let query = supabase.from('entities').select('*').order('name_ar');

  if (filters.search) {
    query = query.or(
      `name_ar.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,code.ilike.%${filters.search}%`
    );
  }

  if (filters.isActive !== null) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters.parentId) {
    query = query.eq('parent_id', filters.parentId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('❌ listEntities error:', error);
    throw error;
  }

  const { data: types } = await supabase
    .from('entity_types')
    .select('id, code, name_ar, icon, color, hierarchy_level');

  const typeMap = new Map<string, any>(
    (types || []).map((t: any) => [t.id, t])
  );

  const parentMap = new Map<string, any>(
    (data || []).map((e: any) => [e.id, e])
  );

  let result = (data || []).map((row: any) => {
    const type = typeMap.get(row.entity_type_id);
    const parent = row.parent_id ? parentMap.get(row.parent_id) : null;
    const parentType = parent ? typeMap.get(parent.entity_type_id) : null;

    return {
      id: row.id,
      entity_type_id: row.entity_type_id,
      parent_id: row.parent_id,
      code: row.code,
      name_ar: row.name_ar,
      name_en: row.name_en,
      region_id: row.region_id || null,
      address: row.address,
      contact_info: row.contact_info || {},
      metadata: row.metadata || {},
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      entity_type: type
        ? {
            id: type.id,
            code: type.code,
            name_ar: type.name_ar,
            icon: type.icon,
            color: type.color,
            hierarchy_level: type.hierarchy_level,
          }
        : null,
      parent: parent
        ? {
            id: parent.id,
            name_ar: parent.name_ar,
            entity_type_code: parentType?.code || null,
          }
        : null,
      region: null,
    };
  });

  if (filters.typeCode) {
    result = result.filter((e) => e.entity_type?.code === filters.typeCode);
  }

  return result as EntityWithRelations[];
}

// ================================================
// Get Single Entity
// ================================================

export async function getEntityById(
  id: string
): Promise<EntityWithRelations | null> {
  if (!isValidId(id)) {
    console.warn('⚠️ getEntityById: invalid id:', id);
    return null;
  }

  const { data: row, error } = await supabase
    .from('entities')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const { data: type } = await supabase
    .from('entity_types')
    .select('id, code, name_ar, icon, color, hierarchy_level')
    .eq('id', row.entity_type_id)
    .maybeSingle();

  let parent: any = null;
  let parentType: any = null;
  if (row.parent_id) {
    const { data: p } = await supabase
      .from('entities')
      .select('id, name_ar, entity_type_id')
      .eq('id', row.parent_id)
      .maybeSingle();
    parent = p;

    if (p?.entity_type_id) {
      const { data: pt } = await supabase
        .from('entity_types')
        .select('code')
        .eq('id', p.entity_type_id)
        .maybeSingle();
      parentType = pt;
    }
  }

  const [childrenRes, usersRes, reportsRes] = await Promise.all([
    supabase
      .from('entities')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', id)
      .eq('is_active', true),
    supabase
      .from('user_entity_roles')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', id)
      .is('ended_at', null),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', id)
      .eq('is_deleted', false),
  ]);

  return {
    id: row.id,
    entity_type_id: row.entity_type_id,
    parent_id: row.parent_id,
    code: row.code,
    name_ar: row.name_ar,
    name_en: row.name_en,
    region_id: row.region_id || null,
    address: row.address,
    contact_info: row.contact_info || {},
    metadata: row.metadata || {},
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    entity_type: type
      ? {
          id: type.id,
          code: type.code,
          name_ar: type.name_ar,
          icon: type.icon,
          color: type.color,
          hierarchy_level: type.hierarchy_level,
        }
      : null,
    parent: parent
      ? {
          id: parent.id,
          name_ar: parent.name_ar,
          entity_type_code: parentType?.code || null,
        }
      : null,
    region: null,
    children_count: childrenRes.count || 0,
    users_count: usersRes.count || 0,
    reports_count: reportsRes.count || 0,
  } as EntityWithRelations;
}

// ================================================
// Get Children
// ================================================

export async function getEntityChildren(
  parentId: string
): Promise<EntityWithRelations[]> {
  if (!isValidId(parentId)) {
    console.warn('⚠️ getEntityChildren: invalid id:', parentId);
    return [];
  }

  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .eq('parent_id', parentId)
    .order('name_ar');

  if (error) throw error;

  const { data: types } = await supabase
    .from('entity_types')
    .select('id, code, name_ar, icon, color, hierarchy_level');

  const typeMap = new Map<string, any>(
    (types || []).map((t: any) => [t.id, t])
  );

  return (data || []).map((row: any) => {
    const type = typeMap.get(row.entity_type_id);
    return {
      id: row.id,
      entity_type_id: row.entity_type_id,
      parent_id: row.parent_id,
      code: row.code,
      name_ar: row.name_ar,
      name_en: row.name_en,
      region_id: row.region_id || null,
      address: row.address,
      contact_info: row.contact_info || {},
      metadata: row.metadata || {},
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      entity_type: type
        ? {
            id: type.id,
            code: type.code,
            name_ar: type.name_ar,
            icon: type.icon,
            color: type.color,
            hierarchy_level: type.hierarchy_level,
          }
        : null,
      parent: null,
      region: null,
    };
  }) as EntityWithRelations[];
}

// ================================================
// Get Users Linked to Entity
// ================================================

export async function getEntityUsers(entityId: string): Promise<LinkedUser[]> {
  if (!isValidId(entityId)) {
    console.warn('⚠️ getEntityUsers: invalid id:', entityId);
    return [];
  }

  const { data, error } = await supabase
    .from('user_entity_roles')
    .select(
      `
      id, user_id, role_id, is_primary, started_at, ended_at,
      users!user_entity_roles_user_id_fkey ( id, full_name, email ),
      roles ( id, code, name_ar )
      `
    )
    .eq('entity_id', entityId)
    .is('ended_at', null);

  if (error) {
    console.error('❌ getEntityUsers error:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    assignment_id: row.id,
    user_id: row.user_id,
    full_name: row.users?.full_name || '—',
    email: row.users?.email || '—',
    role_code: row.roles?.code || '—',
    role_name: row.roles?.name_ar || '—',
    is_primary: row.is_primary || false,
    started_at: row.started_at,
  }));
}

// ================================================
// Get Reports Linked to Entity
// ================================================

export async function getEntityReports(
  entityId: string,
  limit: number = 20
): Promise<LinkedReport[]> {
  if (!isValidId(entityId)) {
    console.warn('⚠️ getEntityReports: invalid id:', entityId);
    return [];
  }

  const { data, error } = await supabase
    .from('reports')
    .select(
      `
      id, status, created_at,
      form_templates ( name_ar ),
      users!reports_created_by_fkey ( full_name )
      `
    )
    .eq('entity_id', entityId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ getEntityReports error:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    template_name: row.form_templates?.name_ar || '—',
    status: row.status || 'active',
    created_at: row.created_at,
    created_by_name: row.users?.full_name || '—',
  }));
}

// ================================================
// List Regions
// ================================================

export async function listRegions(): Promise<
  { id: string; name_ar: string; code: string | null }[]
> {
  const { data: regionType } = await supabase
    .from('entity_types')
    .select('id')
    .eq('code', 'region')
    .single();

  if (!regionType) return [];

  const { data, error } = await supabase
    .from('entities')
    .select('id, name_ar, code')
    .eq('entity_type_id', regionType.id)
    .eq('is_active', true)
    .order('name_ar');

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    name_ar: row.name_ar,
    code: row.code,
  }));
}

// ================================================
// List Potential Parents
// ================================================

export async function listPotentialParents(
  typeCode: string
): Promise<
  { id: string; name_ar: string; entity_type_code: string | null }[]
> {
  let parentTypeCodes: string[] = [];

  switch (typeCode) {
    case 'edc':
      return [];
    case 'edu_unit':
    case 'qa_unit':
    case 'region':
      parentTypeCodes = ['edc'];
      break;
    case 'school':
    case 'tls_center':
      parentTypeCodes = ['region'];
      break;
    default:
      parentTypeCodes = [];
  }

  if (parentTypeCodes.length === 0) return [];

  const { data: types } = await supabase
    .from('entity_types')
    .select('id, code')
    .in('code', parentTypeCodes);

  if (!types || types.length === 0) return [];

  const typeIds = types.map((t: any) => t.id);
  const typeMap = new Map<string, string>(
    types.map((t: any) => [t.id, t.code])
  );

  const { data, error } = await supabase
    .from('entities')
    .select('id, name_ar, entity_type_id')
    .in('entity_type_id', typeIds)
    .eq('is_active', true)
    .order('name_ar');

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    name_ar: row.name_ar,
    entity_type_code: typeMap.get(row.entity_type_id) || null,
  }));
}

// ================================================
// Check Code Uniqueness
// ================================================

export async function isCodeTaken(
  code: string,
  excludeId?: string
): Promise<boolean> {
  if (!code.trim()) return false;

  let query = supabase
    .from('entities')
    .select('id', { count: 'exact', head: true })
    .eq('code', code.trim());

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return (count || 0) > 0;
}

// ================================================
// Create Entity — حل مشكلة undefined id
// ================================================

export async function createEntity(
  payload: CreateEntityPayload
): Promise<{ id: string }> {
  const insertData: any = {
    entity_type_id: payload.entity_type_id,
    parent_id: payload.parent_id,
    name_ar: payload.name_ar.trim(),
    name_en: payload.name_en?.trim() || null,
    address: payload.address?.trim() || null,
    contact_info: payload.contact_info,
    metadata: payload.metadata,
    is_active: payload.is_active,
  };

  if (payload.code?.trim()) {
    insertData.code = payload.code.trim();
  }

  // ⭐ استخدام .select() بدون .single() — لضمان إرجاع ID
  const { data, error } = await supabase
    .from('entities')
    .insert(insertData)
    .select('id');

  if (error) {
    console.error('❌ createEntity error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.error('❌ createEntity: empty response');
    throw new Error('لم يتم إرجاع بيانات الكيان');
  }

  const newId = data[0]?.id;

  if (!newId) {
    console.error('❌ createEntity: no id in response', data[0]);

    // ⭐ Fallback: البحث بالاسم
    const { data: fallback } = await supabase
      .from('entities')
      .select('id')
      .eq('name_ar', payload.name_ar.trim())
      .eq('entity_type_id', payload.entity_type_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallback?.id) {
      console.log('✅ Found via fallback:', fallback.id);
      return { id: fallback.id };
    }

    throw new Error('لم يتم إرجاع ID الكيان — جرّب تحديث الصفحة');
  }

  console.log('✅ Entity created:', newId);
  return { id: newId };
}

// ================================================
// Update Entity
// ================================================

export async function updateEntity(
  id: string,
  payload: UpdateEntityPayload
): Promise<void> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.entity_type_id !== undefined)
    updates.entity_type_id = payload.entity_type_id;
  if (payload.parent_id !== undefined)
    updates.parent_id = payload.parent_id;
  if (payload.code !== undefined)
    updates.code = payload.code?.trim() || null;
  if (payload.name_ar !== undefined)
    updates.name_ar = payload.name_ar.trim();
  if (payload.name_en !== undefined)
    updates.name_en = payload.name_en?.trim() || null;
  if (payload.address !== undefined)
    updates.address = payload.address?.trim() || null;
  if (payload.contact_info !== undefined)
    updates.contact_info = payload.contact_info;
  if (payload.metadata !== undefined)
    updates.metadata = payload.metadata;
  if (payload.is_active !== undefined)
    updates.is_active = payload.is_active;

  const { error } = await supabase
    .from('entities')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

// ================================================
// Soft Delete
// ================================================

export async function softDeleteEntity(id: string): Promise<void> {
  const { error } = await supabase
    .from('entities')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

// ================================================
// Activate
// ================================================

export async function activateEntity(id: string): Promise<void> {
  const { error } = await supabase
    .from('entities')
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

// ================================================
// Hard Delete Check
// ================================================

export async function canHardDelete(
  id: string
): Promise<{ canDelete: boolean; reason?: string }> {
  const [childrenRes, usersRes, reportsRes] = await Promise.all([
    supabase
      .from('entities')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', id),
    supabase
      .from('user_entity_roles')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', id),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', id),
  ]);

  if ((childrenRes.count || 0) > 0) {
    return {
      canDelete: false,
      reason: `يحتوي على ${childrenRes.count} كيان فرعي`,
    };
  }

  if ((usersRes.count || 0) > 0) {
    return {
      canDelete: false,
      reason: `مرتبط بـ ${usersRes.count} مستخدم`,
    };
  }

  if ((reportsRes.count || 0) > 0) {
    return {
      canDelete: false,
      reason: `مرتبط بـ ${reportsRes.count} تقرير`,
    };
  }

  return { canDelete: true };
}

export async function hardDeleteEntity(id: string): Promise<void> {
  const check = await canHardDelete(id);
  if (!check.canDelete) {
    throw new Error(check.reason || 'لا يمكن حذف هذا الكيان');
  }

  const { error } = await supabase.from('entities').delete().eq('id', id);
  if (error) throw error;
}

// ================================================
// Entity Activity
// ================================================

export async function getEntityActivity(
  entityId: string,
  limit: number = 50
): Promise<EntityActivity[]> {
  if (!isValidId(entityId)) {
    console.warn('⚠️ getEntityActivity: invalid id:', entityId);
    return [];
  }

  const { data, error } = await supabase
    .from('audit_log')
    .select(
      'id, action, resource_type, resource_id, changes, metadata, created_at'
    )
    .eq('resource_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as EntityActivity[];
}

// ================================================
// Stats
// ================================================

export async function getEntityStats(): Promise<EntityStats> {
  const { data, error } = await supabase
    .from('entities')
    .select('id, is_active, entity_type_id');

  if (error) throw error;

  const { data: types } = await supabase
    .from('entity_types')
    .select('id, code');

  const typeMap = new Map<string, string>(
    (types || []).map((t: any) => [t.id, t.code])
  );

  const stats: EntityStats = {
    total: 0,
    active: 0,
    inactive: 0,
    byType: {},
  };

  (data || []).forEach((row: any) => {
    stats.total++;
    if (row.is_active) stats.active++;
    else stats.inactive++;

    const code = typeMap.get(row.entity_type_id) || 'unknown';
    stats.byType[code] = (stats.byType[code] || 0) + 1;
  });

  return stats;
}