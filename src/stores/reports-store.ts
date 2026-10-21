import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { sendNotification } from '../lib/notifications';
import type { ReportWithRelations, PeriodType } from '../types/database.types';

// ================================================
// Types
// ================================================

interface ReportsFilters {
  status?: string;
  periodStart?: string;
  periodEnd?: string;
  searchQuery?: string;
  templateId?: string;
  categoryCode?: string;
  creatorId?: string;
  entityIdFilter?: string;
}

interface ReportsStats {
  total: number;
  thisMonth: number;
  active: number;
  archived: number;
}

interface CreateReportInput {
  templateId: string;
  templateVersionId: string;
  entityId: string;
  regionId: string | null;
  data: Record<string, unknown>;
  periodType: PeriodType | null;
  periodStart: string | null;
  periodEnd: string | null;
}

interface UpdateReportInput {
  data: Record<string, unknown>;
  periodType: PeriodType | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface ReportField {
  id: string;
  field_key: string;
  field_type: string;
  label_ar: string;
  options: Record<string, unknown>;
  order_index: number;
  validation_rules: Record<string, unknown>;
}

export interface ReportRevision {
  id: string;
  report_id: string;
  revision_number: number;
  changed_fields: Record<string, { from: unknown; to: unknown }>;
  change_summary: string | null;
  changed_by: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface CurrentReport extends ReportWithRelations {
  fields: ReportField[];
}

interface ReportsState {
  reports: ReportWithRelations[];
  currentReport: CurrentReport | null;
  revisions: ReportRevision[];
  stats: ReportsStats;
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;
  filters: ReportsFilters;

  loadReports: (userId: string, entityId: string) => Promise<void>;
  loadReportById: (reportId: string) => Promise<void>;
  loadRevisions: (reportId: string) => Promise<void>;
  createReport: (input: CreateReportInput) => Promise<string>;
  updateReport: (reportId: string, input: UpdateReportInput) => Promise<void>;
  deleteReport: (reportId: string, reason: string) => Promise<void>;
  setFilters: (filters: Partial<ReportsFilters>) => void;
  clearFilters: () => void;
  clearCurrentReport: () => void;
  refresh: (userId: string, entityId: string) => Promise<void>;
}

// ================================================
// Store
// ================================================

export const useReportsStore = create<ReportsState>((set, get) => ({
  reports: [],
  currentReport: null,
  revisions: [],
  stats: {
    total: 0,
    thisMonth: 0,
    active: 0,
    archived: 0,
  },
  loading: false,
  saving: false,
  deleting: false,
  error: null,
  filters: {},

  // ================================================
  // Load Reports (with role-based filtering)
  // ================================================
  loadReports: async (userId, entityId) => {
    try {
      set({ loading: true, error: null });

      const { filters } = get();

      // 🔑 جلب دور المستخدم
      const { data: roleData } = await supabase
        .from('user_entity_roles')
        .select('role:roles(code)')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .is('ended_at', null)
        .maybeSingle();

      const roleCode = (roleData?.role as unknown as { code: string })?.code;

      // 🔑 من يرى كل التقارير؟
      const canViewAll = ['tech_support', 'edc_viewer', 'qa_chief'].includes(
        roleCode || ''
      );
      const isRegionManager =
        roleCode === 'region_manager' || roleCode === 'region_assistant';
      const isManager = ['school_manager', 'tls_manager'].includes(
        roleCode || ''
      );

      let query = supabase
        .from('reports')
        .select(
          '*, template:form_templates ( id, code, name_ar, category:template_categories ( code, name_ar, color, icon ) ), entity:entities!reports_entity_id_fkey ( id, name_ar, code ), creator:users!reports_created_by_fkey ( id, full_name, email )'
        )
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(500);

      // 🔑 الفلترة حسب الدور
      if (isManager) {
        // ⭐ مدير المدرسة/المركز: يرى التقارير التي entity_id الخاص بها يطابق كيانه
        // تم إضافة region_id لدعم التقارير القديمة التي حُفظت قبل التعديل
        const { data: entityData } = await supabase
          .from('entities')
          .select('region_id')
          .eq('id', entityId)
          .single();

        const regionId = entityData?.region_id;

        if (regionId) {
          query = query.or(`entity_id.eq.${entityId},created_by.eq.${userId},region_id.eq.${regionId}`);
        } else {
          query = query.or(`entity_id.eq.${entityId},created_by.eq.${userId}`);
        }
      } else if (isRegionManager) {
        // ⭐ جلب نوع الكيان + region_id
        const { data: entityData } = await supabase
          .from('entities')
          .select(`
            region_id,
            entity_type:entity_types!inner ( code )
          `)
          .eq('id', entityId)
          .single();

        const entity = entityData as {
          region_id: string | null;
          entity_type: { code: string } | null;
        } | null;

        // ⭐ الكيان نفسه "منطقة" → استخدم entityId مباشرة
        if (entity?.entity_type?.code === 'region') {
          query = query.eq('region_id', entityId);
        } else if (entity?.region_id) {
          // مدرسة/مركز → استخدم region_id
          query = query.eq('region_id', entity.region_id);
        } else {
          // لا منطقة → فقط تقاريره
          query = query.eq('created_by', userId);
        }
      } else if (!canViewAll) {
        query = query.eq('created_by', userId);
      }

      // فلاتر إضافية
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.periodStart) {
        query = query.gte('period_start', filters.periodStart);
      }

      if (filters.periodEnd) {
        query = query.lte('period_end', filters.periodEnd);
      }

      if (filters.templateId) {
        query = query.eq('template_id', filters.templateId);
      }

      if (filters.creatorId) {
        query = query.eq('created_by', filters.creatorId);
      }

      if (filters.entityIdFilter) {
        query = query.eq('entity_id', filters.entityIdFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading reports:', error);
        throw error;
      }

      const reports = (data || []) as unknown as ReportWithRelations[];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats: ReportsStats = {
        total: reports.length,
        thisMonth: reports.filter(
          (r) => new Date(r.created_at) >= startOfMonth
        ).length,
        active: reports.filter((r) => r.status === 'active').length,
        archived: reports.filter((r) => r.status === 'archived').length,
      };

      set({ reports, stats, loading: false });
    } catch (err) {
      console.error('loadReports error:', err);
      set({
        loading: false,
        error:
          err instanceof Error ? err.message : 'خطأ في تحميل التقارير',
      });
    }
  },

  // ================================================
  // Load Report By ID
  // ================================================
  loadReportById: async (reportId) => {
    try {
      set({ loading: true, error: null, revisions: [] });

      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select(
          '*, template:form_templates ( id, code, name_ar, description, category:template_categories ( code, name_ar, color, icon ) ), entity:entities!reports_entity_id_fkey ( id, name_ar, code ), creator:users!reports_created_by_fkey ( id, full_name, email )'
        )
        .eq('id', reportId)
        .eq('is_deleted', false)
        .single();

      if (reportError) {
        console.error('Error loading report:', reportError);
        throw reportError;
      }

      const { data: fieldsData } = await supabase
        .from('form_fields')
        .select('*')
        .eq('version_id', reportData.template_version_id)
        .order('order_index', { ascending: true });

      const currentReport: CurrentReport = {
        ...(reportData as unknown as ReportWithRelations),
        fields: (fieldsData || []) as ReportField[],
      };

      set({ currentReport, loading: false });

      await get().loadRevisions(reportId);
    } catch (err) {
      console.error('loadReportById error:', err);
      set({
        loading: false,
        error:
          err instanceof Error ? err.message : 'خطأ في تحميل التقرير',
        currentReport: null,
        revisions: [],
      });
    }
  },

  // ================================================
  // Load Revisions
  // ================================================
  loadRevisions: async (reportId) => {
    try {
      const { data, error } = await supabase
        .from('report_revisions')
        .select(
          'id, report_id, revision_number, changed_fields, change_summary, changed_by, created_at, user:users!report_revisions_changed_by_fkey ( id, full_name, email )'
        )
        .eq('report_id', reportId)
        .order('revision_number', { ascending: false });

      if (error) {
        console.error('Error loading revisions:', error);
        return;
      }

      set({ revisions: (data || []) as unknown as ReportRevision[] });
    } catch (err) {
      console.error('loadRevisions error:', err);
      set({ revisions: [] });
    }
  },

  // ================================================
  // Create Report + Send Notification
  // ================================================
  createReport: async (input) => {
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

      const { data, error } = await supabase
        .from('reports')
        .insert({
          template_id: input.templateId,
          template_version_id: input.templateVersionId,
          entity_id: input.entityId,
          region_id: input.regionId,
          created_by: userData.id,
          data: input.data,
          period_type: input.periodType,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating report:', error);
        throw new Error(error.message || 'فشل إنشاء التقرير');
      }

      // 🔔 إرسال التنبيه
      try {
        await sendNotification({
          triggerEvent: 'report.created',
          title: `📄 تقرير جديد`,
          body: `تم إنشاء تقرير جديد بواسطة ${userData.full_name}`,
          priority: 'normal',
          reportId: data.id,
          entityId: input.entityId,
          regionId: input.regionId || undefined,
          creatorId: userData.id,
        });
      } catch (notifErr) {
        console.error('⚠️ Notification failed:', notifErr);
      }

      set({ saving: false });
      return data.id;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'خطأ في إنشاء التقرير';
      console.error('createReport error:', err);
      set({ saving: false, error: message });
      throw err;
    }
  },

  // ================================================
  // Update Report + Send Notification
  // ================================================
  updateReport: async (reportId, input) => {
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

      const { error } = await supabase
        .from('reports')
        .update({
          data: input.data,
          period_type: input.periodType,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          last_edited_at: new Date().toISOString(),
          last_edited_by: userData.id,
        })
        .eq('id', reportId);

      if (error) {
        console.error('Error updating report:', error);
        throw new Error(error.message || 'فشل تحديث التقرير');
      }

      // 🔔 إرسال التنبيه
      try {
        await sendNotification({
          triggerEvent: 'report.updated',
          title: `✏️ تعديل تقرير`,
          body: `تم تعديل تقرير بواسطة ${userData.full_name}`,
          priority: 'low',
          reportId: reportId,
          creatorId: userData.id,
        });
      } catch (notifErr) {
        console.error('⚠️ Notification failed:', notifErr);
      }

      set({ saving: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'خطأ في تحديث التقرير';
      console.error('updateReport error:', err);
      set({ saving: false, error: message });
      throw err;
    }
  },

  // ================================================
  // Delete Report (Deep Delete)
  // ================================================
  deleteReport: async (reportId, reason) => {
    try {
      set({ deleting: true, error: null });

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

      const { data: reportSnapshot } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

      await supabase.from('audit_log').insert({
        user_id: userData.id,
        action: 'deep_delete',
        resource_type: 'report',
        resource_id: reportId,
        changes: {
          reason: reason.trim(),
          snapshot: reportSnapshot,
        },
        metadata: {
          deleted_by_name: userData.full_name,
          deleted_by_email: userData.email,
        },
      });

      const { error: deleteError } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (deleteError) {
        console.error('Error deleting report:', deleteError);
        throw new Error(deleteError.message || 'فشل حذف التقرير');
      }

      // 🔔 إرسال التنبيه
      try {
        await sendNotification({
          triggerEvent: 'report.deleted',
          title: `🗑️ حذف تقرير`,
          body: `تم حذف تقرير بواسطة ${userData.full_name}`,
          priority: 'high',
          reportId: reportId,
          creatorId: userData.id,
        });
      } catch (notifErr) {
        console.error('⚠️ Notification failed:', notifErr);
      }

      set({ deleting: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'خطأ في حذف التقرير';
      console.error('deleteReport error:', err);
      set({ deleting: false, error: message });
      throw err;
    }
  },

  // ================================================
  // Filters & Cleanup
  // ================================================
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearFilters: () => set({ filters: {} }),

  clearCurrentReport: () => {
    set({ currentReport: null, revisions: [], error: null });
  },

  refresh: async (userId, entityId) => {
    await get().loadReports(userId, entityId);
  },
}));