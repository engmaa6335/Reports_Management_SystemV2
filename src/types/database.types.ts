// ═══════════════════════════════════════════════════════════
// Database Types — EDC Platform
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// Identity Schema
// ═══════════════════════════════════════════════════════════

export interface User {
  id: string;
  auth_user_id: string | null;
  username: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: string;
  timezone: string;
  is_active: boolean;
  last_login_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// Organization Schema
// ═══════════════════════════════════════════════════════════

export interface EntityType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  icon: string | null;
  color: string | null;
  hierarchy_level: number | null;
  can_have_children: boolean;
  allowed_parent_types: string[];
  metadata_schema: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface Entity {
  id: string;
  entity_type_id: string | null;
  parent_id: string | null;
  code: string | null;
  name_ar: string;
  name_en: string | null;
  path: string | null;
  region_id: string | null;
  address: string | null;
  contact_info: Record<string, unknown>;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// Security Schema
// ═══════════════════════════════════════════════════════════

export interface Role {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  is_system: boolean;
  hierarchy_level: number;
  is_active: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  name_ar: string | null;
  description: string | null;
  category: string | null;
  is_system: boolean;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  scope: string;
  conditions: Record<string, unknown>;
  created_at: string;
}

export interface UserEntityRole {
  id: string;
  user_id: string;
  entity_id: string;
  role_id: string;
  started_at: string;
  ended_at: string | null;
  is_primary: boolean;
  assigned_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PermissionOverride {
  id: string;
  user_id: string;
  entity_id: string | null;
  permission_id: string;
  effect: 'allow' | 'deny';
  scope: string | null;
  reason: string;
  granted_by: string;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
}

// ═══════════════════════════════════════════════════════════
// Forms Schema
// ═══════════════════════════════════════════════════════════

export interface TemplateCategory {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  icon: string | null;
  color: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export type ReportKind = 'visit' | 'aggregate';

export interface FormTemplate {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  category_id: string | null;
  entity_type_id: string | null;
  creator_role_id: string | null;
  report_kind: ReportKind;
  current_version_id: string | null;
  is_active: boolean;
  is_locked: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormTemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  schema_snapshot: Record<string, unknown>;
  layout_snapshot: Record<string, unknown>;
  change_log: string | null;
  created_by: string | null;
  created_at: string;
}

// ⭐ FieldType — محدّث
export type FieldType =
  // Standard
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'table'
  | 'file'
  | 'image'
  | 'signature'
  | 'location'
  | 'rating'
  | 'user_ref'
  | 'entity_ref'
  | 'computed'
  // Custom — EDC Platform
  | 'auto_filled'        // ⭐ حقل تلقائي (user/entity/date)
  | 'indicator_group'    // ⭐ مجموعة مؤشرات (radio × scale)
  | 'subject_select'     // ⭐ قائمة المواد المُسندة للمستخدم
  | 'school_select'      // ⭐ قائمة المدارس (R.L) المُفلترة بالمنطقة
  | 'center_select';     // ⭐ قائمة المراكز (TLS) المُفلترة بالمنطقة

export interface FormField {
  id: string;
  version_id: string;
  field_key: string;
  field_type: FieldType;
  label_ar: string;
  label_en: string | null;
  placeholder: string | null;
  help_text: string | null;
  default_value: unknown;
  validation_rules: Record<string, unknown>;
  options: Record<string, unknown>;
  order_index: number;
  is_repeatable: boolean;
  parent_field_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TemplateCreatorRole {
  template_id: string;
  role_id: string;
  created_at: string;
}

export interface TemplateViewerRole {
  template_id: string;
  role_id: string;
  scope: 'own' | 'entity' | 'region' | 'unit' | 'all';
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// Reports Schema
// ═══════════════════════════════════════════════════════════

export type ReportStatus = 'active' | 'updated' | 'aggregated' | 'archived' | 'deleted';
export type PeriodType = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface Report {
  id: string;
  template_id: string;
  template_version_id: string;
  entity_id: string;
  region_id: string | null;
  created_by: string;
  data: Record<string, unknown>;
  period_type: PeriodType | null;
  period_start: string | null;
  period_end: string | null;
  status: ReportStatus;
  last_edited_at: string | null;
  last_edited_by: string | null;
  edit_count: number;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  deletion_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportRevision {
  id: string;
  report_id: string;
  revision_number: number;
  data_snapshot: Record<string, unknown>;
  changed_by: string | null;
  change_summary: string | null;
  created_at: string;
}

export interface ReportAttachment {
  id: string;
  report_id: string;
  file_name: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface AggregateTemplate {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  aggregate_type: string;
  category_id: string | null;
  creator_role_id: string | null;
  source_template_ids: string[];
  calculations: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AggregateReport {
  id: string;
  aggregate_template_id: string | null;
  aggregate_type: string;
  region_id: string | null;
  entity_id: string | null;
  period_type: PeriodType | null;
  period_start: string | null;
  period_end: string | null;
  source_count: number;
  data: Record<string, unknown>;
  summary: Record<string, unknown>;
  charts: Record<string, unknown>;
  status: 'active' | 'archived';
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AggregateReportSource {
  aggregate_report_id: string;
  report_id: string;
  added_at: string;
}

export interface AggregationRule {
  id: string;
  code: string;
  name_ar: string;
  aggregate_template_id: string | null;
  trigger_event: string | null;
  schedule_cron: string | null;
  group_by: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// Notifications Schema
// ═══════════════════════════════════════════════════════════

export interface EmailTemplate {
  id: string;
  code: string;
  name_ar: string | null;
  subject_ar: string | null;
  body_html: string | null;
  body_text: string | null;
  variables: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  category: string | null;
  default_channels: string[];
  default_priority: string;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
}

export interface NotificationRule {
  id: string;
  code: string;
  notification_type_id: string | null;
  name_ar: string;
  description: string | null;
  trigger_event: string;
  conditions: Record<string, unknown>;
  recipient_type: string;
  recipient_config: Record<string, unknown>;
  channels: string[];
  email_template_id: string | null;
  priority: string;
  delay_minutes: number;
  schedule_cron: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  notification_type_id: string | null;
  rule_id: string | null;
  deduplication_key: string | null;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  priority: string;
  created_by: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface NotificationRecipient {
  id: string;
  notification_id: string;
  user_id: string;
  channel: string;
  is_read: boolean;
  read_at: string | null;
  delivered_at: string | null;
  delivery_status: string | null;
  error_message: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type_id: string;
  in_app: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  is_muted: boolean;
  quiet_hours: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// Themes Schema
// ═══════════════════════════════════════════════════════════

export interface ThemeColors {
  primary: string;
  primary_light: string;
  primary_dark: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  bg: string;
  bg_secondary: string;
  surface: string;
  border: string;
  text: string;
  text_secondary: string;
  text_muted: string;
}

export interface Theme {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  category: string | null;
  icon: string | null;
  colors: ThemeColors;
  shadow_intensity: string;
  border_radius: string;
  font_family: string | null;
  is_dark: boolean;
  preview_image_url: string | null;
  is_system: boolean;
  is_active: boolean;
  is_default: boolean;
  order_index: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme_code: string;
  animations: boolean;
  compact_mode: boolean;
  language: string;
  timezone: string;
  dashboard_layout: Record<string, unknown>;
  sidebar_collapsed: boolean;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// System Schema
// ═══════════════════════════════════════════════════════════

export interface SystemSetting {
  id: string;
  category: string | null;
  key: string;
  value: unknown;
  value_type: string;
  description: string | null;
  is_public: boolean;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: string | null;
  session_id: string | null;
  entity_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Event {
  id: number;
  event_type: string;
  aggregate_type: string | null;
  aggregate_id: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface ScheduledJob {
  id: string;
  code: string;
  name: string | null;
  cron_expression: string | null;
  job_type: string | null;
  parameters: Record<string, unknown>;
  last_run_at: string | null;
  last_status: string | null;
  is_active: boolean;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// Composite Types (with relations)
// ═══════════════════════════════════════════════════════════

export interface ReportWithRelations extends Report {
  template?: {
    id: string;
    code: string;
    name_ar: string;
    category?: {
      code: string;
      name_ar: string;
      color: string | null;
      icon: string | null;
    } | null;
  } | null;
  entity?: {
    id: string;
    name_ar: string;
    code: string | null;
  } | null;
  creator?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}