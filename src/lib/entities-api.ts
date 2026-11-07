// src/lib/entities-api.ts
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

// ═══════════════════════════════════════════════════════════════════════
// ⭐ الأنواع المساعدة لنتيجة get_users_public_info
// ═══════════════════════════════════════════════════════════════════════

interface PublicUserInfo {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
}

// ⭐ Helper: تحقق من صحة UUID
function isValidId(id: string | undefined | null): id is string {
  return !!id && id !== 'undefined' && id !== 'null' && id.length > 10;
}

// ═══════════════════════════════════════════════════════════════════════
// List Entity Types
// ═══════════════════════════════════════════════════════════════════════

export async function listEntityTypes(): Promise<EntityType[]> {
  const { data, error } = await supabase
    .from('entity_types')
    .select('*')
    .eq('is_active', true)
    .order('hierarchy_level');

  if (error) throw error;
  return (data || []) as EntityType[];
}

// ═══════════════════════════════════════════════════════════════════════
// List Entities
// ═══════════════════════════════════════════════════════════════════════

export async function listEntities(
  filters: EntityFilters
): Promise<EntityWithRelations[]> {
  let query = supabase
    .from('entities')
    .select(`
      *,
      entity_type:entity_types!entity_type_id (
        id, code, name_ar, icon, color, hierarchy_level
      ),
      parent:entities!parent_id (
        id, name_ar,
        entity_type:entity_types ( code )
      )
    `)
    .order('name_ar');

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

  if (filters.regionId) {
    query = query.eq('region_id', filters.regionId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('❌ listEntities error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  let result = (data || []).map((row: any) => {
    const type = Array.isArray(row.entity_type) ? row.entity_type[0] : row.entity_type;
    const parent = Array.isArray(row.parent) ? row.parent[0] : row.parent;
    const parentType = parent?.entity_type;
    const parentTypeObj = Array.isArray(parentType) ? parentType[0] : parentType;

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
            entity_type_code: parentTypeObj?.code || null,
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

// ═══════════════════════════════════════════════════════════════════════
// Get Single Entity
// ═══════════════════════════════════════════════════════════════════════

export async function getEntityById(
  id: string
): Promise<EntityWithRelations | null> {
  if (!isValidId(id)) {
    console.warn('⚠️ getEntityById: invalid id:', id);
    return null;
  }

  const { data: row, error } = await supabase
    .from('entities')
    .select(`
      *,
      entity_type:entity_types!entity_type_id (
        id, code, name_ar, icon, color, hierarchy_level
      ),
      parent:entities!parent_id (
        id, name_ar,
        entity_type:entity_types ( code )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

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

  const r = row as any;
  const type = Array.isArray(r.entity_type) ? r.entity_type[0] : r.entity_type;
  const parent = Array.isArray(r.parent) ? r.parent[0] : r.parent;
  const parentType = parent?.entity_type;
  const parentTypeObj = Array.isArray(parentType) ? parentType[0] : parentType;

  return {
    id: r.id,
    entity_type_id: r.entity_type_id,
    parent_id: r.parent_id,
    code: r.code,
    name_ar: r.name_ar,
    name_en: r.name_en,
    region_id: r.region_id || null,
    address: r.address,
    contact_info: r.contact_info || {},
    metadata: r.metadata || {},
    is_active: r.is_active,
    created_at: r.created_at,
    updated_at: r.updated_at,
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
          entity_type_code: parentTypeObj?.code || null,
        }
      : null,
    region: null,
    children_count: childrenRes.count || 0,
    users_count: usersRes.count || 0,
    reports_count: reportsRes.count || 0,
  } as EntityWithRelations;
}

// ═══════════════════════════════════════════════════════════════════════
// Get Children
// ═══════════════════════════════════════════════════════════════════════

export async function getEntityChildren(
  parentId: string
): Promise<EntityWithRelations[]> {
  if (!isValidId(parentId)) {
    console.warn('⚠️ getEntityChildren: invalid id:', parentId);
    return [];
  }

  const { data, error } = await supabase
    .from('entities')
    .select(`
      *,
      entity_type:entity_types!entity_type_id (
        id, code, name_ar, icon, color, hierarchy_level
      )
    `)
    .eq('parent_id', parentId)
    .order('name_ar');

  if (error) throw error;

  return (data || []).map((row: any) => {
    const type = Array.isArray(row.entity_type) ? row.entity_type[0] : row.entity_type;
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

// ═══════════════════════════════════════════════════════════════════════
// ⭐ Get Users Linked to Entity — مُنمَّط بشكل صريح
// ═══════════════════════════════════════════════════════════════════════

export async function getEntityUsers(entityId: string): Promise<LinkedUser[]> {
  if (!isValidId(entityId)) {
    console.warn('⚠️ getEntityUsers: invalid id:', entityId);
    return [];
  }

  const { data, error } = await supabase
    .from('user_entity_roles')
    .select(`
      id, user_id, role_id, is_primary, started_at, ended_at,
      roles ( id, code, name_ar )
    `)
    .eq('entity_id', entityId)
    .is('ended_at', null);

  if (error) {
    console.error('❌ getEntityUsers error:', error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((r: any) => r.user_id).filter(Boolean))];

  // ⭐ نُنمّط نتيجة الـ RPC صراحةً
  const { data: usersData, error: usersError } = await supabase.rpc(
    'get_users_public_info',
    { p_user_ids: userIds }
  ) as { data: PublicUserInfo[] | null; error: any };

  if (usersError) {
    console.error('❌ get_users_public_info error:', usersError);
  }

  // ⭐ Map مُنمّط
  const userMap = new Map<string, PublicUserInfo>(
    (usersData || []).map((u) => [u.id, u])
  );

  return data.map((row: any) => {
    const user = userMap.get(row.user_id);
    return {
      assignment_id: row.id,
      user_id: row.user_id,
      full_name: user?.full_name ?? '—',
      email: user?.email ?? '—',
      role_code: row.roles?.code || '—',
      role_name: row.roles?.name_ar || '—',
      is_primary: row.is_primary || false,
      started_at: row.started_at,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// ⭐ Get Reports Linked to Entity — مُنمَّط
// ═══════════════════════════════════════════════════════════════════════

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
    .select(`
      id, status, created_at, created_by,
      form_templates ( name_ar )
    `)
    .eq('entity_id', entityId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ getEntityReports error:', error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  const creatorIds = [
    ...new Set(data.map((r: any) => r.created_by).filter(Boolean)),
  ];

  let creatorMap = new Map<string, PublicUserInfo>();

  if (creatorIds.length > 0) {
    // ⭐ نُنمّط نتيجة الـ RPC صراحةً
    const { data: creatorsData, error: creatorsError } = (await supabase.rpc(
      'get_users_public_info',
      { p_user_ids: creatorIds }
    )) as { data: PublicUserInfo[] | null; error: any };

    if (creatorsError) {
      console.error('❌ get_users_public_info error:', creatorsError);
    }

    creatorMap = new Map<string, PublicUserInfo>(
      (creatorsData || []).map((c) => [c.id, c])
    );
  }

  return data.map((row: any) => {
    const creator = creatorMap.get(row.created_by);
    return {
      id: row.id,
      template_name: row.form_templates?.name_ar || '—',
      status: row.status || 'active',
      created_at: row.created_at,
      created_by_name: creator?.full_name ?? '—',
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
// List Regions
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
// List Potential Parents
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
// Check Code Uniqueness
// ═══════════════════════════════════════════════════════════════════════

export async function isCodeTaken(
  code: string,
  excludeId?: string
): Promise<boolean> {
  if (!code.trim()) return false;

  let query = supabase
    .from('entities')
    .select('id')
    .eq('code', code.trim())
    .limit(1);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return !!data;
}

// ═══════════════════════════════════════════════════════════════════════
// Create Entity
// ═══════════════════════════════════════════════════════════════════════

export async function createEntity(
  payload: CreateEntityPayload
): Promise<{ id: string }> {
  const insertData: any = {
    entity_type_id: payload.entity_type_id,
    parent_id: payload.parent_id,
    name_ar: payload.name_ar.trim(),
    name_en: payload.name_en?.trim() || null,
    region_id: payload.region_id || null,
    address: payload.address?.trim() || null,
    contact_info: payload.contact_info,
    metadata: payload.metadata,
    is_active: payload.is_active,
  };

  if (payload.code?.trim()) {
    insertData.code = payload.code.trim();
  }

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
    const { data: fallback } = await supabase
      .from('entities')
      .select('id')
      .eq('name_ar', payload.name_ar.trim())
      .eq('entity_type_id', payload.entity_type_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallback?.id) return { id: fallback.id };

    throw new Error('لم يتم إرجاع ID الكيان — جرّب تحديث الصفحة');
  }

  return { id: newId };
}

// ═══════════════════════════════════════════════════════════════════════
// Update Entity
// ═══════════════════════════════════════════════════════════════════════

export async function updateEntity(
  id: string,
  payload: UpdateEntityPayload
): Promise<void> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.entity_type_id !== undefined)
    updates.entity_type_id = payload.entity_type_id;
  if (payload.parent_id !== undefined) updates.parent_id = payload.parent_id;
  if (payload.code !== undefined) updates.code = payload.code?.trim() || null;
  if (payload.name_ar !== undefined)
    updates.name_ar = payload.name_ar.trim();
  if (payload.name_en !== undefined)
    updates.name_en = payload.name_en?.trim() || null;
  if (payload.region_id !== undefined) updates.region_id = payload.region_id;
  if (payload.address !== undefined)
    updates.address = payload.address?.trim() || null;
  if (payload.contact_info !== undefined)
    updates.contact_info = payload.contact_info;
  if (payload.metadata !== undefined) updates.metadata = payload.metadata;
  if (payload.is_active !== undefined) updates.is_active = payload.is_active;

  const { error } = await supabase
    .from('entities')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════
// Soft Delete / Activate
// ═══════════════════════════════════════════════════════════════════════

export async function softDeleteEntity(id: string): Promise<void> {
  const { error } = await supabase
    .from('entities')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function activateEntity(id: string): Promise<void> {
  const { error } = await supabase
    .from('entities')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════
// Hard Delete Check + Execute
// ═══════════════════════════════════════════════════════════════════════

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
      .eq('entity_id', id)
      .eq('is_deleted', false),
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

// ═══════════════════════════════════════════════════════════════════════
// Entity Activity
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
// Stats
// ═══════════════════════════════════════════════════════════════════════

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