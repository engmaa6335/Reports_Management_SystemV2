import { create } from 'zustand';
import * as api from '../lib/entities-api';
import type {
  EntityType,
  EntityWithRelations,
  EntityFilters,
  CreateEntityPayload,
  UpdateEntityPayload,
  EntityActivity,
  EntityStats,
  LinkedUser,
  LinkedReport,
} from '../types/entities';

// ================================================
// Store State
// ================================================

interface EntitiesState {
  allEntities: EntityWithRelations[];
  entities: EntityWithRelations[];
  loadingList: boolean;

  selectedEntity: EntityWithRelations | null;
  loadingDetail: boolean;

  children: EntityWithRelations[];
  linkedUsers: LinkedUser[];
  linkedReports: LinkedReport[];
  loadingRelations: boolean;

  activity: EntityActivity[];
  loadingActivity: boolean;

  entityTypes: EntityType[];
  regions: { id: string; name_ar: string; code: string | null }[];
  stats: EntityStats | null;

  saving: boolean;
  deleting: boolean;
  error: string | null;

  filters: EntityFilters;

  loadEntities: (filters?: Partial<EntityFilters>) => Promise<void>;
  refreshAll: () => Promise<void>;
  setFilters: (filters: Partial<EntityFilters>) => void;
  clearFilters: () => void;

  loadEntityById: (id: string) => Promise<void>;
  clearSelectedEntity: () => void;

  loadRelations: (id: string) => Promise<void>;
  loadActivity: (id: string) => Promise<void>;

  loadEntityTypes: () => Promise<void>;
  loadRegions: () => Promise<void>;
  loadStats: () => Promise<void>;

  createEntity: (payload: CreateEntityPayload) => Promise<string>;
  updateEntity: (id: string, payload: UpdateEntityPayload) => Promise<void>;
  softDelete: (id: string) => Promise<void>;
  activate: (id: string) => Promise<void>;
  hardDelete: (id: string) => Promise<void>;

  clearError: () => void;
}

// ================================================
// Default filters
// ================================================

const DEFAULT_FILTERS: EntityFilters = {
  search: '',
  typeCode: null,
  parentTypeCode: null,
  isActive: null,
  regionId: null,
  parentId: null,
};

// ================================================
// Local filter helper
// ================================================

function applyFilters(
  all: EntityWithRelations[],
  filters: EntityFilters
): EntityWithRelations[] {
  let result = all;

  if (filters.search && filters.search.trim()) {
    const s = filters.search.toLowerCase().trim();
    result = result.filter(
      (e) =>
        (e.name_ar && e.name_ar.toLowerCase().includes(s)) ||
        (e.name_en && e.name_en.toLowerCase().includes(s)) ||
        (e.code && e.code.toLowerCase().includes(s))
    );
  }

  if (filters.typeCode) {
    result = result.filter((e) => e.entity_type?.code === filters.typeCode);
  }

  if (filters.parentTypeCode) {
    result = result.filter(
      (e) => e.parent?.entity_type_code === filters.parentTypeCode
    );
  }

  if (filters.isActive !== null) {
    result = result.filter((e) => e.is_active === filters.isActive);
  }

  // ⭐ فلترة المنطقة حسب parent_id
  if (filters.regionId) {
    result = result.filter((e) => e.parent_id === filters.regionId);
  }

  if (filters.parentId) {
    result = result.filter((e) => e.parent_id === filters.parentId);
  }

  return result;
}

// ================================================
// Store
// ================================================

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  allEntities: [],
  entities: [],
  loadingList: false,

  selectedEntity: null,
  loadingDetail: false,

  children: [],
  linkedUsers: [],
  linkedReports: [],
  loadingRelations: false,

  activity: [],
  loadingActivity: false,

  entityTypes: [],
  regions: [],
  stats: null,

  saving: false,
  deleting: false,
  error: null,

  filters: { ...DEFAULT_FILTERS },

  // ============================================
  // List
  // ============================================

  loadEntities: async (newFilters) => {
    const filters = { ...get().filters, ...newFilters };
    set({ loadingList: true, error: null, filters });

    try {
      const allEntities = await api.listEntities({
        search: '',
        typeCode: null,
        parentTypeCode: null,
        isActive: null,
        regionId: null,
        parentId: null,
      });

      const filtered = applyFilters(allEntities, filters);

      set({
        allEntities,
        entities: filtered,
        loadingList: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الكيانات';
      set({
        error: msg,
        loadingList: false,
        entities: [],
        allEntities: [],
      });
    }
  },

  refreshAll: async () => {
    const filters = get().filters;
    await get().loadEntities(filters);
  },

  setFilters: (newFilters) => {
    const filters = { ...get().filters, ...newFilters };
    set({ filters });

    const filtered = applyFilters(get().allEntities, filters);
    set({ entities: filtered });
  },

  clearFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
    set({ entities: get().allEntities });
  },

  // ============================================
  // Detail
  // ============================================

  loadEntityById: async (id) => {
    set({ loadingDetail: true, error: null });
    try {
      const entity = await api.getEntityById(id);
      set({ selectedEntity: entity, loadingDetail: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الكيان';
      set({ error: msg, loadingDetail: false, selectedEntity: null });
    }
  },

  clearSelectedEntity: () => {
    set({
      selectedEntity: null,
      children: [],
      linkedUsers: [],
      linkedReports: [],
      activity: [],
    });
  },

  // ============================================
  // Relations
  // ============================================

  loadRelations: async (id) => {
    set({ loadingRelations: true });
    try {
      const [children, users, reports] = await Promise.all([
        api.getEntityChildren(id),
        api.getEntityUsers(id),
        api.getEntityReports(id),
      ]);
      set({
        children,
        linkedUsers: users,
        linkedReports: reports,
        loadingRelations: false,
      });
    } catch (err) {
      console.error('Failed to load relations:', err);
      set({ loadingRelations: false });
    }
  },

  // ============================================
  // Activity
  // ============================================

  loadActivity: async (id) => {
    set({ loadingActivity: true });
    try {
      const activity = await api.getEntityActivity(id);
      set({ activity, loadingActivity: false });
    } catch (err) {
      console.error('Failed to load activity:', err);
      set({ loadingActivity: false, activity: [] });
    }
  },

  // ============================================
  // Meta
  // ============================================

  loadEntityTypes: async () => {
    try {
      const entityTypes = await api.listEntityTypes();
      set({ entityTypes });
    } catch (err) {
      console.error('Failed to load entity types:', err);
    }
  },

  loadRegions: async () => {
    try {
      const regions = await api.listRegions();
      set({ regions });
    } catch (err) {
      console.error('Failed to load regions:', err);
    }
  },

  loadStats: async () => {
    try {
      const stats = await api.getEntityStats();
      set({ stats });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  },

  // ============================================
  // CRUD
  // ============================================

  createEntity: async (payload) => {
    set({ saving: true, error: null });
    try {
      const { id } = await api.createEntity(payload);
      set({ saving: false });
      await get().refreshAll();
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء الكيان';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  updateEntity: async (id, payload) => {
    set({ saving: true, error: null });
    try {
      await api.updateEntity(id, payload);
      set({ saving: false });
      await get().refreshAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث الكيان';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  softDelete: async (id) => {
    set({ deleting: true, error: null });
    try {
      await api.softDeleteEntity(id);
      set({ deleting: false });
      await get().refreshAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل التعطيل';
      set({ error: msg, deleting: false });
      throw err;
    }
  },

  activate: async (id) => {
    set({ deleting: true, error: null });
    try {
      await api.activateEntity(id);
      set({ deleting: false });
      await get().refreshAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل التفعيل';
      set({ error: msg, deleting: false });
      throw err;
    }
  },

  hardDelete: async (id) => {
    set({ deleting: true, error: null });
    try {
      await api.hardDeleteEntity(id);
      set({ deleting: false });
      await get().refreshAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل الحذف';
      set({ error: msg, deleting: false });
      throw err;
    }
  },

  // ============================================
  // Utils
  // ============================================

  clearError: () => set({ error: null }),
}));