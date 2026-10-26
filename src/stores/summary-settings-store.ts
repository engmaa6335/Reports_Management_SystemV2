// ═══════════════════════════════════════════════════════════
// Summary Settings Store
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import {
  getSummarySettings,
  updateSummarySettings,
  DEFAULT_SUMMARY_SETTINGS,
  type SummarySettings,
} from '../lib/summary-settings-api';

interface SummarySettingsState {
  settings: SummarySettings;
  loading: boolean;
  saving: boolean;
  initialized: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<SummarySettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  clearError: () => void;
}

export const useSummarySettingsStore = create<SummarySettingsState>((set, get) => ({
  settings: { ...DEFAULT_SUMMARY_SETTINGS },
  loading: false,
  saving: false,
  initialized: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getSummarySettings();
      set({ settings, loading: false, initialized: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الإعدادات';
      set({ error: msg, loading: false, initialized: true });
    }
  },

  updateSettings: async (updates) => {
    set({ saving: true, error: null });
    try {
      await updateSummarySettings(updates);
      set((state) => ({
        settings: { ...state.settings, ...updates },
        saving: false,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل حفظ الإعدادات';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  resetToDefaults: async () => {
    await get().updateSettings(DEFAULT_SUMMARY_SETTINGS);
  },

  clearError: () => set({ error: null }),
}));