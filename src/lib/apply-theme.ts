import type { Theme } from './themes-api';

const RADIUS: Record<string, string> = {
  none: '0px',
  small: '4px',
  medium: '8px',
  large: '16px',
};

const SHADOW: Record<string, string> = {
  none: 'none',
  light: '0 1px 2px rgba(0,0,0,0.05)',
  medium: '0 4px 6px rgba(0,0,0,0.08)',
  heavy: '0 10px 25px rgba(0,0,0,0.15)',
};

export function applyTheme(theme: Theme | null) {
  const root = document.documentElement;

  if (!theme) {
    Object.keys(root.style).forEach((k) => {
      if (k.startsWith('--color-') || k === '--font-family') {
        root.style.removeProperty(k);
      }
    });
    root.style.removeProperty('--radius-base');
    root.style.removeProperty('--shadow-base');
    root.removeAttribute('data-theme-dark');
    return;
  }

  // 1) الألوان
  Object.entries(theme.colors || {}).forEach(([key, value]) => {
    if (value) root.style.setProperty(key, value);
  });

  // 2) الحواف
  if (theme.border_radius) {
    root.style.setProperty(
      '--radius-base',
      RADIUS[theme.border_radius] ?? '8px'
    );
  }

  // 3) الظلال
  if (theme.shadow_intensity) {
    root.style.setProperty(
      '--shadow-base',
      SHADOW[theme.shadow_intensity] ?? SHADOW.medium
    );
  }

  // 4) الخط
  if (theme.font_family) {
    root.style.setProperty(
      '--font-family',
      `'${theme.font_family}', 'Cairo', 'Inter', system-ui, sans-serif`
    );
  } else {
    root.style.removeProperty('--font-family');
  }

  // 5) الوضع الداكن
  if (theme.is_dark) root.setAttribute('data-theme-dark', 'true');
  else root.removeAttribute('data-theme-dark');
}