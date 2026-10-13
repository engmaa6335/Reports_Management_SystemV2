import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { sendNotification } from '../lib/notifications';

// ================================================
// Types
// ================================================

export interface AggregateReport {
  id: string;
  aggregate_template_id: string | null;
  aggregate_type: string;
  region_id: string | null;
  entity_id: string | null;
  period_type: string | null;
  period_start: string | null;
  period_end: string | null;
  source_count: number;
  data: Record<string, unknown>;
  summary: Record<string, unknown>;
  charts: Record<string, unknown>;
  status: 'active' | 'archived';
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  region?: {
    id: string;
    name_ar: string;
  } | null;
  aggregate_template?: {
    id: string;
    code: string;
    name_ar: string;
    aggregate_type: string;
    category_id: string | null;
  } | null;
}

export interface AvailableAggregateTemplate {
  id: string;
  code: string;
  name_ar: string;
  description: string | null;
  aggregate_type: string;
  category_id: string;
  category: {
    id: string;
    code: string;
    name_ar: string;
    icon: string | null;
    color: string | null;
  } | null;
  creator_role: {
    id: string;
    code: string;
    name_ar: string;
  } | null;
  source_template_ids: string[];
  calculations: Record<string, unknown>;
}

export interface AvailableReport {
  id: string;
  template_id: string;
  entity_id: string;
  region_id: string | null;
  created_by: string;
  data: Record<string, unknown>;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  template: {
    id: string;
    code: string;
    name_ar: string;
    category: {
      id: string;
      code: string;
      name_ar: string;
      color: string | null;
    } | null;
  } | null;
  entity: {
    id: string;
    name_ar: string;
  } | null;
  creator: {
    id: string;
    full_name: string;
  } | null;
}

export interface CreateAggregateInput {
  aggregateTemplateId: string;
  aggregateType: string;
  regionId: string | null;
  entityId: string | null;
  periodType: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  periodStart: string;
  periodEnd: string;
  sourceReportIds: string[];
  calculations: Record<string, unknown>;
  summary: Record<string, unknown>;
  charts: Record<string, unknown>;
}

export interface UpdateAggregateInput {
  periodType: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  periodStart: string;
  periodEnd: string;
  sourceReportIds: string[];
  calculations: Record<string, unknown>;
  summary: Record<string, unknown>;
  charts: Record<string, unknown>;
}

interface AggregatesState {
  aggregates: AggregateReport[];
  currentAggregate: AggregateReport | null;
  availableTemplates: AvailableAggregateTemplate[];
  availableReports: AvailableReport[];
  loading: boolean;
  saving: boolean;
  loadingReports: boolean;
  error: string | null;

  loadAggregates: (userId: string, entityId: string) => Promise<void>;
  loadAggregateById: (aggregateId: string) => Promise<void>;
  loadAvailableTemplates: (userId: string, entityId: string) => Promise<void>;
  loadAvailableReports: (filters: {
    sourceTemplateIds: string[];
    periodStart?: string;
    periodEnd?: string;
    userId: string;
    entityId: string;
    scope: string;
  }) => Promise<void>;
  createAggregate: (input: CreateAggregateInput) => Promise<string>;
  updateAggregate: (
    aggregateId: string,
    input: UpdateAggregateInput
  ) => Promise<void>;
  deleteAggregate: (aggregateId: string, reason: string) => Promise<void>;
  clearCurrentAggregate: () => void;
  clearAvailableReports: () => void;
  clearAvailableTemplates: () => void;
}

// ================================================
// Store
// ================================================

export const useAggregatesStore = create<AggregatesState>((set) => ({
  aggregates: [],
  currentAggregate: null,
  availableTemplates: [],
  availableReports: [],
  loading: false,
  saving: false,
  loadingReports: false,
  error: null,

  // ================================================
  // Load Aggregates List
  // ================================================
  loadAggregates: async (userId, entityId) => {
    try {
      set({ loading: true, error: null });

      const { data: roleData } = await supabase
        .from('user_entity_roles')
        .select('role:roles(code)')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .is('ended_at', null)
        .maybeSingle();

      const roleCode = (roleData?.role as unknown as { code: string })?.code;
      const canViewAll = ['tech_support', 'edc_viewer', 'qa_chief'].includes(
        roleCode || ''
      );
      const isRegionManager = roleCode === 'region_manager';

      let query = supabase
        .from('aggregate_reports')
        .select(
          '*, creator:users!aggregate_reports_created_by_fkey ( id, full_name, email ), region:entities!aggregate_reports_region_id_fkey ( id, name_ar ), aggregate_template:aggregate_templates ( id, code, name_ar, aggregate_type, category_id )'
        )
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!canViewAll && !isRegionManager) {
        query = query.eq('created_by', userId);
      } else if (isRegionManager) {
        const { data: entityData } = await supabase
          .from('entities')
          .select('region_id')
          .eq('id', entityId)
          .single();

        const entity = entityData as { region_id: string | null } | null;

        if (entity?.region_id) {
          query = query.eq('region_id', entity.region_id);
        } else {
          query = query.eq('created_by', userId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      set({
        aggregates: (data || []) as unknown as AggregateReport[],
        loading: false,
      });
    } catch (err) {
      console.error('loadAggregates error:', err);
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : 'خطأ في تحميل التقارير التجميعية',
      });
    }
  },

  // ================================================
  // Load Aggregate By ID
  // ================================================
  loadAggregateById: async (aggregateId) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('aggregate_reports')
        .select(
          '*, creator:users!aggregate_reports_created_by_fkey ( id, full_name, email ), region:entities!aggregate_reports_region_id_fkey ( id, name_ar ), aggregate_template:aggregate_templates ( id, code, name_ar, aggregate_type, category_id )'
        )
        .eq('id', aggregateId)
        .eq('is_deleted', false)
        .single();

      if (error) throw error;

      set({
        currentAggregate: data as unknown as AggregateReport,
        loading: false,
      });
    } catch (err) {
      console.error('loadAggregateById error:', err);
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : 'خطأ في تحميل التقرير التجميعي',
        currentAggregate: null,
      });
    }
  },

  // ================================================
  // Load Available Templates
  // ================================================
  loadAvailableTemplates: async (userId, entityId) => {
    try {
      set({ loading: true, error: null });

      const { data: userRoles } = await supabase
        .from('user_entity_roles')
        .select('role_id, role:roles(code)')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .is('ended_at', null);

      const roleIds = (userRoles || [])
        .map((r) => r.role_id)
        .filter((id): id is string => typeof id === 'string');

      const roleCodes = (userRoles || [])
        .map((r) => (r.role as unknown as { code: string })?.code)
        .filter((code): code is string => typeof code === 'string');

      if (roleIds.length === 0) {
        set({ availableTemplates: [], loading: false });
        return;
      }

      const { data: permissions, error: permError } = await supabase
        .from('aggregation_permissions')
        .select('category_id, can_create, scope')
        .eq('is_active', true)
        .eq('can_create', true)
        .in('role_id', roleIds);

      if (permError) throw permError;

      const allowedCategoryIds = Array.from(
        new Set(
          (permissions || [])
            .map((p) => p.category_id)
            .filter((id): id is string => id !== null)
        )
      );

      if (allowedCategoryIds.length === 0) {
        set({ availableTemplates: [], loading: false });
        return;
      }

      const { data: templates, error: templatesError } = await supabase
        .from('aggregate_templates')
        .select(
          'id, code, name_ar, description, aggregate_type, category_id, source_template_ids, calculations, category:template_categories ( id, code, name_ar, icon, color ), creator_role:roles ( id, code, name_ar )'
        )
        .eq('is_active', true)
        .in('category_id', allowedCategoryIds);

      if (templatesError) throw templatesError;

      const canViewAllTemplates = roleCodes.some((code) =>
        ['tech_support', 'edc_viewer', 'region_manager'].includes(code)
      );

      const filtered = (templates || []).filter((t: any) => {
        if (canViewAllTemplates) return true;
        const creatorRoleCode = t.creator_role?.code;
        if (!creatorRoleCode) return false;
        return roleCodes.includes(creatorRoleCode);
      });

      set({
        availableTemplates:
          filtered as unknown as AvailableAggregateTemplate[],
        loading: false,
      });
    } catch (err) {
      console.error('loadAvailableTemplates error:', err);
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : 'خطأ في تحميل القوالب التجميعية',
        availableTemplates: [],
      });
    }
  },

  // ================================================
  // Load Available Reports
  // ================================================
  loadAvailableReports: async (filters) => {
    try {
      set({ loadingReports: true });

      const {
        sourceTemplateIds,
        periodStart,
        periodEnd,
        userId,
        entityId,
        scope,
      } = filters;

      if (sourceTemplateIds.length === 0) {
        set({ availableReports: [], loadingReports: false });
        return;
      }

      let query = supabase
        .from('reports')
        .select(
          'id, template_id, entity_id, region_id, created_by, data, period_start, period_end, created_at, template:form_templates!inner ( id, code, name_ar, category:template_categories!inner ( id, code, name_ar, color ) ), entity:entities!reports_entity_id_fkey ( id, name_ar ), creator:users!reports_created_by_fkey ( id, full_name )'
        )
        .eq('is_deleted', false)
        .in('template_id', sourceTemplateIds)
        .order('created_at', { ascending: false })
        .limit(500);

      if (periodStart) {
        query = query.gte('period_start', periodStart);
      }
      if (periodEnd) {
        query = query.lte('period_end', periodEnd);
      }

      if (scope === 'own') {
        query = query.eq('created_by', userId);
      } else if (scope === 'region') {
        const { data: entityData } = await supabase
          .from('entities')
          .select('region_id')
          .eq('id', entityId)
          .single();

        const entity = entityData as { region_id: string | null } | null;

        if (entity?.region_id) {
          query = query.eq('region_id', entity.region_id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      set({
        availableReports: (data || []) as unknown as AvailableReport[],
        loadingReports: false,
      });
    } catch (err) {
      console.error('loadAvailableReports error:', err);
      set({ loadingReports: false, availableReports: [] });
    }
  },

  // ================================================
  // Create Aggregate + Send Notification
  // ================================================
  createAggregate: async (input) => {
    try {
      set({ saving: true, error: null });

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('يجب تسجيل الدخول');

      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_user_id', authUser.id)
        .single();

      if (!userData) throw new Error('المستخدم غير موجود');

      const { data: aggregate, error: aggError } = await supabase
        .from('aggregate_reports')
        .insert({
          aggregate_template_id: input.aggregateTemplateId,
          aggregate_type: input.aggregateType,
          region_id: input.regionId,
          entity_id: input.entityId,
          period_type: input.periodType,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          data: input.calculations,
          summary: input.summary,
          charts: input.charts,
          source_count: input.sourceReportIds.length,
          status: 'active',
          created_by: userData.id,
        })
        .select('id')
        .single();

      if (aggError) {
        console.error('Error creating aggregate:', aggError);
        throw new Error(aggError.message || 'فشل إنشاء التقرير التجميعي');
      }

      if (input.sourceReportIds.length > 0) {
        const sources = input.sourceReportIds.map((reportId) => ({
          aggregate_report_id: aggregate.id,
          report_id: reportId,
        }));

        const { error: srcError } = await supabase
          .from('aggregate_report_sources')
          .insert(sources);

        if (srcError) {
          console.error('Error linking sources:', srcError);
          await supabase
            .from('aggregate_reports')
            .delete()
            .eq('id', aggregate.id);
          throw new Error('فشل ربط التقارير المصدر');
        }
      }

      // 🔔 إرسال التنبيه
      try {
        await sendNotification({
          triggerEvent: 'aggregate.created',
          title: `📊 تقرير تجميعي جديد`,
          body: `تم إنشاء تقرير تجميعي جديد بواسطة ${userData.full_name}`,
          priority: 'normal',
          aggregateId: aggregate.id,
          entityId: input.entityId || undefined,
          regionId: input.regionId || undefined,
          creatorId: userData.id,
        });
      } catch (notifErr) {
        console.error('⚠️ Notification failed:', notifErr);
      }

      set({ saving: false });
      return aggregate.id;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'خطأ في إنشاء التقرير التجميعي';
      console.error('createAggregate error:', err);
      set({ saving: false, error: message });
      throw err;
    }
  },

  // ================================================
  // Update Aggregate
  // ================================================
  updateAggregate: async (aggregateId, input) => {
    try {
      set({ saving: true, error: null });

      // 1. تحديث التقرير التجميعي
      const { error: updateError } = await supabase
        .from('aggregate_reports')
        .update({
          period_type: input.periodType,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          data: input.calculations,
          summary: input.summary,
          charts: input.charts,
          source_count: input.sourceReportIds.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aggregateId);

      if (updateError) {
        console.error('Error updating aggregate:', updateError);
        throw new Error(updateError.message || 'فشل تحديث التقرير');
      }

      // 2. حذف المصادر القديمة
      const { error: deleteError } = await supabase
        .from('aggregate_report_sources')
        .delete()
        .eq('aggregate_report_id', aggregateId);

      if (deleteError) {
        console.error('Error deleting old sources:', deleteError);
        throw new Error('فشل حذف المصادر القديمة');
      }

      // 3. ربط المصادر الجديدة
      if (input.sourceReportIds.length > 0) {
        const sources = input.sourceReportIds.map((reportId) => ({
          aggregate_report_id: aggregateId,
          report_id: reportId,
        }));

        const { error: srcError } = await supabase
          .from('aggregate_report_sources')
          .insert(sources);

        if (srcError) {
          console.error('Error linking new sources:', srcError);
          throw new Error('فشل ربط المصادر الجديدة');
        }
      }

      set({ saving: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'خطأ في تحديث التقرير';
      console.error('updateAggregate error:', err);
      set({ saving: false, error: message });
      throw err;
    }
  },

  // ================================================
  // Delete Aggregate (Deep Delete)
  // ================================================
  deleteAggregate: async (aggregateId, reason) => {
    try {
      set({ saving: true, error: null });

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

      const { data: aggregateSnapshot } = await supabase
        .from('aggregate_reports')
        .select('*')
        .eq('id', aggregateId)
        .single();

      if (!aggregateSnapshot) {
        throw new Error('التقرير التجميعي غير موجود');
      }

      const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
          user_id: userData.id,
          action: 'deep_delete',
          resource_type: 'aggregate_report',
          resource_id: aggregateId,
          changes: {
            reason: reason.trim(),
            snapshot: aggregateSnapshot,
          },
          metadata: {
            deleted_by_name: userData.full_name,
            deleted_by_email: userData.email,
          },
        });

      if (auditError) {
        console.error('⚠️ Audit log failed:', auditError);
      }

      const { error: deleteError } = await supabase
        .from('aggregate_reports')
        .delete()
        .eq('id', aggregateId);

      if (deleteError) {
        console.error('Error deleting aggregate:', deleteError);
        throw new Error(
          deleteError.message || 'فشل حذف التقرير التجميعي'
        );
      }

      set((state) => ({
        aggregates: state.aggregates.filter((a) => a.id !== aggregateId),
        saving: false,
      }));

      console.log('✅ Aggregate deleted permanently:', aggregateId);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'خطأ في حذف التقرير التجميعي';
      console.error('deleteAggregate error:', err);
      set({ saving: false, error: message });
      throw err;
    }
  },

  // ================================================
  // Cleanup
  // ================================================
  clearCurrentAggregate: () => {
    set({ currentAggregate: null, error: null });
  },

  clearAvailableReports: () => {
    set({ availableReports: [] });
  },

  clearAvailableTemplates: () => {
    set({ availableTemplates: [] });
  },
}));