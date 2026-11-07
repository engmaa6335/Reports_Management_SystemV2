// src/stores/plans-store.ts

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { SpecialistPlan, PlanReview, PlanEntity, PlanRegion, PlanFilters } from '../types/plans';

interface PlansState {
  plans: SpecialistPlan[];
  entities: PlanEntity[];
  entitiesMap: Record<string, PlanEntity>;
  regions: PlanRegion[];
  filters: PlanFilters;
  loading: boolean;
  loadingEntities: boolean;
  loadingRegions: boolean;
  saving: boolean;
  error: string | null;

  loadPlans: (scope: 'region' | 'edc', scopeId: string, periodStart: string, periodEnd: string, filters?: PlanFilters) => Promise<void>;
  loadEntities: (regionId?: string) => Promise<void>;
  loadEntitiesByIds: (ids: string[]) => Promise<void>;
  loadRegions: () => Promise<void>;
  setFilters: (filters: Partial<PlanFilters>) => void;
  upsertMyPlan: (payload: {
    periodStart: string;
    periodEnd: string;
    rlPlanned: number | null;
    tlsPlanned: number | null;
    entityIds: string[];
    notes?: string;
    submit: boolean;
  }) => Promise<string | null>;
  reviewPlan: (planId: string, action: 'approve' | 'request_revision' | 'comment', note?: string) => Promise<boolean>;
  deletePlan: (planId: string, reason?: string) => Promise<boolean>;
  getPlanReviews: (planId: string) => Promise<PlanReview[]>;
  clearError: () => void;
}

export const usePlansStore = create<PlansState>((set, get) => ({
  plans: [],
  entities: [],
  entitiesMap: {},
  regions: [],
  filters: {},
  loading: false,
  loadingEntities: false,
  loadingRegions: false,
  saving: false,
  error: null,

  loadPlans: async (scope, scopeId, periodStart, periodEnd, filters) => {
    set({ loading: true, error: null });
    try {
      const activeFilters = filters ?? get().filters;
      const { data, error } = await supabase.rpc('get_plans_for_period', {
        p_scope: scope,
        p_scope_id: scopeId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_search: activeFilters.search || null,
        p_region_filter: activeFilters.regionId || null,
        p_status_filter: activeFilters.status || null,
      });
      if (error) throw error;
      set({ plans: Array.isArray(data) ? data : [], loading: false });
    } catch (err: any) {
      set({ error: err.message || 'فشل تحميل الخطط', loading: false, plans: [] });
    }
  },

  loadEntities: async (regionId) => {
    set({ loadingEntities: true });
    try {
      const { data, error } = await supabase.rpc('get_region_entities_for_plans', {
        p_region_id: regionId || null,
      });
      if (error) throw error;
      const list = Array.isArray(data) ? data : [];
      const newMap = { ...get().entitiesMap };
      list.forEach((e: any) => { newMap[e.id] = e; });
      set({ entities: list, entitiesMap: newMap, loadingEntities: false });
    } catch (err: any) {
      set({ entities: [], loadingEntities: false });
    }
  },

  loadEntitiesByIds: async (ids) => {
    if (!ids || ids.length === 0) return;
    const existing = get().entitiesMap;
    const missing = ids.filter((id) => !existing[id]);
    if (missing.length === 0) return;
    try {
      const { data, error } = await supabase.rpc('get_entities_by_ids', { p_ids: missing });
      if (error) throw error;
      const list = Array.isArray(data) ? data : [];
      const newMap = { ...existing };
      list.forEach((e: any) => { newMap[e.id] = e; });
      set({ entitiesMap: newMap });
    } catch (err) {
      console.error('Failed to load entities by ids:', err);
    }
  },

  loadRegions: async () => {
    if (get().regions.length > 0) return;
    set({ loadingRegions: true });
    try {
      const { data, error } = await supabase.rpc('get_available_regions');
      if (error) throw error;
      set({ regions: Array.isArray(data) ? data : [], loadingRegions: false });
    } catch (err: any) {
      set({ regions: [], loadingRegions: false });
    }
  },

  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

  upsertMyPlan: async (payload) => {
    set({ saving: true, error: null });
    try {
      const { data, error } = await supabase.rpc('upsert_my_plan', {
        p_period_start: payload.periodStart,
        p_period_end: payload.periodEnd,
        p_rl_planned: payload.rlPlanned === null ? 0 : payload.rlPlanned, // ⭐ إرسال 0 إذا كان null لتجنب خطأ SQL
        p_tls_planned: payload.tlsPlanned === null ? 0 : payload.tlsPlanned,
        p_entity_ids: payload.entityIds,
        p_notes: payload.notes ?? null,
        p_submit: payload.submit,
      });
      if (error) throw error;
      set({ saving: false });
      return data as string;
    } catch (err: any) {
      set({ error: err.message || 'فشل حفظ الخطة', saving: false });
      return null;
    }
  },

  reviewPlan: async (planId, action, note) => {
    set({ saving: true, error: null });
    try {
      const { error } = await supabase.rpc('review_plan', {
        p_plan_id: planId, p_action: action, p_note: note ?? null,
      });
      if (error) throw error;
      set({ saving: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'فشل حفظ المراجعة', saving: false });
      return false;
    }
  },

  deletePlan: async (planId, reason) => {
    set({ saving: true, error: null });
    try {
      const { error } = await supabase.rpc('delete_specialist_plan', {
        p_plan_id: planId, p_reason: reason ?? null,
      });
      if (error) throw error;
      set({ saving: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'فشل حذف الخطة', saving: false });
      return false;
    }
  },

  getPlanReviews: async (planId) => {
    try {
      const { data, error } = await supabase.rpc('get_plan_reviews', { p_plan_id: planId });
      if (error) throw error;
      return (data as PlanReview[]) || [];
    } catch {
      return [];
    }
  },

  clearError: () => set({ error: null }),
}));