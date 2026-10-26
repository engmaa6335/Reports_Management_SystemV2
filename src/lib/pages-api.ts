// ═══════════════════════════════════════════════════════════
// Pages API — dynamic page access
// ═══════════════════════════════════════════════════════════

import { supabase } from './supabase';
import type {
  Page,
  UserAccessiblePage,
  PageModule,
  PageAction,
} from '../types/pages';

// ═══════════════════════════════════════════════════════════
// Get user accessible pages (uses RPC)
// ═══════════════════════════════════════════════════════════

export async function getUserAccessiblePages(): Promise<UserAccessiblePage[]> {
  const { data, error } = await supabase.rpc('get_user_accessible_pages');

  if (error) {
    console.error('❌ getUserAccessiblePages error:', error);
    throw new Error(error.message);
  }

  return (data || []) as UserAccessiblePage[];
}

// ═══════════════════════════════════════════════════════════
// List all pages (for admin / settings)
// ═══════════════════════════════════════════════════════════

export async function listAllPages(): Promise<Page[]> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as Page[];
}

// ═══════════════════════════════════════════════════════════
// Get single page by code
// ═══════════════════════════════════════════════════════════

export async function getPageByCode(code: string): Promise<Page | null> {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Page) || null;
}

// ═══════════════════════════════════════════════════════════
// Update page (admin only)
// ═══════════════════════════════════════════════════════════

export async function updatePage(
  code: string,
  updates: Partial<Pick<Page, 'name_ar' | 'name_en' | 'icon' | 'order_index' | 'is_active'>>
): Promise<void> {
  const { error } = await supabase
    .from('pages')
    .update(updates)
    .eq('code', code);

  if (error) throw new Error(error.message);
}

// ═══════════════════════════════════════════════════════════
// Check page access for a specific action
// ═══════════════════════════════════════════════════════════

export async function checkPageAccess(
  pageCode: string,
  action: PageAction = 'view'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_user_has_permission', {
    perm_code: `${pageCode}.${action}`,
  });

  if (error) {
    console.error('❌ checkPageAccess error:', error);
    return false;
  }

  return !!data;
}

// ═══════════════════════════════════════════════════════════
// Group pages by module
// ═══════════════════════════════════════════════════════════

export function groupPagesByModule(
  pages: UserAccessiblePage[]
): Map<PageModule, UserAccessiblePage[]> {
  const grouped = new Map<PageModule, UserAccessiblePage[]>();

  for (const page of pages) {
    const list = grouped.get(page.module) || [];
    list.push(page);
    grouped.set(page.module, list);
  }

  // Sort each group by order_index
  for (const [module, list] of grouped.entries()) {
    list.sort((a, b) => a.order_index - b.order_index);
    grouped.set(module, list);
  }

  return grouped;
}

// ═══════════════════════════════════════════════════════════
// Check if a page is accessible (with cached pages list)
// ═══════════════════════════════════════════════════════════

export function hasPagePermission(
  pages: UserAccessiblePage[],
  pageCode: string,
  action: PageAction = 'view'
): boolean {
  const page = pages.find((p) => p.page_code === pageCode);
  if (!page) return false;
  return page.permissions.includes(action);
}