// ═══════════════════════════════════════════════════════════
// App Types
// ═══════════════════════════════════════════════════════════

// 🔑 الأدوار المتاحة في النظام
export type RoleCode =
  | 'tech_support'
  | 'edc_viewer'
  | 'region_manager'
  | 'region_assistant'
  | 'qa_chief'
  | 'qa_coordinator'
  | 'edu_specialist'
  | 'school_manager'
  | 'tls_manager';

// 🔑 الكيان النشط
export interface ActiveEntityContext {
  entityId: string;
  entityName: string;
  entityType: string;
  roleCode: RoleCode;
  roleName: string;
  isPrimary: boolean;
}

// 🔑 عنصر في القائمة الجانبية
export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  roles?: RoleCode[];
  children?: SidebarItem[];
}