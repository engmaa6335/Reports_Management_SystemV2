// ================================================
// ربط الأدوار بأنواع الكيانات المسموحة
// ================================================

export const ROLE_ENTITY_TYPES: Record<string, string[]> = {
  // أدوار المناطق
  region_manager: ['region'],
  region_assistant: ['region'],

  // أدوار المدارس
  school_manager: ['school'],
  tls_manager: ['school'],

  // أدوار QA
  qa_chief: ['qa_unit'],
  qa_coordinator: ['qa_unit'],

  // أدوار مركزية
  edc_viewer: ['edc'],
  tech_support: ['edc'],

  // الوحدات التربوية
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