import { create } from 'zustand';
import * as api from '../lib/templates-admin-api';
import type {
  TemplateCategory,
  TemplateWithRelations,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  TemplateFilters,
  FormField,
  CreateFieldPayload,
  UpdateFieldPayload,
  RoleOption,
  EntityTypeOption,
  DeleteTemplateCheck,
} from '../types/templates-admin';

// ================================================
// Store State
// ================================================

interface TemplatesAdminState {
  // Lists
  templates: TemplateWithRelations[];
  allTemplates: TemplateWithRelations[];

  // Detail
  selectedTemplate: TemplateWithRelations | null;
  fields: FormField[];

  // Lookups
  categories: TemplateCategory[];
  roles: RoleOption[];
  entityTypes: EntityTypeOption[];

  // Filters
  filters: TemplateFilters;

  // UI State
  loadingList: boolean;
  loadingDetail: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;

  // Actions — Templates
  loadTemplates: (filters?: Partial<TemplateFilters>) => Promise<void>;
  loadTemplateById: (id: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  loadRoles: () => Promise<void>;
  loadEntityTypes: () => Promise<void>;
  clearSelectedTemplate: () => void;

  setFilters: (filters: Partial<TemplateFilters>) => void;
  clearFilters: () => void;

  createTemplate: (payload: CreateTemplatePayload) => Promise<string>;
  updateTemplate: (id: string, payload: UpdateTemplatePayload) => Promise<void>;
  checkDeleteTemplate: (id: string) => Promise<DeleteTemplateCheck>;
  softDeleteTemplate: (id: string) => Promise<void>;
  cascadeDeleteTemplate: (id: string) => Promise<void>;

  // Actions — Fields
  loadFields: (versionId: string) => Promise<void>;
  createField: (
    versionId: string,
    payload: CreateFieldPayload
  ) => Promise<string>;
  updateField: (id: string, payload: UpdateFieldPayload) => Promise<void>;
  deleteField: (id: string) => Promise<void>;
  reorderFields: (
    updates: Array<{ id: string; order_index: number }>
  ) => Promise<void>;

  // Utils
  refreshAll: () => Promise<void>;
  clearError: () => void;
}

const initialFilters: TemplateFilters = {
  search: '',
  categoryCode: null,
  isActive: null,
};

// ================================================
// Store
// ================================================

export const useTemplatesAdminStore = create<TemplatesAdminState>(
  (set, get) => ({
    // Initial state
    templates: [],
    allTemplates: [],
    selectedTemplate: null,
    fields: [],
    categories: [],
    roles: [],
    entityTypes: [],
    filters: initialFilters,
    loadingList: false,
    loadingDetail: false,
    saving: false,
    deleting: false,
    error: null,

    // ============================================
    // Templates — List
    // ============================================
    loadTemplates: async (newFilters) => {
      const filters = { ...get().filters, ...(newFilters || {}) };
      set({ loadingList: true, error: null, filters });

      try {
        // ⭐ جلب كل القوالب (بدون فلتر)
        const allTemplates = await api.listTemplates({
          search: '',
          categoryCode: null,
          isActive: null,
        });

        // ⭐ فلترة محلية
        let filtered = allTemplates;

        if (filters.search.trim()) {
          const s = filters.search.toLowerCase().trim();
          filtered = filtered.filter(
            (t) =>
              t.name_ar?.toLowerCase().includes(s) ||
              t.name_en?.toLowerCase().includes(s) ||
              t.code?.toLowerCase().includes(s)
          );
        }

        if (filters.categoryCode) {
          filtered = filtered.filter(
            (t) => t.category?.code === filters.categoryCode
          );
        }

        if (filters.isActive !== null) {
          filtered = filtered.filter((t) => t.is_active === filters.isActive);
        }

        set({
          allTemplates,
          templates: filtered,
          loadingList: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل تحميل القوالب';
        set({ error: msg, loadingList: false, templates: [], allTemplates: [] });
      }
    },

    refreshAll: async () => {
      const filters = get().filters;
      await get().loadTemplates(filters);
    },

    setFilters: (partial) => {
      const filters = { ...get().filters, ...partial };
      set({ filters });

      // فلترة محلية فورية
      let filtered = get().allTemplates;

      if (filters.search.trim()) {
        const s = filters.search.toLowerCase().trim();
        filtered = filtered.filter(
          (t) =>
            t.name_ar?.toLowerCase().includes(s) ||
            t.name_en?.toLowerCase().includes(s) ||
            t.code?.toLowerCase().includes(s)
        );
      }

      if (filters.categoryCode) {
        filtered = filtered.filter(
          (t) => t.category?.code === filters.categoryCode
        );
      }

      if (filters.isActive !== null) {
        filtered = filtered.filter((t) => t.is_active === filters.isActive);
      }

      set({ templates: filtered });
    },

    clearFilters: () => {
      set({ filters: initialFilters });
      set({ templates: get().allTemplates });
    },

    // ============================================
    // Templates — Detail
    // ============================================
    loadTemplateById: async (id) => {
      set({ loadingDetail: true, error: null });

      try {
        const template = await api.getTemplateById(id);
        set({ selectedTemplate: template, loadingDetail: false });

        // احمل الحقول إذا كان هناك نسخة
        if (template?.current_version_id) {
          const fields = await api.listFields(template.current_version_id);
          set({ fields });
        } else {
          set({ fields: [] });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل تحميل القالب';
        set({
          error: msg,
          loadingDetail: false,
          selectedTemplate: null,
          fields: [],
        });
      }
    },

    clearSelectedTemplate: () => {
      set({ selectedTemplate: null, fields: [] });
    },

    // ============================================
    // Lookups
    // ============================================
    loadCategories: async () => {
      try {
        const categories = await api.listCategories();
        set({ categories });
      } catch (err) {
        console.error('loadCategories error:', err);
      }
    },

    loadRoles: async () => {
      try {
        const roles = await api.listRolesForSelect();
        set({ roles });
      } catch (err) {
        console.error('loadRoles error:', err);
      }
    },

    loadEntityTypes: async () => {
      try {
        const entityTypes = await api.listEntityTypesForSelect();
        set({ entityTypes });
      } catch (err) {
        console.error('loadEntityTypes error:', err);
      }
    },

    // ============================================
    // Templates — CRUD
    // ============================================
    createTemplate: async (payload) => {
      set({ saving: true, error: null });
      try {
        const { id } = await api.createTemplate(payload);
        set({ saving: false });
        await get().refreshAll();
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل إنشاء القالب';
        set({ error: msg, saving: false });
        throw err;
      }
    },

    updateTemplate: async (id, payload) => {
      set({ saving: true, error: null });
      try {
        await api.updateTemplate(id, payload);
        set({ saving: false });
        await get().refreshAll();
        // حدّث التفاصيل إذا كان محمّلاً
        if (get().selectedTemplate?.id === id) {
          await get().loadTemplateById(id);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل تحديث القالب';
        set({ error: msg, saving: false });
        throw err;
      }
    },

    checkDeleteTemplate: async (id) => {
      return await api.canDeleteTemplate(id);
    },

    softDeleteTemplate: async (id) => {
      set({ deleting: true, error: null });
      try {
        await api.softDeleteTemplate(id);
        set({ deleting: false });
        await get().refreshAll();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل التعطيل';
        set({ error: msg, deleting: false });
        throw err;
      }
    },

    cascadeDeleteTemplate: async (id) => {
      set({ deleting: true, error: null });
      try {
        await api.cascadeDeleteTemplate(id);
        set({ deleting: false });
        await get().refreshAll();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل الحذف';
        set({ error: msg, deleting: false });
        throw err;
      }
    },

    // ============================================
    // Fields — CRUD
    // ============================================
    loadFields: async (versionId) => {
      try {
        const fields = await api.listFields(versionId);
        set({ fields });
      } catch (err) {
        console.error('loadFields error:', err);
      }
    },

    createField: async (versionId, payload) => {
      set({ saving: true, error: null });
      try {
        const { id } = await api.createField(versionId, payload);
        set({ saving: false });

        // أعد تحميل الحقول
        await get().loadFields(versionId);

        // حدّث العدد في selectedTemplate
        if (get().selectedTemplate) {
          set((state) => ({
            selectedTemplate: state.selectedTemplate
              ? {
                  ...state.selectedTemplate,
                  fields_count:
                    (state.selectedTemplate.fields_count || 0) + 1,
                }
              : null,
          }));
        }

        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل إنشاء الحقل';
        set({ error: msg, saving: false });
        throw err;
      }
    },

    updateField: async (id, payload) => {
      set({ saving: true, error: null });
      try {
        await api.updateField(id, payload);
        set({ saving: false });

        // ⭐ حدّث القائمة محلياً
        set((state) => ({
          fields: state.fields.map((f) =>
            f.id === id ? { ...f, ...payload } : f
          ),
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل تحديث الحقل';
        set({ error: msg, saving: false });
        throw err;
      }
    },

    deleteField: async (id) => {
      set({ deleting: true, error: null });
      try {
        await api.deleteField(id);
        set({ deleting: false });

        // ⭐ احذف محلياً
        set((state) => ({
          fields: state.fields.filter((f) => f.id !== id),
          selectedTemplate: state.selectedTemplate
            ? {
                ...state.selectedTemplate,
                fields_count: Math.max(
                  0,
                  (state.selectedTemplate.fields_count || 1) - 1
                ),
              }
            : null,
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل حذف الحقل';
        set({ error: msg, deleting: false });
        throw err;
      }
    },

    reorderFields: async (updates) => {
      set({ saving: true, error: null });
      try {
        await api.reorderFields(updates);
        set({ saving: false });

        // ⭐ حدّث محلياً
        set((state) => {
          const map = new Map(updates.map((u) => [u.id, u.order_index]));
          return {
            fields: state.fields
              .map((f) => ({
                ...f,
                order_index: map.get(f.id) ?? f.order_index,
              }))
              .sort(
                (a, b) => (a.order_index || 0) - (b.order_index || 0)
              ),
          };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'فشل إعادة الترتيب';
        set({ error: msg, saving: false });
        throw err;
      }
    },

    // ============================================
    // Utils
    // ============================================
    clearError: () => set({ error: null }),
  })
);