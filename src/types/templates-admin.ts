// ================================================
// Template Categories
// ================================================

export interface TemplateCategory {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  icon: string | null;
  color: string | null;
  order_index: number | null;
  is_active: boolean | null;
}

// ================================================
// Form Templates
// ================================================

export interface FormTemplate {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  category_id: string | null;
  entity_type_id: string | null;
  creator_role_id: string | null;
  report_kind: string | null;
  current_version_id: string | null;
  is_active: boolean | null;
  is_locked: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TemplateWithRelations extends FormTemplate {
  category: {
    id: string;
    code: string;
    name_ar: string;
    icon: string | null;
    color: string | null;
  } | null;
  current_version: {
    id: string;
    version_number: number;
  } | null;
  fields_count?: number;
  reports_count?: number;
}

export interface CreateTemplatePayload {
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  category_id: string;
  entity_type_id: string | null;
  creator_role_id: string | null;
  report_kind: string | null;
  is_active: boolean;
}

export interface UpdateTemplatePayload {
  name_ar?: string;
  name_en?: string | null;
  description?: string | null;
  category_id?: string;
  entity_type_id?: string | null;
  creator_role_id?: string | null;
  report_kind?: string | null;
  is_active?: boolean;
}

export interface TemplateFilters {
  search: string;
  categoryCode: string | null;
  isActive: boolean | null;
}

// ================================================
// Form Fields
// ================================================

// ⭐ أنواع الحقول المدعومة
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'rating'
  | 'auto_filled'
  | 'indicator_group'
  | 'subject_select'
  | 'school_select'
  | 'center_select';

// ⭐ JSONB Options — مُقسّم حسب نوع الحقل
export interface FieldSectionOptions {
  key: string;
  title: string;
  icon?: string;
  description?: string;
  accent_color?: 'primary' | 'success' | 'warning' | 'info';
  order?: number;
}

export interface FieldAutoSourceOptions {
  editable?: boolean;
  auto_source?: string;
  display_type?: 'text' | 'date' | 'datetime';
  hint?: string;
}

export interface FieldSelectOption {
  value: string;
  label: string;
}

export interface FieldScaleOptions {
  scale?: string[];
  scale_labels?: string[];
  indicators?: Array<{ num: number; text: string }>;
}

export interface FieldOptions extends
  FieldAutoSourceOptions,
  FieldScaleOptions {
  // ⭐ قسم الحقل (يدار من UI)
  section?: FieldSectionOptions;
  // ⭐ عرض كامل (عمودان)
  full_width?: boolean;
  // ⭐ خيارات select/radio
  options?: FieldSelectOption[];
  // ⭐ placeholder (للبعض)
  placeholder?: string;
  // حقول مفتوحة
  [key: string]: unknown;
}

export interface FormField {
  id: string;
  version_id: string | null;
  field_key: string;
  field_type: string;
  label_ar: string;
  label_en: string | null;
  placeholder: string | null;
  help_text: string | null;
  default_value: unknown;
  validation_rules: Record<string, unknown> | null;
  options: FieldOptions | null;
  order_index: number | null;
  is_repeatable: boolean | null;
  parent_field_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface CreateFieldPayload {
  field_key: string;
  field_type: FieldType;
  label_ar: string;
  label_en: string | null;
  placeholder: string | null;
  help_text: string | null;
  validation_rules: Record<string, unknown>;
  options: FieldOptions;
  order_index: number;
}

export interface UpdateFieldPayload {
  field_key?: string;
  field_type?: FieldType;
  label_ar?: string;
  label_en?: string | null;
  placeholder?: string | null;
  help_text?: string | null;
  validation_rules?: Record<string, unknown>;
  options?: FieldOptions;
  order_index?: number;
}

// ================================================
// Roles (للـ creator_role_id)
// ================================================

export interface RoleOption {
  id: string;
  code: string;
  name_ar: string;
}

// ================================================
// Entity Types
// ================================================

export interface EntityTypeOption {
  id: string;
  code: string;
  name_ar: string;
  icon: string | null;
}

// ================================================
// Delete Template Options
// ================================================

export type DeleteTemplateMode = 'soft' | 'cascade';

export interface DeleteTemplateCheck {
  canDelete: boolean;
  reportsCount: number;
  reason?: string;
}