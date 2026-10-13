import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckSquare,
  Square,
  FileText,
  Building2,
  User as UserIcon,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { useAggregatesStore } from '../../stores/aggregates-store';
import type {
  AvailableAggregateTemplate,
  AvailableReport,
} from '../../stores/aggregates-store';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';

// ================================================
// Helpers
// ================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

// ================================================
// Calculations
// ================================================

interface Calculations {
  count: number;
  avg_rating: number | null;
  distribution: Record<string, number>;
  notes: string[];
  recommendations: string[];
}

function calculateStats(reports: AvailableReport[]): Calculations {
  const ratings: number[] = [];
  const distribution: Record<string, number> = {};
  const notesSet = new Set<string>();
  const recsSet = new Set<string>();

  reports.forEach((report) => {
    // Rating
    const rating = report.data?.rating;
    if (typeof rating === 'number') {
      ratings.push(rating);
      const key = String(rating);
      distribution[key] = (distribution[key] || 0) + 1;
    }

    // Notes — بدون تكرار
    const notes = report.data?.notes;
    if (typeof notes === 'string' && notes.trim()) {
      notesSet.add(notes.trim());
    }

    // Recommendations — بدون تكرار
    const recs = report.data?.recommendations;
    if (typeof recs === 'string' && recs.trim()) {
      recsSet.add(recs.trim());
    }
  });

  const avg =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

  return {
    count: reports.length,
    avg_rating: avg,
    distribution,
    notes: Array.from(notesSet),
    recommendations: Array.from(recsSet),
  };
}

// ================================================
// Component
// ================================================

export function CreateAggregatePage() {
  const navigate = useNavigate();
  const { templateId: urlTemplateId } = useParams<{ templateId?: string }>();
  const { user } = useAuthStore();
  const { activeEntity } = useEntityStore();
  const {
    availableTemplates,
    availableReports,
    loading,
    saving,
    loadingReports,
    error,
    loadAvailableTemplates,
    loadAvailableReports,
    createAggregate,
    clearAvailableReports,
    clearAvailableTemplates,
  } = useAggregatesStore();

  // State
  const [step, setStep] = useState<'select' | 'fill'>('select');
  const [selectedTemplate, setSelectedTemplate] =
    useState<AvailableAggregateTemplate | null>(null);
  const [periodType, setPeriodType] = useState<
    'weekly' | 'biweekly' | 'monthly' | 'custom'
  >('weekly');
  const [periodStart, setPeriodStart] = useState(getWeekAgo());
  const [periodEnd, setPeriodEnd] = useState(getToday());
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(
    new Set()
  );

  // Load templates
  useEffect(() => {
    if (user && activeEntity) {
      loadAvailableTemplates(user.id, activeEntity.entityId);
    }

    return () => {
      clearAvailableTemplates();
      clearAvailableReports();
    };
  }, [
    user,
    activeEntity,
    loadAvailableTemplates,
    clearAvailableTemplates,
    clearAvailableReports,
  ]);

  // Auto-select template if URL has templateId
  useEffect(() => {
    if (urlTemplateId && availableTemplates.length > 0 && !selectedTemplate) {
      const t = availableTemplates.find((x) => x.id === urlTemplateId);
      if (t) {
        setSelectedTemplate(t);
        setStep('fill');
      }
    }
  }, [urlTemplateId, availableTemplates, selectedTemplate]);

  // Load available reports when template changes
  useEffect(() => {
    if (selectedTemplate && user && activeEntity && step === 'fill') {
      loadAvailableReports({
        sourceTemplateIds: selectedTemplate.source_template_ids,
        periodStart,
        periodEnd,
        userId: user.id,
        entityId: activeEntity.entityId,
        scope: 'all',
      });
    }
  }, [
    selectedTemplate,
    periodStart,
    periodEnd,
    user,
    activeEntity,
    step,
    loadAvailableReports,
  ]);

  // Handlers
  const handleSelectTemplate = (template: AvailableAggregateTemplate) => {
    setSelectedTemplate(template);
    setStep('fill');
    navigate(`/aggregates/new/${template.id}`, { replace: true });
  };

  const handleToggleReport = (reportId: string) => {
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedReportIds.size === availableReports.length) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(availableReports.map((r) => r.id)));
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !user || !activeEntity) return;

    if (selectedReportIds.size === 0) {
      alert('الرجاء اختيار تقرير واحد على الأقل');
      return;
    }

    if (!periodStart || !periodEnd) {
      alert('الرجاء تحديد الفترة الزمنية');
      return;
    }

    const selectedReports = availableReports.filter((r) =>
      selectedReportIds.has(r.id)
    );

    const stats = calculateStats(selectedReports);

    const chartData = Object.entries(stats.distribution)
      .map(([rating, count]) => ({
        rating: Number(rating),
        count,
      }))
      .sort((a, b) => a.rating - b.rating);

    try {
      const aggregateId = await createAggregate({
        aggregateTemplateId: selectedTemplate.id,
        aggregateType: selectedTemplate.aggregate_type,
        regionId: null,
        entityId: activeEntity.entityId,
        periodType,
        periodStart,
        periodEnd,
        sourceReportIds: Array.from(selectedReportIds),
        calculations: {
          count: stats.count,
          avg_rating: stats.avg_rating,
          distribution: stats.distribution,
          notes: stats.notes,
          recommendations: stats.recommendations,
        },
        summary: {
          count: stats.count,
          avg_rating: stats.avg_rating,
          total_sources: selectedReportIds.size,
          notes_count: stats.notes.length,
          recommendations_count: stats.recommendations.length,
        },
        charts: {
          rating_distribution: chartData,
        },
      });

      navigate(`/aggregates/${aggregateId}`, { replace: true });
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setSelectedReportIds(new Set());
    setStep('select');
    navigate('/aggregates/new', { replace: true });
  };

  // ================================================
  // Render — Loading
  // ================================================
  if (loading && step === 'select') {
    return <Loading message="جاري تحميل القوالب..." />;
  }

  // ================================================
  // Render — Step 1: Select Template
  // ================================================
  if (step === 'select') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/aggregates')}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              📊 إنشاء تقرير تجميعي
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              اختر نوع التجميع الذي تريد إنشاءه
            </p>
          </div>
        </div>

        {availableTemplates.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-xl font-bold text-text mb-2">
                لا توجد قوالب تجميعية متاحة
              </h2>
              <p className="text-text-secondary">
                تواصل مع الدعم الفني لمنحك صلاحية التجميع
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="text-right transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary rounded-xl"
              >
                <Card
                  padding="lg"
                  className="h-full hover:shadow-hard transition-shadow"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      backgroundColor: `${template.category?.color || '#2563eb'}15`,
                      color: template.category?.color || '#2563eb',
                    }}
                  >
                    <BarChart3 className="w-7 h-7" />
                  </div>

                  <h3 className="text-lg font-bold text-text mb-2">
                    {template.name_ar}
                  </h3>

                  {template.description && (
                    <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {template.category && (
                    <div className="mb-2">
                      <span
                        className="inline-block px-2 py-1 rounded-md text-xs font-medium"
                        style={{
                          backgroundColor: `${template.category.color}15`,
                          color: template.category.color || '#2563eb',
                        }}
                      >
                        {template.category.name_ar}
                      </span>
                    </div>
                  )}

                  {template.creator_role && (
                    <div className="text-xs text-text-muted">
                      يُنشأ بواسطة: {template.creator_role.name_ar}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 text-primary font-medium text-sm mt-4">
                    <span>اختيار</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ================================================
  // Render — Step 2: Fill
  // ================================================
  if (!selectedTemplate) {
    return <Loading message="جاري التحضير..." />;
  }

  const allSelected =
    selectedReportIds.size === availableReports.length &&
    availableReports.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              {selectedTemplate.name_ar}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              حدد الفترة والتقارير المصدر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/aggregates')}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSubmit}
            disabled={saving || selectedReportIds.size === 0}
            loading={saving}
          >
            ✅ إنشاء التقرير
          </Button>
        </div>
      </div>

      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      <Card padding="lg">
        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          📅 فترة التقرير
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              نوع الفترة
            </label>
            <select
              value={periodType}
              onChange={(e) =>
                setPeriodType(
                  e.target.value as
                    | 'weekly'
                    | 'biweekly'
                    | 'monthly'
                    | 'custom'
                )
              }
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="weekly">أسبوعي</option>
              <option value="biweekly">كل أسبوعين</option>
              <option value="monthly">شهري</option>
              <option value="custom">مخصص</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              من تاريخ
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <FileText className="w-5 h-5 text-info" />
            📄 التقارير المصدر
            <span className="text-sm font-normal text-text-muted">
              ({selectedReportIds.size} / {availableReports.length})
            </span>
          </h3>

          {availableReports.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          )}
        </div>

        {loadingReports ? (
          <div className="text-center py-8">
            <Loading message="جاري تحميل التقارير..." />
          </div>
        ) : availableReports.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-bg-secondary rounded-full mb-4">
              <FileText className="w-8 h-8 text-text-muted" />
            </div>
            <h4 className="text-lg font-semibold text-text mb-2">
              لا توجد تقارير متاحة
            </h4>
            <p className="text-text-secondary text-sm">
              لم يتم العثور على تقارير في هذه الفترة
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableReports.map((report) => {
              const isSelected = selectedReportIds.has(report.id);
              return (
                <button
                  key={report.id}
                  onClick={() => handleToggleReport(report.id)}
                  className={`
                    w-full text-right flex items-start gap-3 p-3 rounded-lg border transition-all
                    ${
                      isSelected
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-surface border-border hover:bg-bg-secondary'
                    }
                  `}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-text-muted" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text truncate">
                        {report.template?.name_ar || 'تقرير'}
                      </span>
                      {report.template?.category && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={{
                            backgroundColor: `${report.template.category.color}15`,
                            color:
                              report.template.category.color || '#2563eb',
                          }}
                        >
                          {report.template.category.name_ar}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {report.entity?.name_ar || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {report.creator?.full_name || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(report.period_start)} →{' '}
                        {formatDate(report.period_end)}
                      </span>
                    </div>

                    {typeof report.data?.rating === 'number' && (
                      <div className="mt-1 text-xs">
                        <span className="text-warning">
                          ⭐ {report.data.rating as number} / 5
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={() => navigate('/aggregates')}>
          إلغاء
        </Button>
        <Button
          variant="primary"
          size="lg"
          icon={<Save className="w-5 h-5" />}
          onClick={handleSubmit}
          disabled={saving || selectedReportIds.size === 0}
          loading={saving}
        >
          ✅ إنشاء التقرير التجميعي
        </Button>
      </div>
    </div>
  );
}