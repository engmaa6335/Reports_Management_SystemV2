// src/stores/pages-store.ts
// ═══════════════════════════════════════════════════════════
// Pages Store — dynamic page registry + user access (entity-aware)
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import { getUserAccessiblePages } from '../lib/pages-api';
import type { UserAccessiblePage } from '../types/pages';
import { useEntityStore } from './entity-store';

interface PagesState {
  pages: UserAccessiblePage[];
  loading: boolean;
  initialized: boolean;
  error: string | null;
  currentEntityId: string | null;

  loadPages: (entityId?: string | null) => Promise<void>;
  refreshPages: (entityId?: string | null) => Promise<void>;
  clearPages: () => void;
  clearError: () => void;

  hasAccess: (pageCode: string, action?: string) => boolean;
  getPage: (pageCode: string) => UserAccessiblePage | undefined;
}

export const usePagesStore = create<PagesState>((set, get) => ({
  pages: [],
  loading: false,
  initialized: false,
  error: null,
  currentEntityId: null,

  // ═══════════════════════════════════════════
  // Load
  // ═══════════════════════════════════════════

  loadPages: async (entityId?: string | null) => {
    if (get().loading) return;

    // ⭐ احصل على activeEntity إذا لم يُمرَّر
    const targetEntityId =
      entityId !== undefined
        ? entityId
        : useEntityStore.getState().activeEntity?.entityId ?? null;

    set({ loading: true, error: null, currentEntityId: targetEntityId });

    try {
      console.log('🔍 [pages-store] loading for entity:', targetEntityId);
      const pages = await getUserAccessiblePages(targetEntityId);
      console.log('✅ [pages-store] loaded:', pages.map((p) => p.page_code));
      set({ pages, loading: false, initialized: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الصفحات';
      console.error('❌ [pages-store] error:', msg);
      set({ error: msg, loading: false, initialized: true });
    }
  },

  refreshPages: async (entityId?: string | null) => {
    const targetEntityId =
      entityId !== undefined
        ? entityId
        : useEntityStore.getState().activeEntity?.entityId ?? null;

    set({ loading: true, error: null, currentEntityId: targetEntityId });

    try {
      console.log('🔄 [pages-store] refreshing for entity:', targetEntityId);
      const pages = await getUserAccessiblePages(targetEntityId);
      console.log('✅ [pages-store] refreshed:', pages.map((p) => p.page_code));
      set({ pages, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث الصفحات';
      console.error('❌ [pages-store] refresh error:', msg);
      set({ error: msg, loading: false });
    }
  },

  clearPages: () => {
    set({
      pages: [],
      initialized: false,
      loading: false,
      error: null,
      currentEntityId: null,
    });
  },

  clearError: () => set({ error: null }),

  // ═══════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════

  hasAccess: (pageCode, action = 'view') => {
    const page = get().pages.find((p) => p.page_code === pageCode);
    if (!page) return false;
    return page.permissions.includes(action as any);
  },

  getPage: (pageCode) => {
    return get().pages.find((p) => p.page_code === pageCode);
  },
}));