// ═══════════════════════════════════════════════════════════
// ViewSummaryPage — View + Print + Edit + Status
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Printer,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Calendar,
  MapPin,
  User as UserIcon,
  Building2,
  TrendingUp,
  FileText,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useSummariesStore } from '../../stores/summaries-store';
import { usePermission } from '../../hooks/usePermission';
import { usePageAccess } from '../../hooks/usePageAccess';
import { Button, Card, Loading } from '../../components/ui';
import { DeleteSummaryModal } from '../../components/aggregate-summaries/DeleteSummaryModal';
import {
  pickLocalizedName,
  getPeriodTypeLabelI18n,
  getSummaryStatusLabel,
  getAggregateTypeLabel,
  formatDateI18n,
  formatDateTimeI18n,
  formatPeriodRangeI18n,
  formatNumberI18n,
} from '../../lib/i18n-helpers';
import { checkSourceReportsChanged } from '../../lib/summaries-api';
import type { SummaryPoint, SummaryStatus } from '../../types/summaries';

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function ViewSummaryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const language = i18n.language;

  const { allowed: canView, loading: checkingView } = usePermission(
    'aggregate_summaries.view'
  );
  const { allowed: canEdit } = usePageAccess('aggregate_summaries', 'edit');
  const { allowed: canExport } = usePageAccess('aggregate_summaries', 'export');
  const { allowed: canDelete } = usePageAccess('aggregate_summaries', 'delete');

  const {
    currentSummary,
    loadingDetail,
    saving,
    deleting,
    error,
    loadSummaryById,
    updateSummary,
    updateStatus,
    deleteSummary,
    clearCurrentSummary,
    clearError,
  } = useSummariesStore();

  // ─── Local state ───
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editStrengths, setEditStrengths] = useState<SummaryPoint[]>([]);
  const [editImprovements, setEditImprovements] = useState<SummaryPoint[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editClassification, setEditClassification] = useState('');
  const [sourceChanged, setSourceChanged] = useState(false);

  // ─── Load ───
  useEffect(() => {
    if (id) {
      loadSummaryById(id);
    }
    return () => {
      clearCurrentSummary();
      clearError();
    };
  }, [id, loadSummaryById, clearCurrentSummary, clearError]);

  // ─── Check if source reports changed ───
  useEffect(() => {
    if (currentSummary && id) {
      checkSourceReportsChanged(id).then(setSourceChanged);
    }
  }, [currentSummary, id]);

  // ─── Handlers ───
  const handlePrint = () => {
    window.print();
  };

  const handleOpenEdit = () => {
    if (!currentSummary) return;
    setEditTitle(currentSummary.title);
    setEditClassification(currentSummary.classification || '');
    setEditStrengths([...currentSummary.strengths]);
    setEditImprovements([...currentSummary.improvements]);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      await updateSummary(id, {
        title: editTitle.trim(),
        classification: editClassification.trim() || null,
        strengths: editStrengths,
        improvements: editImprovements,
      });
      setShowEditModal(false);
    } catch {
      // error already in store
    }
  };

  const handleUpdateStatus = async (newStatus: SummaryStatus) => {
    if (!id) return;
    await updateStatus(id, newStatus);
  };

  const handleDelete = async (reason: string) => {
    if (!id) return;
    await deleteSummary(id, reason);
    navigate('/aggregate-summaries');
  };

  const handleRemoveStrength = (idx: number) => {
    setEditStrengths((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveImprovement = (idx: number) => {
    setEditImprovements((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateStrengthText = (idx: number, text: string) => {
    setEditStrengths((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, text } : p))
    );
  };

  const handleUpdateImprovementText = (idx: number, text: string) => {
    setEditImprovements((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, text } : p))
    );
  };

  // ─── Render Guards ───
  if (checkingView) {
    return <Loading message={t('common.loading')} />;
  }

  if (!canView) {
    return (
      <Card padding="lg" className="text-center">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-text mb-2">
          {t('aggregate_summaries.no_permission_view')}
        </h2>
      </Card>
    );
  }

  if (loadingDetail) {
    return <Loading message={t('aggregate_summaries.loading')} />;
  }

  if (!currentSummary) {
    return (
      <Card padding="lg">
        <div className="py-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-xl font-bold text-text mb-2">
            {t('aggregate_summaries.not_found')}
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            {t('aggregate_summaries.not_found_desc')}
          </p>
          <Button variant="primary" onClick={() => navigate('/aggregate-summaries')}>
            {t('aggregate_summaries.back_to_list')}
          </Button>
        </div>
      </Card>
    );
  }

  const summary = currentSummary;

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  return (
    <>
      {/* ═══ Action Bar (not printed) ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/aggregate-summaries')}
            className="p-2 rounded-lg hover:bg-bg-secondary"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text">
              {t('aggregate_summaries.view_title')}
            </h1>
            <p className="text-xs text-text-secondary">
              {t('aggregate_summaries.view_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canExport && (
            <Button
              variant="ghost"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              {t('aggregate_summaries.print_pdf')}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              icon={<Edit2 className="w-4 h-4" />}
              onClick={handleOpenEdit}
            >
              {t('aggregate_summaries.edit')}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setShowDeleteModal(true)}
              className="text-danger hover:bg-danger/10"
            >
              {t('aggregate_summaries.delete')}
            </Button>
          )}
        </div>
      </div>

      {/* ═══ Error ═══ */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5 mb-4 print:hidden">
          <div className="text-danger text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </span>
            <button onClick={clearError} className="text-xs underline">
              ×
            </button>
          </div>
        </Card>
      )}

      {/* ═══ Source changed warning ═══ */}
      {sourceChanged && (
        <Card padding="md" className="border-warning/30 bg-warning/5 mb-4 print:hidden">
          <div className="text-warning text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{t('aggregate_summaries.source_changed_warning')}</span>
          </div>
        </Card>
      )}

      {/* ═══ MAIN CONTENT (printed) ═══ */}
      <div className="space-y-6 print:space-y-3">
        {/* Header */}
        <Card padding="lg" className="print:shadow-none print:border-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-text mb-2">
                {summary.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                  {summary.template
                    ? pickLocalizedName(summary.template, language)
                    : '—'}
                </span>
                {summary.classification && (
                  <span className="rounded-full bg-bg-secondary text-text-secondary px-3 py-1 text-xs">
                    {summary.classification}
                  </span>
                )}
                <StatusBadge status={summary.status} t={t} />
              </div>
            </div>
          </div>
        </Card>

        {/* Metadata grid */}
        <Card padding="lg" className="print:shadow-none print:border-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <MetaItem
              icon={<MapPin className="w-4 h-4" />}
              label={t('aggregate_summaries.meta_region')}
              value={
                summary.region
                  ? pickLocalizedName(summary.region, language)
                  : summary.entity
                  ? pickLocalizedName(summary.entity, language)
                  : '—'
              }
            />
            <MetaItem
              icon={<Calendar className="w-4 h-4" />}
              label={t('aggregate_summaries.meta_period')}
              value={formatPeriodRangeI18n(
                summary.period_start,
                summary.period_end,
                language
              )}
            />
            <MetaItem
              icon={<UserIcon className="w-4 h-4" />}
              label={t('aggregate_summaries.meta_creator')}
              value={summary.creator?.full_name || '—'}
            />
            <MetaItem
              icon={<Clock className="w-4 h-4" />}
              label={t('aggregate_summaries.meta_created_at')}
              value={formatDateTimeI18n(summary.created_at, language)}
            />
            {summary.editor && (
              <>
                <MetaItem
                  icon={<UserIcon className="w-4 h-4" />}
                  label={t('aggregate_summaries.meta_updated_by')}
                  value={summary.editor.full_name}
                />
                <MetaItem
                  icon={<Clock className="w-4 h-4" />}
                  label={t('aggregate_summaries.meta_updated_at')}
                  value={formatDateTimeI18n(summary.updated_at, language)}
                />
              </>
            )}
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3">
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label={t('aggregate_summaries.meta_total_visits')}
            value={formatNumberI18n(summary.total_visits, language)}
            color="primary"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label={t('aggregate_summaries.strengths_count')}
            value={formatNumberI18n(summary.strengths.length, language)}
            color="success"
          />
          <StatCard
            icon={<AlertCircle className="w-5 h-5" />}
            label={t('aggregate_summaries.improvements_count')}
            value={formatNumberI18n(summary.improvements.length, language)}
            color="warning"
          />
        </div>

        {/* Strengths section */}
        <Card padding="lg" className="print:shadow-none print:border-0">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-text border-r-4 border-success pr-3">
            <CheckCircle2 className="w-5 h-5 text-success" />
            {t('aggregate_summaries.strengths_section')}
            <span className="text-sm text-text-muted">
              ({summary.strengths.length})
            </span>
          </h3>

          {summary.strengths.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">
              {t('aggregate_summaries.no_strengths')}
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.strengths.map((point, idx) => (
                <PointItem
                  key={idx}
                  index={idx}
                  point={point}
                  color="success"
                  language={language}
                  mergedLabel={`${point.merged_from.length} نسخة مدموجة`}
                  sourcesLabel={`${point.source_report_ids.length} تقرير`}
                />
              ))}
            </ul>
          )}
        </Card>

        {/* Improvements section */}
        <Card padding="lg" className="print:shadow-none print:border-0">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-text border-r-4 border-warning pr-3">
            <AlertCircle className="w-5 h-5 text-warning" />
            {t('aggregate_summaries.improvements_section')}
            <span className="text-sm text-text-muted">
              ({summary.improvements.length})
            </span>
          </h3>

          {summary.improvements.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">
              {t('aggregate_summaries.no_improvements')}
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.improvements.map((point, idx) => (
                <PointItem
                  key={idx}
                  index={idx}
                  point={point}
                  color="warning"
                  language={language}
                  mergedLabel={`${point.merged_from.length} نسخة مدموجة`}
                  sourcesLabel={`${point.source_report_ids.length} تقرير`}
                />
              ))}
            </ul>
          )}
        </Card>

        {/* Status transition controls (not printed) */}
        {canEdit && (
          <Card padding="md" className="print:hidden">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-medium text-text">
                {t('aggregate_summaries.meta_status')}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['draft', 'review', 'approved', 'archived'] as SummaryStatus[]).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(s)}
                      disabled={saving || summary.status === s}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        summary.status === s
                          ? 'bg-primary text-white'
                          : 'bg-bg-secondary text-text-secondary hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {getSummaryStatusLabel(t, s)}
                    </button>
                  )
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ═══ Edit Modal ═══ */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <Card padding="lg" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text">
                {t('aggregate_summaries.edit')}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 hover:bg-bg-secondary rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  {t('aggregate_summaries.title_label')}
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text"
                />
              </div>

              {/* Classification */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  {t('aggregate_summaries.classification_label')}
                </label>
                <input
                  type="text"
                  value={editClassification}
                  onChange={(e) => setEditClassification(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text"
                />
              </div>

              {/* Strengths */}
              <div>
                <h4 className="font-semibold text-sm text-success mb-2">
                  {t('aggregate_summaries.strengths_section')} ({editStrengths.length})
                </h4>
                <div className="space-y-2">
                  {editStrengths.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-lg border border-border bg-bg-secondary/30"
                    >
                      <span className="text-success font-bold flex-shrink-0 mt-1">
                        {idx + 1}.
                      </span>
                      <textarea
                        value={point.text}
                        onChange={(e) =>
                          handleUpdateStrengthText(idx, e.target.value)
                        }
                        rows={2}
                        className="flex-1 px-2 py-1 rounded border border-border bg-surface text-sm resize-none"
                      />
                      <button
                        onClick={() => handleRemoveStrength(idx)}
                        className="p-1 text-danger hover:bg-danger/10 rounded flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Improvements */}
              <div>
                <h4 className="font-semibold text-sm text-warning mb-2">
                  {t('aggregate_summaries.improvements_section')} ({editImprovements.length})
                </h4>
                <div className="space-y-2">
                  {editImprovements.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-lg border border-border bg-bg-secondary/30"
                    >
                      <span className="text-warning font-bold flex-shrink-0 mt-1">
                        {idx + 1}.
                      </span>
                      <textarea
                        value={point.text}
                        onChange={(e) =>
                          handleUpdateImprovementText(idx, e.target.value)
                        }
                        rows={2}
                        className="flex-1 px-2 py-1 rounded border border-border bg-surface text-sm resize-none"
                      />
                      <button
                        onClick={() => handleRemoveImprovement(idx)}
                        className="p-1 text-danger hover:bg-danger/10 rounded flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                icon={<Save className="w-4 h-4" />}
                onClick={handleSaveEdit}
                loading={saving}
              >
                {t('aggregate_summaries.save_changes')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ Delete Modal ═══ */}
      {showDeleteModal && (
        <DeleteSummaryModal
          open={true}
          summaryTitle={summary.title}
          summaryCreatorName={summary.creator?.full_name || '—'}
          totalVisits={summary.total_visits}
          isDeleting={deleting}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-text-muted mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-text-muted mb-0.5">{label}</div>
        <div className="text-text text-sm break-words">{value}</div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'primary' | 'success' | 'warning';
}) {
  const colors = {
    primary: { bg: 'bg-primary/5', text: 'text-primary', border: 'border-primary/20' },
    success: { bg: 'bg-success/5', text: 'text-success', border: 'border-success/20' },
    warning: { bg: 'bg-warning/5', text: 'text-warning', border: 'border-warning/20' },
  };
  const c = colors[color];

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-4 flex items-center gap-3`}>
      <div className={`flex-shrink-0 ${c.text}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
        <div className="text-xs text-text-muted mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function PointItem({
  index,
  point,
  color,
  language,
  mergedLabel,
  sourcesLabel,
}: {
  index: number;
  point: SummaryPoint;
  color: 'success' | 'warning';
  language: string;
  mergedLabel: string;
  sourcesLabel: string;
}) {
  const c =
    color === 'success'
      ? { border: 'border-success/20', bg: 'bg-success/5', text: 'text-success' }
      : { border: 'border-warning/20', bg: 'bg-warning/5', text: 'text-warning' };

  return (
    <li className={`p-3 rounded-lg border ${c.border} ${c.bg}`}>
      <div className="flex items-start gap-2">
        <span className={`${c.text} font-bold flex-shrink-0`}>
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text leading-relaxed">{point.text}</p>
          {point.merged_from.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-text-muted flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/50 px-2 py-0.5">
                🔗 {mergedLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/50 px-2 py-0.5">
                📊 {sourcesLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/50 px-2 py-0.5">
                ✓ {Math.round(point.confidence * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: SummaryStatus;
  t: any;
}) {
  const variants: Record<SummaryStatus, string> = {
    draft: 'bg-text-muted/10 text-text-muted',
    review: 'bg-info/10 text-info',
    approved: 'bg-success/10 text-success',
    archived: 'bg-bg-secondary text-text-muted',
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        variants[status] || 'bg-bg-secondary text-text-muted'
      }`}
    >
      {getSummaryStatusLabel(t, status)}
    </span>
  );
}

export default ViewSummaryPage;