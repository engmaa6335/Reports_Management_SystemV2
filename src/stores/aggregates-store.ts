import { create } from 'zustand';
import * as api from '../lib/aggregates-api';
import type {
  AggregateTemplateWithRelations,
  AggregateReportWithRelations,
  VisitRow,
  ManualActivityRow,
  CalculatedPeriod,
  CreateSpecialistAggregateInput,
  UpdateSpecialistAggregateInput,
  AggregateFilters,
  PeriodType,
  ReportType,
} from '../types/aggregates';

// ═══════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════

interface ExistingAggregateResult {
  id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  period_type: string | null;
}

interface AggregatesState {
  // ─── القوالب المتاحة ───
  availableTemplates: AggregateTemplateWithRelations[];
  selectedTemplate: AggregateTemplateWithRelations | null;

  // ─── الفترة المحسوبة ───
  periodType: PeriodType;
  calculatedPeriod: CalculatedPeriod | null;
  customPeriodStart: string;
  customPeriodEnd: string;

  // ─── الزيارات + الأنشطة ───
  visits: VisitRow[];
  manualActivities: ManualActivityRow[];
  visitsFetched: boolean;

  // ─── التحقق من التقرير السابق ───
  existingAggregate: ExistingAggregateResult | null;
  checkingExisting: boolean;

  // ─── قائمة التقارير ───
  aggregates: AggregateReportWithRelations[];
  allAggregates: AggregateReportWithRelations[];
  currentAggregate: AggregateReportWithRelations | null;

  // ─── البيانات الوصفية للمستخدم ───
  userMetadata: {
    specialist_name: string;
    specialization: string;
  } | null;

  // ─── Filters ───
  filters: AggregateFilters;

  // ─── UI State ───
  loadingTemplates: boolean;
  loadingVisits: boolean;
  loadingList: boolean;
  loadingDetail: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;

  // ─── Actions ───
  loadAvailableTemplates: (userId: string, entityId: string) => Promise<void>;
  selectTemplate: (template: AggregateTemplateWithRelations | null) => void;

  setPeriodType: (type: PeriodType) => void;
  setCustomPeriod: (start: string, end: string) => void;

  calculateCurrentPeriod: () => Promise<CalculatedPeriod | null>;

  fetchVisits: (params: {
    userId: string;
    entityId: string;
  }) => Promise<void>;

  checkExistingAggregate: (params: {
    userId: string;
    entityId: string;
  }) => Promise<ExistingAggregateResult | null>;
  clearExistingAggregate: () => void;

  setManualActivities: (activities: ManualActivityRow[]) => void;
  addManualActivity: () => void;
  updateManualActivity: (id: string, updates: Partial<ManualActivityRow>) => void;
  removeManualActivity: (id: string) => void;

  loadUserAggregates: (userId: string, entityId: string) => Promise<void>;
  loadAggregateById: (id: string) => Promise<void>;

  saveAggregate: (params: {
    userId: string;
    entityId: string;
    entityName: string;
    isEdit?: boolean;
  }) => Promise<string>;

  // ⭐ تحديث تقرير موجود
  updateAggregate: (params: {
    aggregateId: string;
    manualActivities: ManualActivityRow[];
  }) => Promise<void>;

  deleteAggregate: (id: string, reason: string) => Promise<void>;

  setFilters: (filters: Partial<AggregateFilters>) => void;
  clearFilters: () => void;

  clearSelection: () => void;
  clearCurrentAggregate: () => void;
  clearError: () => void;
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_FILTERS: AggregateFilters = {
  search: '',
  reportType: null,
  periodType: null,
  isActive: null,
};

// ═══════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════

export const useAggregatesStore = create<AggregatesState>((set, get) => ({
  // Initial state
  availableTemplates: [],
  selectedTemplate: null,

  periodType: 'biweekly',
  calculatedPeriod: null,
  customPeriodStart: '',
  customPeriodEnd: '',

  visits: [],
  manualActivities: [],
  visitsFetched: false,

  existingAggregate: null,
  checkingExisting: false,

  aggregates: [],
  allAggregates: [],
  currentAggregate: null,

  userMetadata: null,

  filters: { ...DEFAULT_FILTERS },

  loadingTemplates: false,
  loadingVisits: false,
  loadingList: false,
  loadingDetail: false,
  saving: false,
  deleting: false,
  error: null,

  // ═══════════════════════════════════════════
  // Templates
  // ═══════════════════════════════════════════

  loadAvailableTemplates: async (userId, entityId) => {
    set({ loadingTemplates: true, error: null });

    try {
      const [templates, userMeta] = await Promise.all([
        api.listAvailableAggregateTemplates(userId, entityId),
        api.getUserMetadata(userId),
      ]);

      set({
        availableTemplates: templates,
        userMetadata: userMeta,
        loadingTemplates: false,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'فشل تحميل القوالب';
      set({
        error: msg,
        loadingTemplates: false,
        availableTemplates: [],
      });
    }
  },

  selectTemplate: (template) => {
    set({
      selectedTemplate: template,
      visits: [],
      manualActivities: [],
      visitsFetched: false,
      calculatedPeriod: null,
      existingAggregate: null,
      error: null,
    });
  },

  // ═══════════════════════════════════════════
  // Period
  // ═══════════════════════════════════════════

  setPeriodType: (type) => {
    set({ periodType: type });
  },

  setCustomPeriod: (start, end) => {
    set({
      customPeriodStart: start,
      customPeriodEnd: end,
    });
  },

  calculateCurrentPeriod: async () => {
    const state = get();
    const { periodType, customPeriodStart, customPeriodEnd } = state;

    try {
      const { calculatePeriod } = await import('../lib/period-calculator');

      const period = calculatePeriod(
        periodType,
        customPeriodStart,
        customPeriodEnd
      );

      set({ calculatedPeriod: period });
      return period;
    } catch (err) {
      console.error('calculateCurrentPeriod error:', err);
      return null;
    }
  },

  // ⭐ جلب الزيارات
  fetchVisits: async ({ userId, entityId }) => {
    const state = get();
    const {
      selectedTemplate,
      periodType,
      customPeriodStart,
      customPeriodEnd,
    } = state;

    if (!selectedTemplate) return;

    set({ loadingVisits: true, error: null, existingAggregate: null });

    try {
      const { calculatePeriod } = await import('../lib/period-calculator');

      const period = calculatePeriod(
        periodType,
        customPeriodStart,
        customPeriodEnd
      );

      set({ calculatedPeriod: period });

      if (!period.start || !period.end) {
        set({
          loadingVisits: false,
          visits: [],
          visitsFetched: false,
          error: 'الفترة غير محددة',
        });
        return;
      }

      if (!period.isComplete) {
        set({
          loadingVisits: false,
          visits: [],
          visitsFetched: false,
          error: '⚠️ ' + period.label,
        });
        return;
      }

      // ⭐ تحقق من وجود تقرير سابق
      const existing = await api.findExistingAggregate({
        userId,
        entityId,
        aggregateTemplateId: selectedTemplate.id,
        periodType,
        periodStart: period.start,
        periodEnd: period.end,
      });

      if (existing) {
        set({
          existingAggregate: existing,
          loadingVisits: false,
          visits: [],
          visitsFetched: false,
        });
        return;
      }

      const reportType = selectedTemplate.calculations.report_type;
      const sourceTemplateId = selectedTemplate.source_template_ids[0];

      if (!sourceTemplateId) {
        set({
          loadingVisits: false,
          visits: [],
          visitsFetched: false,
          error: 'القالب لا يحتوي على قالب مصدر',
        });
        return;
      }

      const visits = await api.fetchVisitsInPeriod({
        sourceTemplateId,
        periodStart: period.start,
        periodEnd: period.end,
        userId,
        reportType,
      });

      set({
        visits,
        visitsFetched: true,
        loadingVisits: false,
        existingAggregate: null,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'فشل جلب الزيارات';
      set({
        error: msg,
        loadingVisits: false,
        visits: [],
        visitsFetched: false,
      });
    }
  },

  checkExistingAggregate: async ({ userId, entityId }) => {
    const state = get();
    const {
      selectedTemplate,
      periodType,
      customPeriodStart,
      customPeriodEnd,
    } = state;

    if (!selectedTemplate) return null;

    set({ checkingExisting: true });

    try {
      const { calculatePeriod } = await import('../lib/period-calculator');
      const period = calculatePeriod(
        periodType,
        customPeriodStart,
        customPeriodEnd
      );

      if (!period.isComplete) {
        set({ checkingExisting: false });
        return null;
      }

      const existing = await api.findExistingAggregate({
        userId,
        entityId,
        aggregateTemplateId: selectedTemplate.id,
        periodType,
        periodStart: period.start,
        periodEnd: period.end,
      });

      set({ existingAggregate: existing, checkingExisting: false });
      return existing;
    } catch (err) {
      console.error('checkExistingAggregate error:', err);
      set({ checkingExisting: false });
      return null;
    }
  },

  clearExistingAggregate: () => {
    set({ existingAggregate: null });
  },

  // ═══════════════════════════════════════════
  // Manual Activities
  // ═══════════════════════════════════════════

  setManualActivities: (activities) => {
    set({ manualActivities: activities });
  },

  addManualActivity: () => {
    const newActivity: ManualActivityRow = {
      id: generateLocalId(),
      date: new Date().toISOString().split('T')[0],
      activity: '',
      topic: '',
      target_group: '',
    };

    set((state) => ({
      manualActivities: [...state.manualActivities, newActivity],
    }));
  },

  updateManualActivity: (id, updates) => {
    set((state) => ({
      manualActivities: state.manualActivities.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  },

  removeManualActivity: (id) => {
    set((state) => ({
      manualActivities: state.manualActivities.filter((a) => a.id !== id),
    }));
  },

  // ═══════════════════════════════════════════
  // List Aggregates
  // ═══════════════════════════════════════════

  loadUserAggregates: async (userId, entityId) => {
    set({ loadingList: true, error: null });

    try {
      const allAggregates = await api.listUserAggregates(userId, entityId);
      const filters = get().filters;

      let filtered = allAggregates;

      if (filters.reportType) {
        filtered = filtered.filter((a) => {
          const calcs = a.aggregate_template?.calculations as any;
          return calcs?.report_type === filters.reportType;
        });
      }

      if (filters.periodType) {
        filtered = filtered.filter(
          (a) => a.period_type === filters.periodType
        );
      }

      if (filters.search.trim()) {
        const s = filters.search.toLowerCase().trim();
        filtered = filtered.filter((a) => {
          const name =
            a.aggregate_template?.name_ar?.toLowerCase() || '';
          return name.includes(s);
        });
      }

      set({
        allAggregates,
        aggregates: filtered,
        loadingList: false,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'فشل تحميل التقارير';
      set({
        error: msg,
        loadingList: false,
        aggregates: [],
        allAggregates: [],
      });
    }
  },

  loadAggregateById: async (id) => {
    set({ loadingDetail: true, error: null });

    try {
      const aggregate = await api.getAggregateById(id);
      set({ currentAggregate: aggregate, loadingDetail: false });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'فشل تحميل التقرير';
      set({
        error: msg,
        loadingDetail: false,
        currentAggregate: null,
      });
    }
  },

  // ═══════════════════════════════════════════
  // Save
  // ═══════════════════════════════════════════

  saveAggregate: async ({
    userId,
    entityId,
    entityName,
    isEdit,
  }) => {
    const state = get();
    const {
      selectedTemplate,
      calculatedPeriod,
      periodType,
      visits,
      manualActivities,
      userMetadata,
      currentAggregate,
    } = state;

    if (!selectedTemplate) {
      throw new Error('لم يتم اختيار قالب');
    }

    if (!calculatedPeriod || !calculatedPeriod.isComplete) {
      throw new Error('الفترة غير مكتملة');
    }

    if (!userMetadata) {
      throw new Error('بيانات المستخدم غير متوفرة');
    }

    set({ saving: true, error: null });

    try {
      const reportType = selectedTemplate.calculations.report_type;

      const metadata = {
        specialist_name: userMetadata.specialist_name,
        specialization: userMetadata.specialization,
        region_name: entityName,
        report_type: reportType,
        period_label: calculatedPeriod.label,
      };

      let aggregateId: string;

      if (isEdit && currentAggregate) {
        const input: UpdateSpecialistAggregateInput = {
          periodType,
          periodStart: calculatedPeriod.start,
          periodEnd: calculatedPeriod.end,
          visits,
          manualActivities,
          metadata,
        };

        await api.updateSpecialistAggregate(currentAggregate.id, input);
        aggregateId = currentAggregate.id;
      } else {
        const input: CreateSpecialistAggregateInput = {
          aggregateTemplateId: selectedTemplate.id,
          entityId,
          regionId: null,
          periodType,
          periodStart: calculatedPeriod.start,
          periodEnd: calculatedPeriod.end,
          visits,
          manualActivities,
          metadata,
        };

        const result = await api.createSpecialistAggregate(input);
        aggregateId = result.id;
      }

      await get().loadUserAggregates(userId, entityId);

      set({ saving: false });
      return aggregateId;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'فشل حفظ التقرير';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  // ═══════════════════════════════════════════
  // ⭐ Update Aggregate (تعديل تقرير موجود)
  // ═══════════════════════════════════════════

  updateAggregate: async ({ aggregateId, manualActivities }) => {
    set({ saving: true, error: null });

    try {
      // 1. جلب التقرير الحالي
      const aggregate = await api.getAggregateById(aggregateId);
      if (!aggregate) throw new Error('التقرير غير موجود');

      // 2. استخراج البيانات الحالية
      const reportData = aggregate.data as any;
      const periodType = (aggregate.period_type || 'custom') as PeriodType;

      // 3. استخدام updateSpecialistAggregate
      await api.updateSpecialistAggregate(aggregateId, {
        periodType,
        periodStart: aggregate.period_start || '',
        periodEnd: aggregate.period_end || '',
        visits: reportData.visits || [],
        manualActivities,
        metadata: {
          specialist_name: reportData.specialist_name || '',
          specialization: reportData.specialization || '',
          region_name: reportData.region_name || '',
          report_type: reportData.report_type || 'RL',
          period_label: reportData.period_label || '',
        },
      });

      set({ saving: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل حفظ التعديلات';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  // ═══════════════════════════════════════════
  // Delete
  // ═══════════════════════════════════════════

  deleteAggregate: async (id, reason) => {
    set({ deleting: true, error: null });

    try {
      await api.softDeleteAggregate(id, reason);

      set((state) => ({
        aggregates: state.aggregates.filter((a) => a.id !== id),
        allAggregates: state.allAggregates.filter((a) => a.id !== id),
        deleting: false,
      }));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'فشل حذف التقرير';
      set({ error: msg, deleting: false });
      throw err;
    }
  },

  // ═══════════════════════════════════════════
  // Filters
  // ═══════════════════════════════════════════

  setFilters: (partial) => {
    const filters = { ...get().filters, ...partial };
    set({ filters });

    let filtered = get().allAggregates;

    if (filters.reportType) {
      filtered = filtered.filter((a) => {
        const calcs = a.aggregate_template?.calculations as any;
        return calcs?.report_type === filters.reportType;
      });
    }

    if (filters.periodType) {
      filtered = filtered.filter(
        (a) => a.period_type === filters.periodType
      );
    }

    if (filters.search.trim()) {
      const s = filters.search.toLowerCase().trim();
      filtered = filtered.filter((a) => {
        const name = a.aggregate_template?.name_ar?.toLowerCase() || '';
        return name.includes(s);
      });
    }

    set({ aggregates: filtered });
  },

  clearFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
    set({ aggregates: get().allAggregates });
  },

  // ═══════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════

  clearSelection: () => {
    set({
      selectedTemplate: null,
      visits: [],
      manualActivities: [],
      visitsFetched: false,
      calculatedPeriod: null,
      periodType: 'biweekly',
      customPeriodStart: '',
      customPeriodEnd: '',
      existingAggregate: null,
      error: null,
    });
  },

  clearCurrentAggregate: () => {
    set({ currentAggregate: null });
  },

  clearError: () => set({ error: null }),
}));