// ═══════════════════════════════════════════════════════════
// Aggregates Types — EDC Platform
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// Column Definitions
// ═══════════════════════════════════════════════════════════

// ⭐ عمود في جدول الزيارات
export type AggregateColumnType =
  | 'auto'      // م (مسلسل تلقائي)
  | 'date'      // تاريخ
  | 'entity'    // اسم المدرسة/المركز
  | 'text'      // نص عادي
  | 'subject'   // مادة (ترجمة)
  | 'grade'     // صف (ترجمة)
  | 'textarea'; // نص طويل

export interface AggregateColumn {
  key: string;
  type: AggregateColumnType;
  label: string;
}

// ⭐ عمود في جدول الأنشطة الإشرافية
export type ManualSectionColumnType = 'date' | 'text';

export interface ManualSectionColumn {
  key: string;
  type: ManualSectionColumnType;
  label: string;
}

// ⭐ قسم الأنشطة الإشرافية (يدوي)
export interface ManualSection {
  title: string;
  columns: ManualSectionColumn[];
}

// ═══════════════════════════════════════════════════════════
// Aggregate Calculations (JSONB من aggregate_templates)
// ═══════════════════════════════════════════════════════════

export type AggregateLayout = 'specialist_visits_table';

export type ReportType = 'RL' | 'TLS';

export type EntityField = 'school' | 'learning_center';

export interface AggregateCalculations {
  layout: AggregateLayout;
  report_type: ReportType;
  entity_field: EntityField;
  entity_label: string;
  period_types: PeriodType[];
  columns: AggregateColumn[];
  manual_section?: ManualSection;
}

// ═══════════════════════════════════════════════════════════
// Aggregate Template
// ═══════════════════════════════════════════════════════════

export interface AggregateTemplate {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  aggregate_type: string;
  category_id: string | null;
  creator_role_id: string | null;
  source_template_ids: string[];
  calculations: AggregateCalculations;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

// ⭐ قالب تجميعي مع العلاقات
export interface AggregateTemplateWithRelations extends AggregateTemplate {
  category: {
    id: string;
    code: string;
    name_ar: string;
    icon: string | null;
    color: string | null;
  } | null;
  creator_role: {
    id: string;
    code: string;
    name_ar: string;
  } | null;
}

// ═══════════════════════════════════════════════════════════
// Period Types
// ═══════════════════════════════════════════════════════════

export type PeriodType = 'biweekly' | 'monthly' | 'custom';

export interface CalculatedPeriod {
  start: string;       // YYYY-MM-DD
  end: string;         // YYYY-MM-DD
  label: string;       // وصف نصي للفترة
  isComplete: boolean; // هل الفترة مكتملة؟
}

// ═══════════════════════════════════════════════════════════
// Visit Row (صف في جدول الزيارات)
// ═══════════════════════════════════════════════════════════

export interface VisitRow {
  index: number;         // المسلسل (1, 2, 3...)
  report_id: string;     // UUID التقرير الأصلي
  visit_date: string;    // تاريخ الزيارة (YYYY-MM-DD)
  entity_name: string;   // اسم المدرسة/المركز
  class_grade: string;   // الصف
  teacher_name: string;  // اسم المعلم
  subject: string;       // المادة
  strengths: string;     // أبرز نقاط القوة
  improvements: string;  // جوانب بحاجة لتحسين
}

// ═══════════════════════════════════════════════════════════
// Manual Activity Row (صف في جدول الأنشطة الإشرافية)
// ═══════════════════════════════════════════════════════════

export interface ManualActivityRow {
  id: string;           // UUID محلي
  date: string;         // YYYY-MM-DD
  activity: string;     // النشاط
  topic: string;        // الموضوع
  target_group: string; // الفئة المستهدفة
}

// ═══════════════════════════════════════════════════════════
// Aggregate Report (تقرير محفوظ)
// ═══════════════════════════════════════════════════════════

export type AggregateStatus = 'active' | 'archived';

// ⭐ بنية البيانات المحفوظة في aggregate_reports.data
export interface SpecialistReportData {
  // Metadata
  specialist_name: string;
  specialization: string;
  region_name: string;
  report_type: ReportType;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  period_label: string;

  // Visits Table
  total_visits: number;
  visits: VisitRow[];

  // Manual Activities
  manual_activities: ManualActivityRow[];
}

export interface AggregateReport {
  id: string;
  aggregate_template_id: string | null;
  aggregate_type: string;
  region_id: string | null;
  entity_id: string | null;
  period_type: PeriodType | null;
  period_start: string | null;
  period_end: string | null;
  source_count: number;
  data: SpecialistReportData | Record<string, unknown>;
  summary: Record<string, unknown>;
  charts: Record<string, unknown>;
  status: AggregateStatus;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ⭐ تقرير تجميعي مع العلاقات
export interface AggregateReportWithRelations extends AggregateReport {
  creator: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  entity: {
    id: string;
    name_ar: string;
  } | null;
  aggregate_template: {
    id: string;
    code: string;
    name_ar: string;
    aggregate_type: string;
    calculations: AggregateCalculations;
  } | null;
}

// ═══════════════════════════════════════════════════════════
// Create/Update Payloads
// ═══════════════════════════════════════════════════════════

export interface CreateSpecialistAggregateInput {
  aggregateTemplateId: string;
  entityId: string;
  regionId: string | null;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  visits: VisitRow[];
  manualActivities: ManualActivityRow[];
  metadata: {
    specialist_name: string;
    specialization: string;
    region_name: string;
    report_type: ReportType;
    period_label: string;
  };
}

export interface UpdateSpecialistAggregateInput {
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  visits: VisitRow[];
  manualActivities: ManualActivityRow[];
  metadata: {
    specialist_name: string;
    specialization: string;
    region_name: string;
    report_type: ReportType;
    period_label: string;
  };
}

// ═══════════════════════════════════════════════════════════
// Filters
// ═══════════════════════════════════════════════════════════

export interface AggregateFilters {
  search: string;
  reportType: ReportType | null;
  periodType: PeriodType | null;
  isActive: boolean | null;
}