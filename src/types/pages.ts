// ═══════════════════════════════════════════════════════════
// Pages Types — dynamic page registry
// ═══════════════════════════════════════════════════════════

// ─── Modules ───
export type PageModule = 'main' | 'settings' | 'admin';

// ─── Actions ───
export type PageAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'manage'
  | 'deactivate'
  | 'approve'
  | 'execute'
  | 'rollback'
  | 'admin_override'
  | 'global';

// ─── Page (DB row) ───
export interface Page {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  module: PageModule;
  route_path: string;
  icon: string | null;
  order_index: number;
  is_active: boolean;
  is_system: boolean;
  supported_permissions: PageAction[];
  permission_resource: string | null;  // ⭐ جديد — يربط الصفحة بالصلاحيات
  page_settings_schema: Record<string, unknown> | null;
  page_settings_defaults: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── User Accessible Page (from RPC) ───
export interface UserAccessiblePage {
  page_code: string;
  name_ar: string;
  name_en: string | null;
  module: PageModule;
  route_path: string;
  icon: string | null;
  order_index: number;
  permissions: PageAction[];
}

// ─── Permission check helper ───
export interface PageAccess {
  page: Page;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_manage: boolean;
}