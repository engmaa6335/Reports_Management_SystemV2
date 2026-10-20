import { supabase } from './supabase';

export interface ThemeColors { [cssVar: string]: string; }

export interface Theme {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  category: string | null;
  icon: string | null;
  colors: ThemeColors;
  shadow_intensity: 'none' | 'light' | 'medium' | 'heavy' | null;
  border_radius: 'none' | 'small' | 'medium' | 'large' | null;
  font_family: string | null;
  is_dark: boolean;
  preview_image_url: string | null;
  is_system: boolean;
  is_active: boolean;
  is_default: boolean;
  order_index: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ThemeInput = Omit<
  Theme,
  'id' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'
>;

export async function listActiveThemes(): Promise<Theme[]> {
  const { data, error } = await supabase
    .from('themes').select('*').eq('is_active', true)
    .order('order_index', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Theme[];
}

export async function listAllThemes(): Promise<Theme[]> {
  const { data, error } = await supabase
    .from('themes').select('*')
    .order('order_index', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Theme[];
}

export async function createTheme(input: ThemeInput, userId: string) {
  const { data, error } = await supabase.from('themes')
    .insert({ ...input, created_by: userId, updated_by: userId })
    .select('*').single();
  if (error) throw new Error(error.message);
  return data as Theme;
}

export async function updateTheme(id: string, patch: Partial<ThemeInput>, userId: string) {
  const { data, error } = await supabase.from('themes')
    .update({ ...patch, updated_by: userId }).eq('id', id)
    .select('*').single();
  if (error) throw new Error(error.message);
  return data as Theme;
}

export async function deleteThemeSafe(themeId: string) {
  const { data, error } = await supabase.rpc('delete_theme_safe', { p_theme_id: themeId });
  if (error) throw new Error(error.message);
  return data as { deleted_theme_code: string; reassigned_users: number; reassigned_to: string };
}

export async function saveUserTheme(userId: string, themeCode: string) {
  const { error } = await supabase.from('user_preferences').upsert(
    { user_id: userId, theme_code: themeCode, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(error.message);
}

export async function getUserThemeCode(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_preferences').select('theme_code')
    .eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.theme_code ?? null;
}

export async function resetUserTheme(userId: string) {
  const { error } = await supabase.rpc('reset_user_theme', { p_user_id: userId });
  if (error) throw new Error(error.message);
}

export async function bulkResetUserThemes(userIds: string[]) {
  const { data, error } = await supabase.rpc('bulk_reset_user_themes', { p_user_ids: userIds });
  if (error) throw new Error(error.message);
  return data as { updated: number; theme: string };
}