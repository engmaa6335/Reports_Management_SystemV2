// ================================================
// Entity Types
// ================================================

export interface EntityType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  icon: string | null;
  color: string | null;
  hierarchy_level: number | null;
  can_have_children: boolean | null;
  allowed_parent_types: string[] | null;
  is_active: boolean | null;
}

export interface ContactInfo {
  manager_name?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

export interface EntityRow {
  id: string;
  entity_type_id: string | null;
  parent_id: string | null;
  code: string | null;
  name_ar: string;
  name_en: string | null;
  region_id: string | null;
  address: string | null;
  contact_info: ContactInfo | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

// صف كامل مع العلاقات
export interface EntityWithRelations extends EntityRow {
  entity_type: {
    id: string;
    code: string;
    name_ar: string;
    icon: string | null;
    color: string | null;
    hierarchy_level: number | null;
  } | null;
  parent: {
    id: string;
    name_ar: string;
    entity_type_code: string | null;
  } | null;
  region: {
    id: string;
    name_ar: string;
  } | null;
  children_count?: number;
  users_count?: number;
  reports_count?: number;
}

// ⭐ Filters
export interface EntityFilters {
  search: string;
  typeCode: string | null;
  parentTypeCode: string | null;   // ⭐ جديد
  isActive: boolean | null;
  regionId: string | null;
  parentId: string | null;
}

export interface CreateEntityPayload {
  entity_type_id: string;
  parent_id: string | null;
  code: string | null;
  name_ar: string;
  name_en: string | null;
  region_id: string | null;
  address: string | null;
  contact_info: ContactInfo;
  metadata: Record<string, unknown>;
  is_active: boolean;
}

export interface UpdateEntityPayload {
  entity_type_id?: string;
  parent_id?: string | null;
  code?: string | null;
  name_ar?: string;
  name_en?: string | null;
  region_id?: string | null;
  address?: string | null;
  contact_info?: ContactInfo;
  metadata?: Record<string, unknown>;
  is_active?: boolean;
}

export interface EntityActivity {
  id: number;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface EntityStats {
  total: number;
  active: number;
  inactive: number;
  byType: Record<string, number>;
}

// ================================================
// Relations
// ================================================

export interface LinkedUser {
  assignment_id: string;
  user_id: string;
  full_name: string;
  email: string;
  role_code: string;
  role_name: string;
  is_primary: boolean;
  started_at: string;
}

export interface LinkedReport {
  id: string;
  template_name: string;
  status: string;
  created_at: string;
  created_by_name: string;
}