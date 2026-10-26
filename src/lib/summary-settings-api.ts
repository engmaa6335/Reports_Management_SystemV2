// ═══════════════════════════════════════════════════════════
// Summary Settings API
// ═══════════════════════════════════════════════════════════

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface SummarySettings {
  enabled: boolean;
  summary_provider: string;
  similarity_threshold: number;
  min_point_length: number;
  max_strengths: number;
  max_improvements: number;
  include_manual_activities: boolean;
  deduplication: boolean;
  pdf_footer_text: string;
  pdf_show_signatures: boolean;
}

export interface SummarySettingRow {
  id: string;
  key: string;
  value: unknown;
  value_type: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// Defaults
// ═══════════════════════════════════════════════════════════

export const DEFAULT_SUMMARY_SETTINGS: SummarySettings = {
  enabled: true,
  summary_provider: 'local',
  similarity_threshold: 0.72,
  min_point_length: 8,
  max_strengths: 15,
  max_improvements: 15,
  include_manual_activities: false,
  deduplication: true,
  pdf_footer_text: '© 2026 EDC Platform — جميع الحقوق محفوظة',
  pdf_show_signatures: true,
};

// ═══════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════

/**
 * Fetch all settings as a single object.
 * Falls back to defaults for missing keys.
 */
export async function getSummarySettings(): Promise<SummarySettings> {
  const { data, error } = await supabase
    .from('summary_settings')
    .select('key, value');

  if (error) throw new Error(error.message);

  const result: SummarySettings = { ...DEFAULT_SUMMARY_SETTINGS };

  for (const row of data || []) {
    if (row.key in result) {
      (result as any)[row.key] = row.value;
    }
  }

  return result;
}

/**
 * Fetch raw rows (for admin edit UI).
 */
export async function listSummarySettingsRows(): Promise<SummarySettingRow[]> {
  const { data, error } = await supabase
    .from('summary_settings')
    .select('*')
    .order('key');

  if (error) throw new Error(error.message);
  return (data || []) as SummarySettingRow[];
}

/**
 * Update multiple settings at once.
 * Only tech_support can update (RLS).
 */
export async function updateSummarySettings(
  updates: Partial<SummarySettings>
): Promise<void> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('يجب تسجيل الدخول');

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single();

  if (!userData) throw new Error('المستخدم غير موجود');

  // Build upsert array
  const upserts = Object.entries(updates)
    .filter(([_, v]) => v !== undefined)
    .map(([key, value]) => ({
      key,
      value: value as any,
      value_type: typeof value === 'boolean' ? 'boolean'
        : typeof value === 'number' ? 'number'
        : 'string',
      updated_by: userData.id,
      updated_at: new Date().toISOString(),
    }));

  if (upserts.length === 0) return;

  const { error } = await supabase
    .from('summary_settings')
    .upsert(upserts, { onConflict: 'key' });

  if (error) throw new Error(error.message);
}