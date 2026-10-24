// ================================================
// ربط الأدوار بأنواع الكيانات المسموحة
// ================================================

export const ROLE_ENTITY_TYPES: Record<string, string[]> = {
  // ═══════════════════════════════════════════════
  // الأدوار الإدارية العليا — ترى كل الكيانات
  // ═══════════════════════════════════════════════
  sysadmin: ['edc', 'region', 'school', 'tls_center', 'edu_unit', 'qa_unit'],
  admin: ['edc', 'region', 'school', 'tls_center', 'edu_unit', 'qa_unit'],

  // ═══════════════════════════════════════════════
  // ⭐ EDC — مركز التطوير التربوي (الجذر)
  // يرى كل الكيانات — يشرف على المدارس والمراكز
  // والوحدات والمناطق
  // ═══════════════════════════════════════════════
  edc_viewer: ['edc', 'region', 'school', 'tls_center', 'edu_unit', 'qa_unit'],

  // ═══════════════════════════════════════════════
  // أدوار المناطق — ترى المنطقة والكيانات التابعة لها
  // ═══════════════════════════════════════════════
  region_manager: ['region', 'tls_center', 'school', 'edu_unit'],
  region_assistant: ['region', 'tls_center', 'school'],

  // ═══════════════════════════════════════════════
  // أدوار المدارس
  // ═══════════════════════════════════════════════
  school_manager: ['school'],

  // ═══════════════════════════════════════════════
  // أدوار مراكز التطوير (TLS Centers) — ترى المركز والمدارس التابعة
  // ═══════════════════════════════════════════════
  tls_manager: ['tls_center', 'school'],

  // ═══════════════════════════════════════════════
  // أدوار QA
  // ═══════════════════════════════════════════════
  qa_chief: ['qa_unit'],
  qa_coordinator: ['qa_unit'],

  // ═══════════════════════════════════════════════
  // دعم فني — يرى كل الكيانات
  // ═══════════════════════════════════════════════
  tech_support: ['edc', 'region', 'school', 'tls_center', 'edu_unit', 'qa_unit'],

  // ═══════════════════════════════════════════════
  // الوحدات التربوية
  // ═══════════════════════════════════════════════
  edu_specialist: ['edu_unit'],
};

// ================================================
// Helpers
// ================================================

/**
 * الحصول على أنواع الكيانات المسموحة لدور معين
 */
export function getAllowedEntityTypes(roleCode: string | null): string[] {
  if (!roleCode) return [];
  return ROLE_ENTITY_TYPES[roleCode] || [];
}

/**
 * هل الدور يقبل هذا النوع من الكيانات؟
 */
export function roleAllowsEntityType(
  roleCode: string | null,
  entityTypeCode: string
): boolean {
  if (!roleCode) return false;
  const allowed = ROLE_ENTITY_TYPES[roleCode] || [];
  return allowed.includes(entityTypeCode);
}