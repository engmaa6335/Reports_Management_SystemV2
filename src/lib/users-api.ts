import { supabase } from './supabase';
import type {
  User,
  UserWithRoles,
  UserRoleAssignment,
  Role,
  Entity,
  UsersFilters,
  CreateUserPayload,
  UserActivity,
} from '../types/users';

// ================================================
// Helper: Map row to UserWithRoles
// ================================================

function mapUserRow(row: any): UserWithRoles {
  return {
    id: row.id,
    auth_user_id: row.auth_user_id,
    username: row.username,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone,
    avatar_url: row.avatar_url,
    preferred_language: row.preferred_language,
    timezone: row.timezone,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    roles: (row.roles || [])
      .filter((r: any) => r.assignment_id)
      .map((r: any) => ({
        assignment_id: r.assignment_id,
        role_id: r.role_id,
        role_code: r.role_code,
        role_name: r.role_name,
        entity_id: r.entity_id,
        entity_name: r.entity_name,
        entity_type: r.entity_type,
        region_name: r.region_name,
        is_primary: r.is_primary,
        started_at: r.started_at,
        ended_at: r.ended_at,
      })),
  };
}

// ================================================
// List Users
// ================================================

export async function listUsers(filters: UsersFilters): Promise<UserWithRoles[]> {
  let query = supabase
    .from('users')
    .select(`
      id, auth_user_id, username, email, full_name, phone, avatar_url,
      preferred_language, timezone, is_active, last_login_at, metadata,
      created_at, updated_at,
      user_entity_roles!user_entity_roles_user_id_fkey (
        id,
        role_id,
        entity_id,
        is_primary,
        started_at,
        ended_at,
        roles ( id, code, name_ar ),
        entities ( id, name_ar, region_id, entity_types ( code ) )
      )
    `)
    .order('full_name');

  // Search
  if (filters.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,username.ilike.%${filters.search}%`
    );
  }

  // Active filter
  if (filters.isActive !== null) {
    query = query.eq('is_active', filters.isActive);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Transform + client-side filter by role/region
  let users = (data || []).map((row: any) => {
    const roles = (row.user_entity_roles || [])
      .filter((uer: any) => !uer.ended_at)
      .map((uer: any) => ({
        assignment_id: uer.id,
        role_id: uer.role_id,
        role_code: uer.roles?.code,
        role_name: uer.roles?.name_ar,
        entity_id: uer.entity_id,
        entity_name: uer.entities?.name_ar,
        entity_type: uer.entities?.entity_types?.code,
        region_name: uer.entities?.region_id,
        is_primary: uer.is_primary,
        started_at: uer.started_at,
        ended_at: uer.ended_at,
      }));

    return {
      ...row,
      roles,
    } as UserWithRoles;
  });

  // Filter by role
  if (filters.roleCode) {
    users = users.filter((u) =>
      u.roles.some((r) => r.role_code === filters.roleCode)
    );
  }

  return users;
}

// ================================================
// Get Single User
// ================================================

export async function getUserById(id: string): Promise<UserWithRoles | null> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, auth_user_id, username, email, full_name, phone, avatar_url,
      preferred_language, timezone, is_active, last_login_at, metadata,
      created_at, updated_at,
      user_entity_roles!user_entity_roles_user_id_fkey (
        id,
        role_id,
        entity_id,
        is_primary,
        started_at,
        ended_at,
        roles ( id, code, name_ar ),
        entities ( id, name_ar, region_id, entity_types ( code ) )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const roles: UserRoleAssignment[] = ((data as any).user_entity_roles || [])
    .filter((uer: any) => !uer.ended_at)
    .map((uer: any) => ({
      assignment_id: uer.id,
      role_id: uer.role_id,
      role_code: uer.roles?.code,
      role_name: uer.roles?.name_ar,
      entity_id: uer.entity_id,
      entity_name: uer.entities?.name_ar,
      entity_type: uer.entities?.entity_types?.code,
      region_name: uer.entities?.region_id,
      is_primary: uer.is_primary,
      started_at: uer.started_at,
      ended_at: uer.ended_at,
    }));

  return {
    ...data,
    roles,
  } as UserWithRoles;
}

// ================================================
// Toggle Active
// ================================================

export async function toggleUserActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) throw error;
}

// ================================================
// Update User Profile (basic info only)
// ================================================

export async function updateUserProfile(
  userId: string,
  data: { full_name?: string; phone?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update(data)
    .eq('id', userId);

  if (error) throw error;
}

// ================================================
// End Role Assignment
// ================================================

export async function endRoleAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('user_entity_roles')
    .update({ ended_at: new Date().toISOString().split('T')[0] })
    .eq('id', assignmentId);

  if (error) throw error;
}

// ================================================
// Add Role Assignment
// ================================================

export async function addRoleAssignment(
  userId: string,
  roleId: string,
  entityId: string,
  isPrimary: boolean = false
): Promise<void> {
  const { error } = await supabase
    .from('user_entity_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      entity_id: entityId,
      started_at: new Date().toISOString().split('T')[0],
      is_primary: isPrimary,
    });

  if (error) throw error;
}

// ================================================
// Get Roles (for dropdowns)
// ================================================

export async function listRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('id, code, name_ar, name_en, description, is_system, hierarchy_level, is_active')
    .eq('is_active', true)
    .order('hierarchy_level', { ascending: false });

  if (error) throw error;
  return (data || []) as Role[];
}

// ================================================
// Get Entities (for dropdowns)
// ================================================

export async function listEntities(): Promise<Entity[]> {
  const { data, error } = await supabase
    .from('entities')
    .select(`
      id, code, name_ar, name_en, entity_type_id, parent_id, region_id, is_active,
      entity_types ( code, name_ar ),
      regions ( name_ar )
    `)
    .eq('is_active', true)
    .order('name_ar');

  if (error) throw error;

  return ((data || []) as any[]).map((e) => ({
    id: e.id,
    code: e.code,
    name_ar: e.name_ar,
    name_en: e.name_en,
    entity_type_id: e.entity_type_id,
    entity_type_code: e.entity_types?.code || null,
    entity_type_name: e.entity_types?.name_ar || null,
    parent_id: e.parent_id,
    region_id: e.region_id,
    region_name: e.regions?.name_ar || null,
    is_active: e.is_active,
  }));
}

// ================================================
// Get Entities by Type (for filtered dropdowns)
// ================================================

export async function listEntitiesByType(
  entityTypeCode: string
): Promise<Entity[]> {
  const { data, error } = await supabase
    .from('entities')
    .select(`
      id, code, name_ar, name_en, entity_type_id, parent_id, region_id, is_active,
      entity_types ( code, name_ar ),
      regions ( name_ar )
    `)
    .eq('is_active', true)
    .eq('entity_types.code', entityTypeCode)
    .order('name_ar');

  if (error) throw error;

  return ((data || []) as any[]).map((e) => ({
    id: e.id,
    code: e.code,
    name_ar: e.name_ar,
    name_en: e.name_en,
    entity_type_id: e.entity_type_id,
    entity_type_code: e.entity_types?.code || null,
    entity_type_name: e.entity_types?.name_ar || null,
    parent_id: e.parent_id,
    region_id: e.region_id,
    region_name: e.regions?.name_ar || null,
    is_active: e.is_active,
  }));
}

// ================================================
// Create User (uses edge function)
// ================================================

export async function createUser(payload: CreateUserPayload): Promise<{ userId: string }> {
  const { data: fnData, error: fnError } = await supabase.functions.invoke(
    'admin-create-user',
    {
      body: {
        email: payload.email,
        password: payload.password,
        username: payload.username,
        full_name: payload.full_name,
        phone: payload.phone,
        role_id: payload.role_id,
        entity_id: payload.entity_id,
      },
    }
  );

  if (fnError) throw fnError;
  if (!fnData?.user_id) throw new Error('Failed to create user');

  return { userId: fnData.user_id };
}

// ================================================
// Get User Activity (audit_log)
// ================================================

export async function getUserActivity(
  userId: string,
  limit: number = 50
): Promise<UserActivity[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select(
      'id, action, resource_type, resource_id, changes, metadata, created_at'
    )
    .or(
      `user_id.eq.${userId},and(resource_type.eq.users,resource_id.eq.${userId})`
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as UserActivity[];
}