// ═══════════════════════════════════════════════════════════
// i18n Helpers — Arabic/English dynamic translation
// ═══════════════════════════════════════════════════════════

import type { TFunction } from 'i18next';

// ─── Pick localized name from DB object ───
export function pickLocalizedName(
  item: { name_ar?: string | null; name_en?: string | null } | null | undefined,
  language: string
): string {
  if (!item) return '—';
  if (language === 'en' && item.name_en) return item.name_en;
  return item.name_ar || item.name_en || '—';
}

// ─── Period type label ───
export function getPeriodTypeLabelI18n(
  t: TFunction,
  periodType: string | null | undefined
): string {
  if (!periodType) return '—';
  const key = `aggregate_summaries.${periodType}`;
  const translated = t(key);
  return translated === key ? periodType : translated;
}

// ─── Summary status label ───
export function getSummaryStatusLabel(
  t: TFunction,
  status: string | null | undefined
): string {
  if (!status) return '—';
  const key = `aggregate_summaries.status_${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

// ─── Aggregate type label ───
export function getAggregateTypeLabel(
  t: TFunction,
  aggregateType: string | null | undefined
): string {
  if (!aggregateType) return '—';
  
  // Map known aggregate types to i18n keys
  const typeKeyMap: Record<string, string> = {
    specialist_rl: 'template_type_rl',
    specialist_tls: 'template_type_tls',
    region_summary_rl: 'template_type_region_summary',
    region_summary_tls: 'template_type_region_summary',
    qa_chief_rl: 'template_type_generic',
    qa_chief_tls: 'template_type_generic',
    qa_coordinator_rl: 'template_type_generic',
    qa_coordinator_tls: 'template_type_generic',
  };
  
  const key = typeKeyMap[aggregateType];
  if (key) {
    const fullKey = `aggregate_summaries.${key}`;
    const translated = t(fullKey);
    if (translated !== fullKey) return translated;
  }
  
  return aggregateType;
}

// ─── Format date ───
export function formatDateI18n(
  date: string | Date | null | undefined,
  language: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...options,
    });
  } catch {
    return String(date);
  }
}

// ─── Format date & time ───
export function formatDateTimeI18n(
  date: string | Date | null | undefined,
  language: string
): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(date);
  }
}

// ─── Format period range ───
export function formatPeriodRangeI18n(
  start: string | null,
  end: string | null,
  language: string
): string {
  if (!start && !end) return '—';
  if (!start) return `→ ${formatDateI18n(end, language)}`;
  if (!end) return `${formatDateI18n(start, language)} →`;
  return `${formatDateI18n(start, language)} → ${formatDateI18n(end, language)}`;
}

// ─── Format number with locale ───
export function formatNumberI18n(
  num: number | null | undefined,
  language: string
): string {
  if (num == null) return '—';
  try {
    return num.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');
  } catch {
    return String(num);
  }
}