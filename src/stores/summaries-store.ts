// ═══════════════════════════════════════════════════════════
// Summaries Store — Zustand
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import * as api from '../lib/summaries-api';
import type {
  AggregateSummaryWithRelations,
  SummarizableTemplate,
  SummaryFilters,
  SummaryPreview,
  SummaryPoint,
  CreateSummaryInput,
  UpdateSummaryInput,
  SummarizationOptions,
  SummaryStatus,
} from '../types/summaries';
import type { PeriodType } from '../types/aggregates';

// ═══════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════

interface GeneratedPreview {
  strengths: SummaryPoint[];
  improvements: SummaryPoint[];
  stats: {
    total_reports: number;
    strengths_raw_count: number;
    improvements_raw_count: number;
    strengths_final_count: number;
    improvements_final_count: number;
    strengths_merged_count: number;
    improvements_merged_count: number;
  };
}

interface SummariesState {
  // ─── Data ───
  templates: SummarizableTemplate[];
  summaries: AggregateSummaryWithRelations[];
  currentSummary: AggregateSummaryWithRelations | null;

  // ─── Preview (before creation) ───
  preview: SummaryPreview | null;
  generatedPreview: GeneratedPreview | null;

  // ─── Filters ───
  filters: SummaryFilters;

  // ─── UI State ───
  loadingTemplates: boolean;
  loadingList: boolean;
  loadingDetail: boolean;
  previewing: boolean;
  generating: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;

  // ─── Actions: Templates ───
  loadTemplates: () => Promise<void>;

  // ─── Actions: List ───
  loadSummaries: (filters?: Partial<SummaryFilters>) => Promise<void>;
  refreshList: () => Promise<void>;

  // ─── Actions: Detail ───
  loadSummaryById: (id: string) => Promise<void>;
  clearCurrentSummary: () => void;

  // ─── Actions: Preview ───
  previewSummary: (params: {
    template_id: string;
    period_type: PeriodType;
    period_start: string;
    period_end: string;
    region_id?: string | null;
    entity_id?: string | null;
  }) => Promise<SummaryPreview | null>;

  generatePreview: (options?: Partial<SummarizationOptions>) => Promise<GeneratedPreview | null>;

  clearPreview: () => void;

  // ─── Actions: CRUD ───
  createSummary: (input: CreateSummaryInput) => Promise<string>;
  updateSummary: (id: string, input: UpdateSummaryInput) => Promise<void>;
  updateStatus: (id: string, status: SummaryStatus) => Promise<void>;
  deleteSummary: (id: string, reason: string) => Promise<void>;

  // ─── Actions: Filters ───
  setFilters: (filters: Partial<SummaryFilters>) => void;
  clearFilters: () => void;

  // ─── Actions: Error ───
  clearError: () => void;
}

// ═══════════════════════════════════════════════════════════
// Default Filters
// ═══════════════════════════════════════════════════════════

const DEFAULT_FILTERS: SummaryFilters = {
  search: '',
  templateId: null,
  periodType: null,
  classification: null,
  regionId: null,
  status: null,
};

// ═══════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════

export const useSummariesStore = create<SummariesState>((set, get) => ({
  // Initial state
  templates: [],
  summaries: [],
  currentSummary: null,

  preview: null,
  generatedPreview: null,

  filters: { ...DEFAULT_FILTERS },

  loadingTemplates: false,
  loadingList: false,
  loadingDetail: false,
  previewing: false,
  generating: false,
  saving: false,
  deleting: false,
  error: null,

  // ═══════════════════════════════════════════
  // Templates
  // ═══════════════════════════════════════════

  loadTemplates: async () => {
    set({ loadingTemplates: true, error: null });
    try {
      const templates = await api.listSummarizableTemplates();
      set({ templates, loadingTemplates: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل القوالب';
      set({ error: msg, loadingTemplates: false, templates: [] });
    }
  },

  // ═══════════════════════════════════════════
  // List
  // ═══════════════════════════════════════════

  loadSummaries: async (newFilters) => {
    const filters = { ...get().filters, ...(newFilters || {}) };
    set({ loadingList: true, error: null, filters });

    try {
      const summaries = await api.listSummaries(filters);
      set({ summaries, loadingList: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الملخصات';
      set({ error: msg, loadingList: false, summaries: [] });
    }
  },

  refreshList: async () => {
    const filters = get().filters;
    await get().loadSummaries(filters);
  },

  // ═══════════════════════════════════════════
  // Detail
  // ═══════════════════════════════════════════

  loadSummaryById: async (id) => {
    set({ loadingDetail: true, error: null });
    try {
      const summary = await api.getSummaryById(id);
      set({ currentSummary: summary, loadingDetail: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الملخص';
      set({ error: msg, loadingDetail: false, currentSummary: null });
    }
  },

  clearCurrentSummary: () => {
    set({ currentSummary: null });
  },

  // ═══════════════════════════════════════════
  // Preview
  // ═══════════════════════════════════════════

  previewSummary: async (params) => {
    set({ previewing: true, error: null, preview: null, generatedPreview: null });
    try {
      const preview = await api.previewSummaryData(params);
      set({ preview, previewing: false });
      return preview;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل المعاينة';
      set({ error: msg, previewing: false });
      return null;
    }
  },

  generatePreview: async (options) => {
    const { preview } = get();
    if (!preview || preview.report_ids.length === 0) {
      set({ error: 'لا توجد تقارير للمعاينة' });
      return null;
    }

    set({ generating: true, error: null });
    try {
      const generated = await api.generateSummaryPreview({
        report_ids: preview.report_ids,
        options,
      });
      set({ generatedPreview: generated, generating: false });
      return generated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل توليد المعاينة';
      set({ error: msg, generating: false });
      return null;
    }
  },

  clearPreview: () => {
    set({ preview: null, generatedPreview: null });
  },

  // ═══════════════════════════════════════════
  // Create
  // ═══════════════════════════════════════════

  createSummary: async (input) => {
    set({ saving: true, error: null });
    try {
      const { id } = await api.createSummary(input);
      await get().refreshList();
      set({ saving: false });
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء الملخص';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  // ═══════════════════════════════════════════
  // Update
  // ═══════════════════════════════════════════

  updateSummary: async (id, input) => {
    set({ saving: true, error: null });
    try {
      await api.updateSummary(id, input);
      await get().loadSummaryById(id);
      await get().refreshList();
      set({ saving: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث الملخص';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  updateStatus: async (id, status) => {
    set({ saving: true, error: null });
    try {
      await api.updateSummary(id, { status });
      await get().loadSummaryById(id);
      await get().refreshList();
      set({ saving: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث الحالة';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  // ═══════════════════════════════════════════
  // Delete
  // ═══════════════════════════════════════════

  deleteSummary: async (id, reason) => {
    set({ deleting: true, error: null });
    try {
      await api.deleteSummary(id, reason);
      set((state) => ({
        summaries: state.summaries.filter((s) => s.id !== id),
        deleting: false,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل حذف الملخص';
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
    get().loadSummaries(filters);
  },

  clearFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
    get().loadSummaries(DEFAULT_FILTERS);
  },

  // ═══════════════════════════════════════════
  // Error
  // ═══════════════════════════════════════════

  clearError: () => set({ error: null }),
}));