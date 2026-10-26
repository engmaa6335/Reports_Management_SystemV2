// ═══════════════════════════════════════════════════════════
// Summaries Types — aggregate report summaries
// ═══════════════════════════════════════════════════════════

import type { PeriodType } from './aggregates';

// ─── Status ───
export type SummaryStatus = 'draft' | 'review' | 'approved' | 'archived';

// ─── Summary Point (individual strength/improvement) ───
export interface SummaryPoint {
  text: string;
  source_report_ids: string[];
  merged_from: string[];
  confidence: number;
}

// ─── Template info (for selection) ───
export interface SummarizableTemplate {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  aggregate_type: string;
  source_template_ids: string[];
  calculations: {
    report_type?: 'RL' | 'TLS';
    entity_field?: 'school' | 'learning_center';
    entity_label?: string;
    layout?: string;
  } | null;
  category: {
    id: string;
    code: string;
    name_ar: string;
    name_en: string | null;
    icon: string | null;
    color: string | null;
  } | null;
}

// ─── Aggregate Summary (DB row) ───
export interface AggregateSummary {
  id: string;
  template_id: string | null;
  title: string;
  classification: string | null;
  region_id: string | null;
  entity_id: string | null;
  period_type: PeriodType | null;
  period_start: string | null;
  period_end: string | null;
  total_visits: number;
  source_aggregate_ids: string[];
  source_report_ids: string[];
  strengths: SummaryPoint[];
  improvements: SummaryPoint[];
  ai_provider: string;
  ai_raw_response: Record<string, unknown> | null;
  status: SummaryStatus;
  created_by: string | null;
  updated_by: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  deletion_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Aggregate Summary with relations ───
export interface AggregateSummaryWithRelations extends AggregateSummary {
  template: {
    id: string;
    code: string;
    name_ar: string;
    name_en: string | null;
    aggregate_type: string;
    calculations: Record<string, unknown> | null;
  } | null;
  entity: {
    id: string;
    name_ar: string;
    name_en: string | null;
  } | null;
  region: {
    id: string;
    name_ar: string;
    name_en: string | null;
  } | null;
  creator: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  editor: {
    id: string;
    full_name: string;
  } | null;
}

// ─── Create Summary Input ───
export interface CreateSummaryInput {
  template_id: string;
  title: string;
  classification: string | null;
  region_id: string | null;
  entity_id: string | null;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  source_aggregate_ids: string[];
}

// ─── Update Summary Input ───
export interface UpdateSummaryInput {
  title?: string;
  classification?: string | null;
  strengths?: SummaryPoint[];
  improvements?: SummaryPoint[];
  status?: SummaryStatus;
}

// ─── Filters ───
export interface SummaryFilters {
  search: string;
  templateId: string | null;
  periodType: PeriodType | null;
  classification: string | null;
  regionId: string | null;
  status: SummaryStatus | null;
}

// ─── Preview data (before generation) ───
export interface SummaryPreview {
  aggregate_ids: string[];
  report_ids: string[];
  total_visits: number;
  source_aggregate_count: number;
  source_report_count: number;
}

// ─── Generation options ───
export interface SummarizationOptions {
  similarity_threshold: number;     // 0-1, default 0.75
  min_point_length: number;         // default 10
  max_strengths: number;            // default 15
  max_improvements: number;         // default 15
  include_manual_activities: boolean;
}