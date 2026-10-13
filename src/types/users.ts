// ================================================
// User Types
// ================================================

export interface User {
  id: string;
  auth_user_id: string | null;
  username: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  timezone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserWithRoles extends User {
  roles: UserRoleAssignment[];
}

export interface UserRoleAssignment {
  assignment_id: string;
  role_id: string;
  role_code: string;
  role_name: string;
  entity_id: string | null;
  entity_name: string | null;
  entity_type: string | null;
  region_name: string | null;
  is_primary: boolean;
  started_at: string;
  ended_at: string | null;
}

// ================================================
// Role Types
// ================================================

export interface Role {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  is_system: boolean;
  hierarchy_level: number;
  is_active: boolean;
}

// ================================================
// Entity Types
// ================================================

export interface Entity {
  id: string;
  code: string | null;
  name_ar: string;
  name_en: string | null;
  entity_type_id: string | null;
  entity_type_code: string | null;
  entity_type_name: string | null;
  parent_id: string | null;
  region_id: string | null;
  region_name: string | null;
  is_active: boolean;
}

// ================================================
// Filters
// ================================================

// ⭐ مجموعات الأدوار (للتبويبات) — كل دور مستقل
export type RoleGroup =
  | 'region_manager'
  | 'school_manager'
  | 'tls_manager'
  | 'edu_specialist'
  | 'qa_chief'
  | 'qa_coordinator'
  | 'tech_support'
  | 'edc_viewer'
  | null;

export interface UsersFilters {
  search: string;
  roleCode: string | null;
  roleGroup: RoleGroup;
  regionId: string | null;
  entityId: string | null;
  isActive: boolean | null;
}

// ================================================
// Create User Payload
// ================================================

export interface CreateUserPayload {
  email: string;
  password: string;
  username: string;
  full_name: string;
  phone?: string;
  role_id: string;
  entity_id: string;
}

// ================================================
// User Activity (audit_log)
// ================================================

export interface UserActivity {
  id: number;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}