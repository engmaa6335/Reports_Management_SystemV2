// ═══════════════════════════════════════════════════════════
// Pages Store — dynamic page registry + user access
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import { getUserAccessiblePages } from '../lib/pages-api';
import type { UserAccessiblePage } from '../types/pages';

interface PagesState {
  // ─── Data ───
  pages: UserAccessiblePage[];

  // ─── State ───
  loading: boolean;
  initialized: boolean;
  error: string | null;

  // ─── Actions ───
  loadPages: () => Promise<void>;
  refreshPages: () => Promise<void>;
  clearPages: () => void;
  clearError: () => void;

  // ─── Helpers ───
  hasAccess: (pageCode: string, action?: string) => boolean;
  getPage: (pageCode: string) => UserAccessiblePage | undefined;
}

export const usePagesStore = create<PagesState>((set, get) => ({
  pages: [],
  loading: false,
  initialized: false,
  error: null,

  // ═══════════════════════════════════════════
  // Load
  // ═══════════════════════════════════════════

  loadPages: async () => {
    if (get().loading) return;

    set({ loading: true, error: null });
    try {
      const pages = await getUserAccessiblePages();
      set({ pages, loading: false, initialized: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الصفحات';
      set({ error: msg, loading: false, initialized: true });
    }
  },

  refreshPages: async () => {
    set({ loading: true, error: null });
    try {
      const pages = await getUserAccessiblePages();
      set({ pages, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث الصفحات';
      set({ error: msg, loading: false });
    }
  },

  clearPages: () => {
    set({ pages: [], initialized: false, loading: false, error: null });
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