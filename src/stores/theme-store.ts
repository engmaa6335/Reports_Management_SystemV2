import { create } from 'zustand';
import {
  listActiveThemes,
  getUserThemeCode,
  saveUserTheme,
  resetUserTheme,
  type Theme,
} from '../lib/themes-api';
import { applyTheme } from '../lib/apply-theme';

interface ThemeState {
  themes: Theme[];
  currentCode: string | null;
  loading: boolean;
  init: (userId: string) => Promise<void>;
  selectTheme: (userId: string, code: string) => Promise<void>;
  resetToDefault: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themes: [],
  currentCode: null,
  loading: false,

  init: async (userId) => {
    set({ loading: true });
    try {
      const themes = await listActiveThemes();
      const userCode = await getUserThemeCode(userId);
      const chosen =
        themes.find((t) => t.code === userCode) ??
        themes.find((t) => t.code === 'light') ??
        themes.find((t) => t.is_default) ??
        themes[0] ??
        null;

      applyTheme(chosen);
      set({ themes, currentCode: chosen?.code ?? 'light' });
    } finally {
      set({ loading: false });
    }
  },

  selectTheme: async (userId, code) => {
    const theme = get().themes.find((t) => t.code === code) ?? null;
    if (!theme) return;
    applyTheme(theme);
    set({ currentCode: code });
    await saveUserTheme(userId, code);
  },

  resetToDefault: async (userId) => {
    await resetUserTheme(userId);
    const light = get().themes.find((t) => t.code === 'light');
    if (light) {
      applyTheme(light);
      set({ currentCode: 'light' });
    }
  },

  refresh: async () => {
    const themes = await listActiveThemes();
    set({ themes });
  },
}));