import { supabase } from './supabase';
import type {
  AggregateTemplateWithRelations,
  AggregateReportWithRelations,
  VisitRow,
  CreateSpecialistAggregateInput,
  UpdateSpecialistAggregateInput,
  AggregateFilters,
} from '../types/aggregates';

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function getSubjectLabel(subjectValue: string): string {
  const subjects: Record<string, string> = {
    arabic: 'لغة عربية',
    math: 'رياضيات',
    science: 'علوم عامة',
    english: 'لغة إنجليزية',
  };
  return subjects[subjectValue] || subjectValue || '—';
}

function getGradeLabel(gradeValue: string): string {
  const grades: Record<string, string> = {
    '1': 'الأول',
    '2': 'الثاني',
    '3': 'الثالث',
    '4': 'الرابع',
    '5': 'الخامس',
    '6': 'السادس',
    '7': 'السابع',
    '8': 'الثامن',
    '9': 'التاسع',
  };
  return grades[gradeValue] || gradeValue || '—';
}

// ⭐ تحقق من صحة UUID (صيغة 8-4-4-4-12)
function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length < 32 || value.length > 40) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

// ═══════════════════════════════════════════════════════════
// Aggregate Templates
// ═══════════════════════════════════════════════════════════

/**
 * ⭐ جلب القوالب التجميعية المتاحة للمستخدم
 */
export async function listAvailableAggregateTemplates(
  userId: string,
  entityId: string
): Promise<AggregateTemplateWithRelations[]> {
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_entity_roles')
    .select('role_id, roles (id, code, name_ar)')
    .eq('user_id', userId)
    .eq('entity_id', entityId)
    .is('ended_at', null);

  if (rolesError) throw rolesError;

  const roleIds = (userRoles || [])
    .map((r: any) => r.role_id)
    .filter((id: any): id is string => typeof id === 'string');

  if (roleIds.length === 0) return [];

  const { data: permissions } = await supabase
    .from('aggregation_permissions')
    .select('category_id, can_create, scope')
    .eq('is_active', true)
    .eq('can_create', true)
    .in('role_id', roleIds);

  const allowedCategoryIds = Array.from(
    new Set(
      (permissions || [])
        .map((p: any) => p.category_id)
        .filter((id: any): id is string => id !== null)
    )
  );

  let query = supabase
    .from('aggregate_templates')
    .select(`
      *,
      category:template_categories ( id, code, name_ar, icon, color ),
      creator_role:roles ( id, code, name_ar )
    `)
    .eq('is_active', true);

  if (allowedCategoryIds.length > 0) {
    query = query.in('category_id', allowedCategoryIds);
  }

  const { data: templates, error: templatesError } = await query;
  if (templatesError) throw templatesError;

  const roleCodes = (userRoles || [])
    .map((r: any) => r.roles?.code)
    .filter((c: any): c is string => typeof c === 'string');

  const canViewAll = roleCodes.some((c) =>
    ['tech_support', 'edc_viewer'].includes(c)
  );

  const filtered = (templates || []).filter((t: any) => {
    if (canViewAll) return true;
    const creatorRoleCode = t.creator_role?.code;
    if (!creatorRoleCode) return true;
    return roleCodes.includes(creatorRoleCode);
  });

  return filtered as AggregateTemplateWithRelations[];
}

export async function getAggregateTemplateById(
  id: string
): Promise<AggregateTemplateWithRelations | null> {
  const { data, error } = await supabase
    .from('aggregate_templates')
    .select(`
      *,
      category:template_categories ( id, code, name_ar, icon, color ),
      creator_role:roles ( id, code, name_ar )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return data as AggregateTemplateWithRelations;
}

// ═══════════════════════════════════════════════════════════
// ⭐ Fetch Visits — القلب النابض للتقرير التجميعي
// ═══════════════════════════════════════════════════════════

interface FetchVisitsParams {
  sourceTemplateId: string;
  periodStart: string;
  periodEnd: string;
  userId: string;
  reportType: 'RL' | 'TLS';
}

export async function fetchVisitsInPeriod({
  sourceTemplateId,
  periodStart,
  periodEnd,
  userId,
  reportType,
}: FetchVisitsParams): Promise<VisitRow[]> {
  console.log('🔍 fetchVisitsInPeriod:', {
    sourceTemplateId,
    periodStart,
    periodEnd,
    userId,
    reportType,
  });

  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, data, entity_id, created_at')
    .eq('template_id', sourceTemplateId)
    .eq('created_by', userId)
    .eq('is_deleted', false);

  if (error) throw error;
  if (!reports || reports.length === 0) {
    console.log('ℹ️ No reports found');
    return [];
  }

  console.log(`📄 Found ${reports.length} total reports`);

  const filtered = reports.filter((r) => {
    const visitDate = r.data?.visit_date;
    if (typeof visitDate !== 'string') return false;
    return visitDate >= periodStart && visitDate <= periodEnd;
  });

  console.log(`✅ Filtered to ${filtered.length} visits in period`);
  if (filtered.length === 0) return [];

  const entityField = reportType === 'RL' ? 'school' : 'learning_center';

  const rawEntityIds = filtered.map((r) => ({
    report_id: r.id,
    value: r.data?.[entityField],
  }));

  const validEntityIds = rawEntityIds
    .map((item) => item.value)
    .filter((id): id is string => isValidUuid(id));

  const invalidCount = rawEntityIds.length - validEntityIds.length;
  if (invalidCount > 0) {
    console.warn(
      `⚠️ Skipped ${invalidCount} invalid entity IDs:`,
      rawEntityIds.filter((item) => !isValidUuid(item.value))
    );
  }

  console.log(
    `📍 Valid entity IDs: ${validEntityIds.length} / ${rawEntityIds.length}`
  );

  let entityMap = new Map<string, string>();
  if (validEntityIds.length > 0) {
    const uniqueIds = [...new Set(validEntityIds)];

    try {
      const { data: entities, error: entitiesError } = await supabase
        .from('entities')
        .select('id, name_ar')
        .in('id', uniqueIds);

      if (entitiesError) {
        console.warn('⚠️ Error fetching entities:', entitiesError);
      } else {
        entityMap = new Map(
          (entities || []).map((e) => [e.id, e.name_ar])
        );
        console.log(`✅ Loaded ${entityMap.size} entity names`);
      }
    } catch (err) {
      console.warn('⚠️ Exception fetching entities:', err);
    }
  }

  const sorted = [...filtered].sort((a, b) => {
    const dateA = String(a.data?.visit_date || '');
    const dateB = String(b.data?.visit_date || '');
    return dateA.localeCompare(dateB);
  });

  return sorted.map((r, index) => {
    const d = r.data || {};
    const entityId = d[entityField];
    const entityName = isValidUuid(entityId)
      ? entityMap.get(entityId) || '—'
      : '—';

    return {
      index: index + 1,
      report_id: r.id,
      visit_date: String(d.visit_date || ''),
      entity_name: entityName,
      class_grade: getGradeLabel(String(d.class_grade || '')),
      teacher_name: String(d.teacher_name || '—'),
      subject: getSubjectLabel(String(d.subject || '')),
      strengths: String(d.strengths || '—'),
      improvements: String(d.improvements || '—'),
    };
  });
}

// ═══════════════════════════════════════════════════════════
// ⭐ Check Existing Aggregate for Same Period
// ═══════════════════════════════════════════════════════════

export interface ExistingAggregateInfo {
  id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  period_type: string | null;
}

/**
 * ⭐ التحقق من وجود تقرير تجميعي سابق لنفس الفترة
 */
export async function findExistingAggregate({
  userId,
  entityId,
  aggregateTemplateId,
  periodType,
  periodStart,
  periodEnd,
}: {
  userId: string;
  entityId: string;
  aggregateTemplateId: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
}): Promise<ExistingAggregateInfo | null> {
  const { data, error } = await supabase
    .from('aggregate_reports')
    .select('id, created_at, period_start, period_end, period_type')
    .eq('created_by', userId)
    .eq('entity_id', entityId)
    .eq('aggregate_template_id', aggregateTemplateId)
    .eq('period_type', periodType)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('❌ findExistingAggregate error:', error);
    return null;
  }

  return data;
}

// ═══════════════════════════════════════════════════════════
// Aggregate Reports — List
// ═══════════════════════════════════════════════════════════

export async function listUserAggregates(
  userId: string,
  entityId: string,
  filters?: Partial<AggregateFilters>
): Promise<AggregateReportWithRelations[]> {
  let query = supabase
    .from('aggregate_reports')
    .select(`
      *,
      creator:users!aggregate_reports_created_by_fkey ( id, full_name, email ),
      entity:entities!aggregate_reports_entity_id_fkey ( id, name_ar ),
      aggregate_template:aggregate_templates ( id, code, name_ar, aggregate_type, calculations )
    `)
    .eq('is_deleted', false)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  const { data, error } = await query;
  if (error) throw error;

  let results = (data || []) as unknown as AggregateReportWithRelations[];

  if (filters?.reportType) {
    results = results.filter((r) => {
      const calcs = r.aggregate_template?.calculations as any;
      return calcs?.report_type === filters.reportType;
    });
  }

  if (filters?.periodType) {
    results = results.filter((r) => r.period_type === filters.periodType);
  }

  if (filters?.search?.trim()) {
    const s = filters.search.toLowerCase().trim();
    results = results.filter((r) => {
      const name = r.aggregate_template?.name_ar?.toLowerCase() || '';
      return name.includes(s);
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════
// Aggregate Reports — Single
// ═══════════════════════════════════════════════════════════

export async function getAggregateById(
  id: string
): Promise<AggregateReportWithRelations | null> {
  const { data, error } = await supabase
    .from('aggregate_reports')
    .select(`
      *,
      creator:users!aggregate_reports_created_by_fkey ( id, full_name, email ),
      entity:entities!aggregate_reports_entity_id_fkey ( id, name_ar ),
      aggregate_template:aggregate_templates ( id, code, name_ar, aggregate_type, calculations )
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return data as unknown as AggregateReportWithRelations;
}

// ═══════════════════════════════════════════════════════════
// Create Specialist Aggregate
// ═══════════════════════════════════════════════════════════

export async function createSpecialistAggregate(
  input: CreateSpecialistAggregateInput
): Promise<{ id: string }> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('يجب تسجيل الدخول');

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single();

  if (!userData) throw new Error('المستخدم غير موجود');

  const reportData = {
    specialist_name: input.metadata.specialist_name,
    specialization: input.metadata.specialization,
    region_name: input.metadata.region_name,
    report_type: input.metadata.report_type,
    period_type: input.periodType,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    period_label: input.metadata.period_label,
    total_visits: input.visits.length,
    visits: input.visits,
    manual_activities: input.manualActivities,
  };

  const { data: aggregate, error: aggError } = await supabase
    .from('aggregate_reports')
    .insert({
      aggregate_template_id: input.aggregateTemplateId,
      aggregate_type: input.metadata.report_type,
      region_id: input.regionId,
      entity_id: input.entityId,
      period_type: input.periodType,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      data: reportData,
      summary: {
        total_visits: input.visits.length,
        total_activities: input.manualActivities.length,
      },
      charts: {},
      source_count: input.visits.length,
      status: 'active',
      created_by: userData.id,
    })
    .select('id')
    .single();

  if (aggError) throw aggError;

  if (input.visits.length > 0) {
    const sources = input.visits.map((v) => ({
      aggregate_report_id: aggregate.id,
      report_id: v.report_id,
    }));

    const { error: srcError } = await supabase
      .from('aggregate_report_sources')
      .insert(sources);

    if (srcError) {
      await supabase.from('aggregate_reports').delete().eq('id', aggregate.id);
      throw new Error('فشل ربط التقارير المصدر');
    }
  }

  return { id: aggregate.id };
}

// ═══════════════════════════════════════════════════════════
// Update Specialist Aggregate
// ═══════════════════════════════════════════════════════════

export async function updateSpecialistAggregate(
  id: string,
  input: UpdateSpecialistAggregateInput
): Promise<void> {
  const reportData = {
    specialist_name: input.metadata.specialist_name,
    specialization: input.metadata.specialization,
    region_name: input.metadata.region_name,
    report_type: input.metadata.report_type,
    period_type: input.periodType,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    period_label: input.metadata.period_label,
    total_visits: input.visits.length,
    visits: input.visits,
    manual_activities: input.manualActivities,
  };

  const { error: updateError } = await supabase
    .from('aggregate_reports')
    .update({
      period_type: input.periodType,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      data: reportData,
      summary: {
        total_visits: input.visits.length,
        total_activities: input.manualActivities.length,
      },
      source_count: input.visits.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) throw updateError;

  await supabase
    .from('aggregate_report_sources')
    .delete()
    .eq('aggregate_report_id', id);

  if (input.visits.length > 0) {
    const sources = input.visits.map((v) => ({
      aggregate_report_id: id,
      report_id: v.report_id,
    }));

    await supabase.from('aggregate_report_sources').insert(sources);
  }
}

// ═══════════════════════════════════════════════════════════
// Delete
// ═══════════════════════════════════════════════════════════

export async function softDeleteAggregate(
  id: string,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 5) {
    throw new Error('سبب الحذف مطلوب (5 أحرف على الأقل)');
  }

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('يجب تسجيل الدخول');

  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('auth_user_id', authUser.id)
    .single();

  if (!userData) throw new Error('المستخدم غير موجود');

  await supabase.from('audit_log').insert({
    user_id: userData.id,
    action: 'soft_delete',
    resource_type: 'aggregate_report',
    resource_id: id,
    changes: { reason: reason.trim() },
    metadata: {
      deleted_by_name: userData.full_name,
      deleted_by_email: userData.email,
    },
  });

  const { error } = await supabase
    .from('aggregate_reports')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userData.id,
    })
    .eq('id', id);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════
// Lookups
// ═══════════════════════════════════════════════════════════

export async function getUserMetadata(userId: string): Promise<{
  specialist_name: string;
  specialization: string;
} | null> {
  const { data, error } = await supabase
    .from('users')
    .select('full_name, metadata')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    specialist_name: data.full_name,
    specialization: (data.metadata as any)?.specialization_name || '—',
  };
}