import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
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
import type { AvailableReport } from '../../stores/aggregates-store';
import { supabase } from '../../lib/supabase';
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
    const rating = report.data?.rating;
    if (typeof rating === 'number') {
      ratings.push(rating);
      const key = String(rating);
      distribution[key] = (distribution[key] || 0) + 1;
    }

    const notes = report.data?.notes;
    if (typeof notes === 'string' && notes.trim()) {
      notesSet.add(notes.trim());
    }

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

export function EditAggregatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { activeEntity } = useEntityStore();
  const {
    currentAggregate,
    availableReports,
    loading,
    saving,
    loadingReports,
    error,
    loadAggregateById,
    loadAvailableReports,
    updateAggregate,
    clearAvailableReports,
    clearCurrentAggregate,
  } = useAggregatesStore();

  const [periodType, setPeriodType] = useState<
    'weekly' | 'biweekly' | 'monthly' | 'custom'
  >('weekly');
  const [periodStart, setPeriodStart] = useState(getWeekAgo());
  const [periodEnd, setPeriodEnd] = useState(getToday());
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(
    new Set()
  );
  const [initialized, setInitialized] = useState(false);

  // Load Aggregate
  useEffect(() => {
    if (id) {
      loadAggregateById(id);
    }

    return () => {
      clearCurrentAggregate();
      clearAvailableReports();
    };
  }, [id, loadAggregateById, clearCurrentAggregate, clearAvailableReports]);

  // Initialize Form Data
  useEffect(() => {
    if (currentAggregate && !initialized) {
      setPeriodType(
        (currentAggregate.period_type as
          | 'weekly'
          | 'biweekly'
          | 'monthly'
          | 'custom') || 'weekly'
      );
      setPeriodStart(currentAggregate.period_start || getWeekAgo());
      setPeriodEnd(currentAggregate.period_end || getToday());
      setInitialized(true);
    }
  }, [currentAggregate, initialized]);

  // Load Sources (from aggregate_template)
  useEffect(() => {
    if (
      currentAggregate &&
      user &&
      activeEntity &&
      initialized &&
      currentAggregate.aggregate_template_id
    ) {
      const loadSources = async () => {
        const { data: templateData } = await supabase
          .from('aggregate_templates')
          .select('source_template_ids')
          .eq('id', currentAggregate.aggregate_template_id || '')
          .single();

        if (templateData?.source_template_ids) {
          await loadAvailableReports({
            sourceTemplateIds: templateData.source_template_ids,
            periodStart,
            periodEnd,
            userId: user.id,
            entityId: activeEntity.entityId,
            scope: 'all',
          });
        }
      };

      loadSources();
    }
  }, [
    currentAggregate,
    user,
    activeEntity,
    initialized,
    periodStart,
    periodEnd,
    loadAvailableReports,
  ]);

  // Load Current Sources
  useEffect(() => {
    if (id && initialized) {
      const loadCurrentSources = async () => {
        const { data } = await supabase
          .from('aggregate_report_sources')
          .select('report_id')
          .eq('aggregate_report_id', id);

        if (data) {
          setSelectedReportIds(new Set(data.map((s) => s.report_id)));
        }
      };

      loadCurrentSources();
    }
  }, [id, initialized]);

  // Handlers
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
    if (!currentAggregate || !id) return;

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
      await updateAggregate(id, {
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

      navigate(`/aggregates/${id}`, { replace: true });
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  const handleCancel = () => {
    navigate(`/aggregates/${id}`);
  };

  // Render — Loading
  if (loading || !initialized) {
    return <Loading message="جاري تحميل التقرير..." />;
  }

  // Render — Error
  if (error || !currentAggregate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/aggregates')}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-2xl font-bold text-text">تعديل التقرير</h1>
        </div>

        <Card padding="lg" className="border-danger bg-danger/5">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-danger mb-2">
              لم يتم العثور على التقرير
            </h2>
            <p className="text-text-secondary mb-6">
              {error || 'التقرير غير موجود'}
            </p>
            <Button variant="primary" onClick={() => navigate('/aggregates')}>
              العودة إلى التجميعية
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const allSelected =
    selectedReportIds.size === availableReports.length &&
    availableReports.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              ✏️ تعديل التقرير التجميعي
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {currentAggregate.aggregate_template?.name_ar || 'تقرير'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSubmit}
            disabled={saving || selectedReportIds.size === 0}
            loading={saving}
          >
            💾 حفظ التعديلات
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Period */}
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

      {/* Sources */}
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

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={handleCancel}>
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
          💾 حفظ التعديلات
        </Button>
      </div>
    </div>
  );
}