// ═══════════════════════════════════════════════════════════
// CreateSummaryPage — 3-step wizard with auto-preview
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  TrendingUp,
  RefreshCw,
  Info,
  Loader2,
} from 'lucide-react';
import { useEntityStore } from '../../stores/entity-store';
import { useSummariesStore } from '../../stores/summaries-store';
import { usePageAccess } from '../../hooks/usePageAccess';
import { Button, Card, Loading } from '../../components/ui';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { calculatePeriod } from '../../lib/period-calculator';
import { previewSummaryData } from '../../lib/summaries-api';
import {
  pickLocalizedName,
  getPeriodTypeLabelI18n,
  getAggregateTypeLabel,
  formatPeriodRangeI18n,
  formatNumberI18n,
} from '../../lib/i18n-helpers';
import type { PeriodType } from '../../types/aggregates';
import type { SummarizableTemplate } from '../../types/summaries';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type WizardStep = 'select-template' | 'select-period' | 'preview-save';

interface AlertState {
  open: boolean;
  title: string;
  message: React.ReactNode;
  variant: 'warning' | 'danger' | 'info' | 'success';
  confirmText: string;
  onConfirm: () => void;
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export function CreateSummaryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = i18n.language;

  const { activeEntity } = useEntityStore();
  const { allowed: canCreate, loading: checkingCreate } = usePageAccess(
    'aggregate_summaries',
    'create'
  );

  const {
    templates,
    loadingTemplates,
    previewing,
    generating,
    saving,
    error,
    preview,
    generatedPreview,
    loadTemplates,
    previewSummary,
    generatePreview,
    clearPreview,
    createSummary,
    clearError,
  } = useSummariesStore();

  // ─── Wizard state ───
  const [step, setStep] = useState<WizardStep>('select-template');
  const [selectedTemplate, setSelectedTemplate] =
    useState<SummarizableTemplate | null>(null);

  // ─── Step 2: Period ───
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // ─── Step 3: Metadata ───
  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState('');

  // ─── Alert (ConfirmModal) ───
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    title: '',
    message: '',
    variant: 'info',
    confirmText: t('common.close'),
    onConfirm: () => {},
  });

  // ─── Computed period ───
  const calculatedPeriod = useMemo(
    () => calculatePeriod(periodType, customStart, customEnd),
    [periodType, customStart, customEnd]
  );

  // ─── Load templates on mount ───
  useEffect(() => {
    if (canCreate && templates.length === 0) {
      loadTemplates();
    }
  }, [canCreate, templates.length, loadTemplates]);

  // ─── Cleanup ───
  useEffect(() => {
    return () => {
      clearPreview();
      clearError();
    };
  }, [clearPreview, clearError]);

  // ═══════════════════════════════════════════
  // Alert helpers
  // ═══════════════════════════════════════════

  const showAlert = (config: Omit<AlertState, 'open'>) => {
    setAlert({ ...config, open: true });
  };

  const closeAlert = () => {
    setAlert((a) => ({ ...a, open: false }));
  };

  // ═══════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════

  const handleSelectTemplate = (template: SummarizableTemplate) => {
    setSelectedTemplate(template);
    setStep('select-period');
    const defaultTitle = `${pickLocalizedName(template, language)} — ${new Date().toLocaleDateString(
      language === 'ar' ? 'ar-EG' : 'en-US'
    )}`;
    setTitle(defaultTitle);
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;

    // 1. تحقق من اكتمال الفترة
    if (
      !calculatedPeriod.isComplete ||
      !calculatedPeriod.start ||
      !calculatedPeriod.end
    ) {
      showAlert({
        title: '⚠️ الفترة غير مكتملة',
        message: (
          <div className="space-y-2">
            <p>{calculatedPeriod.label || 'الرجاء تحديد فترة صالحة'}</p>
            <p className="text-xs text-text-muted">
              اختر نصف شهري / شهري / مخصص، ثم تأكد أن الفترة مكتملة قبل المتابعة.
            </p>
          </div>
        ),
        variant: 'warning',
        confirmText: t('common.close'),
        onConfirm: closeAlert,
      });
      return;
    }

    // 2. جلب المعاينة
    const result = await previewSummary({
      template_id: selectedTemplate.id,
      period_type: periodType,
      period_start: calculatedPeriod.start,
      period_end: calculatedPeriod.end,
      region_id: activeEntity?.entityId || null,
      entity_id: null,
    });

    // 3. فشل الاتصال
    if (!result) {
      showAlert({
        title: '⚠️ فشل الاتصال',
        message: 'تعذّر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.',
        variant: 'danger',
        confirmText: t('common.close'),
        onConfirm: closeAlert,
      });
      return;
    }

    // 4. لا توجد بيانات
    if (result.total_visits === 0) {
      showAlert({
        title: '⚠️ لا توجد تقارير تجميعية',
        message: (
          <div className="space-y-2">
            <p>
              لم يتم العثور على أي تقارير تجميعية من نوع{' '}
              <strong>"{pickLocalizedName(selectedTemplate, language)}"</strong>{' '}
              في الفترة:
            </p>
            <p className="text-sm font-mono bg-bg-secondary p-2 rounded">
              {calculatedPeriod.start} → {calculatedPeriod.end}
            </p>
            <p className="text-xs text-text-muted">
              💡 الحل: أنشئ تقريراً تجميعياً أولاً من صفحة "التقارير التجميعية"
              لنفس الفترة، ثم ارجع هنا.
            </p>
          </div>
        ),
        variant: 'warning',
        confirmText: 'الذهاب إلى التقارير التجميعية',
        onConfirm: () => {
          closeAlert();
          navigate('/aggregates');
        },
      });
      return;
    }

    // 5. نجاح — الانتقال لخطوة المعاينة
    setStep('preview-save');
    await generatePreview();
  };

  const handleGenerate = async () => {
    await generatePreview();
  };

  const handleSave = async () => {
    if (!selectedTemplate || !calculatedPeriod.isComplete) return;
    if (!title.trim()) {
      showAlert({
        title: '⚠️ العنوان مطلوب',
        message: 'الرجاء إدخال عنوان للملخص قبل الحفظ.',
        variant: 'warning',
        confirmText: t('common.close'),
        onConfirm: closeAlert,
      });
      return;
    }

    try {
      const id = await createSummary({
        template_id: selectedTemplate.id,
        title: title.trim(),
        classification: classification.trim() || null,
        region_id: activeEntity?.entityId || null,
        entity_id: null,
        period_type: periodType,
        period_start: calculatedPeriod.start,
        period_end: calculatedPeriod.end,
        source_aggregate_ids: preview?.aggregate_ids || [],
      });
      navigate(`/aggregate-summaries/${id}`);
    } catch (err) {
      showAlert({
        title: '⚠️ فشل الحفظ',
        message:
          err instanceof Error
            ? err.message
            : 'حدث خطأ غير متوقع أثناء حفظ الملخص.',
        variant: 'danger',
        confirmText: t('common.close'),
        onConfirm: closeAlert,
      });
    }
  };

  const handleBack = () => {
    if (step === 'select-period') {
      setStep('select-template');
      setSelectedTemplate(null);
      clearPreview();
    } else if (step === 'preview-save') {
      setStep('select-period');
      clearPreview();
    }
  };

  // ═══════════════════════════════════════════
  // Render Guards
  // ═══════════════════════════════════════════

  if (checkingCreate) {
    return <Loading message={t('common.loading')} />;
  }

  if (!canCreate) {
    return (
      <div className="p-6 text-center text-danger">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">
          {t('aggregate_summaries.no_permission_create')}
        </h2>
      </div>
    );
  }

  if (loadingTemplates && templates.length === 0) {
    return <Loading message={t('aggregate_summaries.loading')} />;
  }

  // ═══════════════════════════════════════════
  // STEP 1: Select Template
  // ═══════════════════════════════════════════

  if (step === 'select-template') {
    return (
      <>
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/aggregate-summaries')}
              className="p-2 rounded-lg hover:bg-bg-secondary"
            >
              <ArrowRight className="w-5 h-5 text-text-secondary" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                {t('aggregate_summaries.create_title')}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                {t('aggregate_summaries.create_subtitle')}
              </p>
            </div>
          </div>

          {error && (
            <Card padding="md" className="border-danger bg-danger/5">
              <div className="text-danger text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            </Card>
          )}

          {templates.length === 0 ? (
            <Card padding="lg">
              <div className="py-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-text mb-2">
                  {t('aggregate_summaries.no_templates')}
                </h3>
                <p className="text-sm text-text-secondary mb-6">
                  {t('aggregate_summaries.no_templates_desc')}
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/aggregates')}
                  icon={<ArrowRight className="w-4 h-4 rotate-180" />}
                >
                  الذهاب إلى التقارير التجميعية
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const reportType = template.calculations?.report_type;
                return (
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
                        className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${template.category?.color || '#2563eb'}15`,
                          color: template.category?.color || '#2563eb',
                        }}
                      >
                        <Sparkles className="w-7 h-7" />
                      </div>

                      <h3 className="mb-2 text-lg font-bold text-text">
                        {pickLocalizedName(template, language)}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2.5 py-1 font-medium ${
                            reportType === 'RL'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-success/10 text-success'
                          }`}
                        >
                          {getAggregateTypeLabel(t, template.aggregate_type)}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2 text-sm font-medium text-primary">
                        <span>{t('aggregate_summaries.choose')}</span>
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <ConfirmModal
          open={alert.open}
          title={alert.title}
          message={alert.message}
          confirmText={alert.confirmText}
          variant={alert.variant}
          onConfirm={alert.onConfirm}
          onCancel={closeAlert}
        />
      </>
    );
  }

  // Guard
  if (!selectedTemplate) {
    return <Loading message={t('aggregate_summaries.loading')} />;
  }

  // ═══════════════════════════════════════════
  // STEP 2: Select Period
  // ═══════════════════════════════════════════

  if (step === 'select-period') {
    const periodComplete =
      calculatedPeriod.isComplete &&
      !!calculatedPeriod.start &&
      !!calculatedPeriod.end;

    return (
      <>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-bg-secondary"
            >
              <ArrowRight className="w-5 h-5 text-text-secondary" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text">
                {pickLocalizedName(selectedTemplate, language)}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                {t('aggregate_summaries.period_title')}
              </p>
            </div>
          </div>

          {error && (
            <Card padding="md" className="border-danger bg-danger/5">
              <div className="text-danger text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            </Card>
          )}

          <Card padding="lg">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
              <Calendar className="w-5 h-5 text-primary" />
              {t('aggregate_summaries.period_title')}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text mb-2">
                {t('aggregate_summaries.period_type')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(['biweekly', 'monthly', 'custom'] as PeriodType[]).map(
                  (type) => {
                    const active = periodType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setPeriodType(type)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-surface text-text-secondary hover:bg-bg-secondary'
                        }`}
                      >
                        {getPeriodTypeLabelI18n(t, type)}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {periodType === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    {t('aggregate_summaries.from_date')}
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    {t('aggregate_summaries.to_date')}
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {calculatedPeriod && (
              <div
                className={`mt-4 rounded-lg border p-4 ${
                  periodComplete
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-warning/30 bg-warning/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  {periodComplete ? (
                    <CheckCircle2 className="mt-0.5 w-5 h-5 flex-shrink-0 text-primary" />
                  ) : (
                    <AlertCircle className="mt-0.5 w-5 h-5 flex-shrink-0 text-warning" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text mb-1">
                      {t('aggregate_summaries.period_label')}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {periodComplete
                        ? formatPeriodRangeI18n(
                            calculatedPeriod.start,
                            calculatedPeriod.end,
                            language
                          )
                        : calculatedPeriod.label}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ⭐ Auto preview */}
            {periodComplete && (
              <AutoPeriodPreview
                templateId={selectedTemplate.id}
                periodType={periodType}
                periodStart={calculatedPeriod.start}
                periodEnd={calculatedPeriod.end}
                regionId={activeEntity?.entityId || null}
              />
            )}
          </Card>

          <Card padding="md" className="bg-bg-secondary">
            <div className="flex items-start gap-2 text-sm text-text-secondary">
              <Info className="mt-0.5 w-4 h-4 flex-shrink-0 text-primary" />
              <p>{t('aggregate_summaries.info_box')}</p>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => navigate('/aggregate-summaries')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={handlePreview}
              disabled={!periodComplete || previewing}
              loading={previewing}
            >
              {t('aggregate_summaries.preview_data')}
            </Button>
          </div>
        </div>

        <ConfirmModal
          open={alert.open}
          title={alert.title}
          message={alert.message}
          confirmText={alert.confirmText}
          variant={alert.variant}
          onConfirm={alert.onConfirm}
          onCancel={closeAlert}
        />
      </>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 3: Preview + Save
  // ═══════════════════════════════════════════

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-bg-secondary"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              {t('aggregate_summaries.preview_title')}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {pickLocalizedName(selectedTemplate, language)}
            </p>
          </div>
        </div>

        {error && (
          <Card padding="md" className="border-danger bg-danger/5">
            <div className="text-danger text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </Card>
        )}

        {preview && (
          <Card padding="lg">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t('aggregate_summaries.preview_title')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-primary/5 text-center">
                <div className="text-3xl font-bold text-primary">
                  {formatNumberI18n(preview.source_aggregate_count, language)}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {t('aggregate_summaries.preview_aggregates_count', {
                    count: preview.source_aggregate_count,
                  })}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-success/5 text-center">
                <div className="text-3xl font-bold text-success">
                  {formatNumberI18n(preview.total_visits, language)}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {t('aggregate_summaries.preview_visits_count', {
                    count: preview.total_visits,
                  })}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-info/5 text-center">
                <div className="text-3xl font-bold text-info">
                  {formatNumberI18n(preview.source_report_count, language)}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {t('aggregate_summaries.preview_sources_count', {
                    count: preview.source_report_count,
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  {t('aggregate_summaries.title_label')}{' '}
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('aggregate_summaries.title_placeholder')}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  {t('aggregate_summaries.classification_label')}
                </label>
                <input
                  type="text"
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  placeholder={t('aggregate_summaries.classification_placeholder')}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </Card>
        )}

        {generating && !generatedPreview && (
          <Card padding="lg">
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-text mb-2">
                {t('aggregate_summaries.generating')}
              </h3>
              <div className="space-y-1 text-sm text-text-secondary">
                <p>⏳ {t('aggregate_summaries.generating_strengths')}</p>
                <p>⏳ {t('aggregate_summaries.generating_improvements')}</p>
                <p>⏳ {t('aggregate_summaries.merging_similar')}</p>
              </div>
            </div>
          </Card>
        )}

        {generatedPreview && (
          <>
            <Card padding="lg">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
                <CheckCircle2 className="w-5 h-5 text-success" />
                {t('aggregate_summaries.strengths_section')}
                <span className="text-sm text-text-muted">
                  ({generatedPreview.strengths.length})
                </span>
              </h3>
              {generatedPreview.strengths.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">
                  {t('aggregate_summaries.no_strengths')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {generatedPreview.strengths.map((point, idx) => (
                    <li
                      key={idx}
                      className="p-3 rounded-lg border border-success/20 bg-success/5 text-sm text-text"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-success font-bold flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <div className="flex-1">
                          <div>{point.text}</div>
                          {point.merged_from.length > 0 && (
                            <div className="text-xs text-text-muted mt-1">
                              🔗 {point.merged_from.length} نسخة مدموجة ·{' '}
                              {point.source_report_ids.length} تقرير
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card padding="lg">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
                <AlertCircle className="w-5 h-5 text-warning" />
                {t('aggregate_summaries.improvements_section')}
                <span className="text-sm text-text-muted">
                  ({generatedPreview.improvements.length})
                </span>
              </h3>
              {generatedPreview.improvements.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">
                  {t('aggregate_summaries.no_improvements')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {generatedPreview.improvements.map((point, idx) => (
                    <li
                      key={idx}
                      className="p-3 rounded-lg border border-warning/20 bg-warning/5 text-sm text-text"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-warning font-bold flex-shrink-0">
                          {idx + 1}.
                        </span>
                        <div className="flex-1">
                          <div>{point.text}</div>
                          {point.merged_from.length > 0 && (
                            <div className="text-xs text-text-muted mt-1">
                              🔗 {point.merged_from.length} نسخة مدموجة ·{' '}
                              {point.source_report_ids.length} تقرير
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={handleBack}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            {t('common.back')}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleGenerate}
              icon={<RefreshCw className="w-4 h-4" />}
              disabled={generating}
              loading={generating}
            >
              {t('aggregate_summaries.regenerate')}
            </Button>
            <Button
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={saving || !generatedPreview || !title.trim()}
              loading={saving}
            >
              {t('aggregate_summaries.generate_summary')}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={alert.open}
        title={alert.title}
        message={alert.message}
        confirmText={alert.confirmText}
        variant={alert.variant}
        onConfirm={alert.onConfirm}
        onCancel={closeAlert}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// AutoPeriodPreview — معاينة تلقائية بعد اختيار الفترة
// ═══════════════════════════════════════════════════════════

function AutoPeriodPreview({
  templateId,
  periodType,
  periodStart,
  periodEnd,
  regionId,
}: {
  templateId: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  regionId: string | null;
}) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    aggregates: number;
    visits: number;
    reports: number;
  } | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);

    (async () => {
      try {
        const preview = await previewSummaryData({
          template_id: templateId,
          period_type: periodType,
          period_start: periodStart,
          period_end: periodEnd,
          region_id: regionId,
          entity_id: null,
        });

        if (!cancelled) {
          setData({
            aggregates: preview.source_aggregate_count,
            visits: preview.total_visits,
            reports: preview.source_report_count,
          });
        }
      } catch {
        if (!cancelled) {
          setFetchError(true);
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [templateId, periodType, periodStart, periodEnd, regionId]);

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        جاري فحص البيانات المتاحة...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="mt-3 p-2 rounded-lg bg-danger/5 border border-danger/20 text-xs text-danger flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        فشل الاتصال بالخادم — حاول إعادة تحميل الصفحة
      </div>
    );
  }

  if (!data || data.visits === 0) {
    return (
      <div className="mt-3 p-2 rounded-lg bg-warning/5 border border-warning/20 text-xs text-warning flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          لا توجد تقارير تجميعية في هذه الفترة
        </div>
        <button
          onClick={() => navigate('/aggregates')}
          className="text-warning underline font-medium hover:no-underline flex-shrink-0"
        >
          اذهب للتقارير التجميعية
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-2 rounded-lg bg-success/5 border border-success/20 text-xs text-success flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      <span>
        ✅ {formatNumberI18n(data.aggregates, language)} تقرير تجميعي ·{' '}
        {formatNumberI18n(data.visits, language)} زيارة ·{' '}
        {formatNumberI18n(data.reports, language)} تقرير مصدري
      </span>
    </div>
  );
}

export default CreateSummaryPage;