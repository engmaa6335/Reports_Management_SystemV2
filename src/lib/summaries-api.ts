// ═══════════════════════════════════════════════════════════
// Summaries API — CRUD + Generation
// ═══════════════════════════════════════════════════════════

import { supabase } from './supabase';
import { summarize, previewSummary } from './summarization';
import type {
  AggregateSummary,
  AggregateSummaryWithRelations,
  SummarizableTemplate,
  CreateSummaryInput,
  UpdateSummaryInput,
  SummaryFilters,
  SummaryPreview,
  SummaryStatus,
  SummaryPoint,
  SummarizationOptions,
} from '../types/summaries';
import type { PeriodType } from '../types/aggregates';

// ═══════════════════════════════════════════════════════════
// Templates (Summarizable only)
// ═══════════════════════════════════════════════════════════

/**
 * List aggregate templates that are ready for summarization.
 * Only includes templates with:
 * - is_active = true
 * - calculations IS NOT NULL
 * - source_template_ids not empty
 *
 * Today: returns specialist_rl_agg + specialist_tls_agg
 * Tomorrow: any template with calculations defined
 */
export async function listSummarizableTemplates(): Promise<SummarizableTemplate[]> {
  const { data, error } = await supabase
    .from('aggregate_templates')
    .select(`
      id,
      code,
      name_ar,
      name_en,
      aggregate_type,
      source_template_ids,
      calculations,
      category:template_categories (
        id, code, name_ar, name_en, icon, color
      )
    `)
    .eq('is_active', true)
    .not('calculations', 'is', null)
    .not('source_template_ids', 'is', null);

  if (error) throw new Error(error.message);

  // ⭐ ترتيب مخصص: specialist → region_summary → qa_coordinator → qa_chief
  const PRIORITY: Record<string, number> = {
    specialist_rl: 1,
    specialist_tls: 2,
    region_summary_rl: 3,
    region_summary_tls: 4,
    qa_coordinator_rl: 5,
    qa_coordinator_tls: 6,
    qa_chief_rl: 7,
    qa_chief_tls: 8,
  };

  return (data || [])
    .filter((t: any) => {
      const calcs = t.calculations;
      return (
        calcs &&
        Array.isArray(t.source_template_ids) &&
        t.source_template_ids.length > 0
      );
    })
    .sort((a: any, b: any) => {
      const pa = PRIORITY[a.aggregate_type] ?? 99;
      const pb = PRIORITY[b.aggregate_type] ?? 99;
      if (pa !== pb) return pa - pb;
      // إذا نفس الأولوية → أبجدي
      return (a.name_ar || '').localeCompare(b.name_ar || '');
    })
    .map((t: any): SummarizableTemplate => ({
      id: t.id,
      code: t.code,
      name_ar: t.name_ar,
      name_en: t.name_en,
      aggregate_type: t.aggregate_type,
      source_template_ids: t.source_template_ids,
      calculations: t.calculations,
      category: Array.isArray(t.category)
        ? (t.category[0] ?? null)
        : (t.category ?? null),
    }));
}

// ═══════════════════════════════════════════════════════════
// Preview — find source aggregates & count visits
// ═══════════════════════════════════════════════════════════

/**
 * Preview what will be summarized:
 * - Find aggregate_reports matching template + period + entity scope
 * - Count distinct source report_ids
 * - Return IDs for later use
 */
export async function previewSummaryData(params: {
  template_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  region_id?: string | null;
  entity_id?: string | null;
}): Promise<SummaryPreview> {
  let query = supabase
    .from('aggregate_reports')
    .select('id')
    .eq('aggregate_template_id', params.template_id)
    .eq('is_deleted', false)
    .gte('period_start', params.period_start)
    .lte('period_end', params.period_end);

  if (params.entity_id) {
    query = query.eq('entity_id', params.entity_id);
  } else if (params.region_id) {
    query = query.eq('region_id', params.region_id);
  }

  const { data: aggregates, error: aggError } = await query;

  if (aggError) throw new Error(aggError.message);

  const aggregateIds = (aggregates || []).map((a: any) => a.id);

  if (aggregateIds.length === 0) {
    return {
      aggregate_ids: [],
      report_ids: [],
      total_visits: 0,
      source_aggregate_count: 0,
      source_report_count: 0,
    };
  }

  // Get distinct source report IDs (deduplication)
  const { data: sources, error: srcError } = await supabase
    .from('aggregate_report_sources')
    .select('report_id')
    .in('aggregate_report_id', aggregateIds);

  if (srcError) throw new Error(srcError.message);

  const distinctReportIds = Array.from(
    new Set((sources || []).map((s: any) => s.report_id).filter(Boolean))
  );

  return {
    aggregate_ids: aggregateIds,
    report_ids: distinctReportIds,
    total_visits: distinctReportIds.length,
    source_aggregate_count: aggregateIds.length,
    source_report_count: distinctReportIds.length,
  };
}

// ═══════════════════════════════════════════════════════════
// Fetch raw data for summarization
// ═══════════════════════════════════════════════════════════

interface RawReportData {
  report_id: string;
  strengths_text: string | null;
  improvements_text: string | null;
}

/**
 * Fetch raw strengths/improvements text from source reports.
 */
export async function fetchSourceReportData(
  reportIds: string[]
): Promise<RawReportData[]> {
  if (reportIds.length === 0) return [];

  const { data, error } = await supabase
    .from('reports')
    .select('id, data')
    .in('id', reportIds)
    .eq('is_deleted', false);

  if (error) throw new Error(error.message);

  return (data || []).map((r: any) => ({
    report_id: r.id,
    strengths_text:
      typeof r.data?.strengths === 'string' ? r.data.strengths : null,
    improvements_text:
      typeof r.data?.improvements === 'string' ? r.data.improvements : null,
  }));
}

// ═══════════════════════════════════════════════════════════
// Generate preview (run algorithm without saving)
// ═══════════════════════════════════════════════════════════

/**
 * Run the summarization algorithm on real data (no persistence).
 * Returns the generated points for preview.
 */
export async function generateSummaryPreview(params: {
  report_ids: string[];
  options?: Partial<SummarizationOptions>;
}): Promise<{
  strengths: SummaryPoint[];
  improvements: SummaryPoint[];
  stats: {
    total_reports: number;
    strengths_raw_count: number;
    improvements_raw_count: number;
    strengths_final_count: number;
    improvements_final_count: number;
    strengths_merged_count: number;
    improvements_merged_count: number;
  };
}> {
  const rawData = await fetchSourceReportData(params.report_ids);

  if (rawData.length === 0) {
    return {
      strengths: [],
      improvements: [],
      stats: {
        total_reports: 0,
        strengths_raw_count: 0,
        improvements_raw_count: 0,
        strengths_final_count: 0,
        improvements_final_count: 0,
        strengths_merged_count: 0,
        improvements_merged_count: 0,
      },
    };
  }

  return summarize(rawData, params.options);
}

// ═══════════════════════════════════════════════════════════
// Create Summary
// ═══════════════════════════════════════════════════════════

export async function createSummary(
  input: CreateSummaryInput
): Promise<{ id: string }> {
  // 1. Preview to get source IDs
  const preview = await previewSummaryData({
    template_id: input.template_id,
    period_type: input.period_type,
    period_start: input.period_start,
    period_end: input.period_end,
    region_id: input.region_id,
    entity_id: input.entity_id,
  });

  if (preview.total_visits === 0) {
    throw new Error('لا توجد زيارات في الفترة المحددة');
  }

  // 2. Generate points from real data
  const generated = await generateSummaryPreview({
    report_ids: preview.report_ids,
  });

  // 3. Get current user ID
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('يجب تسجيل الدخول');

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single();

  if (!userData) throw new Error('المستخدم غير موجود');

  // 4. Insert summary
  const { data: summary, error } = await supabase
    .from('aggregate_summaries')
    .insert({
      template_id: input.template_id,
      title: input.title,
      classification: input.classification,
      region_id: input.region_id,
      entity_id: input.entity_id,
      period_type: input.period_type,
      period_start: input.period_start,
      period_end: input.period_end,
      total_visits: preview.total_visits,
      source_aggregate_ids: preview.aggregate_ids,
      source_report_ids: preview.report_ids,
      strengths: generated.strengths,
      improvements: generated.improvements,
      ai_provider: 'local',
      ai_raw_response: { stats: generated.stats },
      status: 'draft',
      created_by: userData.id,
      updated_by: userData.id,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  return { id: summary.id };
}

// ═══════════════════════════════════════════════════════════
// Get Summary by ID
// ═══════════════════════════════════════════════════════════

export async function getSummaryById(
  id: string
): Promise<AggregateSummaryWithRelations | null> {
  const { data, error } = await supabase
    .from('aggregate_summaries')
    .select(`
      *,
      template:aggregate_templates (
        id, code, name_ar, name_en, aggregate_type, calculations
      ),
      entity:entities ( id, name_ar, name_en ),
      region:regions ( id, name_ar, name_en ),
      creator:users!aggregate_summaries_created_by_fkey ( id, full_name, email ),
      editor:users!aggregate_summaries_updated_by_fkey ( id, full_name )
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return data as unknown as AggregateSummaryWithRelations;
}

// ═══════════════════════════════════════════════════════════
// List Summaries
// ═══════════════════════════════════════════════════════════

export async function listSummaries(
  filters: Partial<SummaryFilters> = {}
): Promise<AggregateSummaryWithRelations[]> {
  let query = supabase
    .from('aggregate_summaries')
    .select(`
      *,
      template:aggregate_templates (
        id, code, name_ar, name_en, aggregate_type, calculations
      ),
      entity:entities ( id, name_ar, name_en ),
      region:regions ( id, name_ar, name_en ),
      creator:users!aggregate_summaries_created_by_fkey ( id, full_name, email ),
      editor:users!aggregate_summaries_updated_by_fkey ( id, full_name )
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.templateId) {
    query = query.eq('template_id', filters.templateId);
  }

  if (filters.periodType) {
    query = query.eq('period_type', filters.periodType);
  }

  if (filters.classification) {
    query = query.eq('classification', filters.classification);
  }

  if (filters.regionId) {
    query = query.eq('region_id', filters.regionId);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  let results = (data || []) as unknown as AggregateSummaryWithRelations[];

  // Client-side search filter
  if (filters.search?.trim()) {
    const s = filters.search.toLowerCase().trim();
    results = results.filter((r) => {
      const title = r.title?.toLowerCase() || '';
      const template = r.template?.name_ar?.toLowerCase() || '';
      const classification = r.classification?.toLowerCase() || '';
      return (
        title.includes(s) ||
        template.includes(s) ||
        classification.includes(s)
      );
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════
// Update Summary
// ═══════════════════════════════════════════════════════════

export async function updateSummary(
  id: string,
  input: UpdateSummaryInput
): Promise<void> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('يجب تسجيل الدخول');

  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single();

  if (!userData) throw new Error('المستخدم غير موجود');

  const payload: Record<string, unknown> = {
    updated_by: userData.id,
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) payload.title = input.title;
  if (input.classification !== undefined) payload.classification = input.classification;
  if (input.strengths !== undefined) payload.strengths = input.strengths;
  if (input.improvements !== undefined) payload.improvements = input.improvements;
  if (input.status !== undefined) payload.status = input.status;

  const { error } = await supabase
    .from('aggregate_summaries')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ═══════════════════════════════════════════════════════════
// Delete Summary (hard delete — tech_support only via RLS)
// ═══════════════════════════════════════════════════════════

export async function deleteSummary(
  id: string,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 5) {
    throw new Error('سبب الحذف مطلوب (5 أحرف على الأقل)');
  }

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('يجب تسجيل الدخول');

  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('auth_user_id', authUser.id)
    .single();

  if (!userData) throw new Error('المستخدم غير موجود');

  // Log to audit
  await supabase.from('audit_log').insert({
    user_id: userData.id,
    action: 'hard_delete',
    resource_type: 'aggregate_summary',
    resource_id: id,
    changes: { reason: reason.trim() },
    metadata: {
      deleted_by_name: userData.full_name,
      deleted_by_email: userData.email,
    },
  });

  // Hard delete (RLS ensures only tech_support can do this)
  const { error } = await supabase
    .from('aggregate_summaries')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ═══════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════

/**
 * Check if source reports have been modified after summary creation.
 * Returns true if any source report's updated_at > summary.created_at.
 */
export async function checkSourceReportsChanged(
  summaryId: string
): Promise<boolean> {
  const { data: summary } = await supabase
    .from('aggregate_summaries')
    .select('created_at, source_report_ids')
    .eq('id', summaryId)
    .maybeSingle();

  if (!summary || !summary.source_report_ids?.length) return false;

  const { data: reports } = await supabase
    .from('reports')
    .select('id, updated_at')
    .in('id', summary.source_report_ids)
    .gt('updated_at', summary.created_at);

  return (reports || []).length > 0;
}

/**
 * Preview raw counts without generating (for UI hint).
 */
export async function previewRawCounts(
  reportIds: string[]
): Promise<{
  total_reports: number;
  estimated_strengths_raw: number;
  estimated_improvements_raw: number;
  estimated_strengths_final: number;
  estimated_improvements_final: number;
}> {
  const rawData = await fetchSourceReportData(reportIds);
  return previewSummary(rawData);
}