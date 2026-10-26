// ═══════════════════════════════════════════════════════════
// usePageAccess — hook للتحقق من صلاحية صفحة
// ═══════════════════════════════════════════════════════════

import { usePagesStore } from '../stores/pages-store';
import type { PageAction } from '../types/pages';

/**
 * Returns whether the current user has access to a page + action.
 * Dashboard is always accessible (hardcoded exception).
 */
export function usePageAccess(pageCode: string, action: PageAction = 'view') {
  const { pages, loading, initialized, hasAccess } = usePagesStore();

  // Dashboard is always accessible
  if (pageCode === 'dashboard') {
    return { allowed: true, loading: false };
  }

  const allowed = hasAccess(pageCode, action);

  return {
    allowed,
    loading: loading || !initialized,
  };
}

/**
 * Returns the full list of accessible pages grouped by module.
 */
export function useAccessiblePages() {
  const { pages, loading, initialized } = usePagesStore();

  const mainPages = pages.filter((p) => p.module === 'main');
  const settingsPages = pages.filter((p) => p.module === 'settings');

  return {
    all: pages,
    main: mainPages,
    settings: settingsPages,
    loading: loading || !initialized,
  };
}