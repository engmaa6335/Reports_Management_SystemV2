import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Calendar,
  Save,
  FileText,
  Building2,
  User as UserIcon,
  AlertCircle,
  Sparkles,
  BarChart3,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { useAggregatesStore } from '../../stores/aggregates-store';
import { Button, Card, Loading } from '../../components/ui';
import { VisitsTable } from '../../components/aggregates/VisitsTable';
import { ManualActivitiesTable } from '../../components/aggregates/ManualActivitiesTable';
import { pickLocalizedName } from '../../lib/i18n-helpers';
import type { PeriodType, ManualActivityRow } from '../../types/aggregates';

// ═══════════════════════════════════════════════════════════
// CreateAggregatePage
// ═══════════════════════════════════════════════════════════

export function CreateAggregatePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeEntity } = useEntityStore();

  const {
    availableTemplates,
    selectedTemplate,
    calculatedPeriod,
    periodType,
    customPeriodStart,
    customPeriodEnd,
    visits,
    visitsFetched,
    manualActivities,
    existingAggregate,
    loadingTemplates,
    loadingVisits,
    saving,
    error,
    loadAvailableTemplates,
    selectTemplate,
    setPeriodType,
    setCustomPeriod,
    calculateCurrentPeriod,
    fetchVisits,
    clearExistingAggregate,
    setManualActivities,
    saveAggregate,
    clearSelection,
    clearError,
  } = useAggregatesStore();

  const [step, setStep] = useState<'select' | 'period' | 'fill'>('select');

  // ═══════════════════════════════════════════
  // Load Templates
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (user?.id && activeEntity?.entityId) {
      loadAvailableTemplates(user.id, activeEntity.entityId);
    }
    return () => {
      clearSelection();
      clearError();
    };
  }, [
    user?.id,
    activeEntity?.entityId,
    loadAvailableTemplates,
    clearSelection,
    clearError,
  ]);

  // ═══════════════════════════════════════════
  // Auto-calculate period
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (step === 'period') {
      calculateCurrentPeriod();
    }
  }, [
    step,
    periodType,
    customPeriodStart,
    customPeriodEnd,
    calculateCurrentPeriod,
  ]);

  // ═══════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════

  const handleSelectTemplate = (template: typeof availableTemplates[0]) => {
    selectTemplate(template);
    setStep('period');
  };

  const handleBack = () => {
    if (step === 'period') {
      clearSelection();
      setStep('select');
    } else if (step === 'fill') {
      setStep('period');
      clearExistingAggregate();
    }
  };

  const handleCreateReport = async () => {
    if (!user?.id || !activeEntity?.entityId) return;

    await fetchVisits({
      userId: user.id,
      entityId: activeEntity.entityId,
    });

    const state = useAggregatesStore.getState();
    if (
      state.calculatedPeriod?.isComplete &&
      !state.existingAggregate &&
      !state.error
    ) {
      setStep('fill');
    }
  };

  const handleSave = async () => {
    if (!user?.id || !activeEntity?.entityId) return;

    try {
      const id = await saveAggregate({
        userId: user.id,
        entityId: activeEntity.entityId,
        entityName: activeEntity.entityName || '',
      });
      navigate(`/aggregates/${id}`);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleOpenExisting = () => {
    if (existingAggregate) {
      navigate(`/aggregates/${existingAggregate.id}`);
    }
  };

  // ═══════════════════════════════════════════
  // Render — Loading
  // ═══════════════════════════════════════════

  if (loadingTemplates && step === 'select') {
    return <Loading message={t('aggregate_form.loading_templates')} />;
  }

  // ═══════════════════════════════════════════
  // Render — Step 1: Select Template
  // ═══════════════════════════════════════════

  if (step === 'select') {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/aggregates')}
            className="rounded-lg p-2 transition-colors hover:bg-bg-secondary"
          >
            <ArrowRight className="h-5 w-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              📊 {t('aggregate_form.create_title')}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {t('aggregate_form.create_subtitle')}
            </p>
          </div>
        </div>

        {availableTemplates.length === 0 ? (
          <Card padding="lg">
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl">📋</div>
              <h2 className="mb-2 text-xl font-bold text-text">
                {t('aggregate_form.no_templates')}
              </h2>
              <p className="text-text-secondary">
                {t('aggregate_form.no_templates_desc')}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {availableTemplates.map((template) => {
              const calcs = template.calculations;
              const reportType = calcs?.report_type;

              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="rounded-xl text-right transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Card
                    padding="lg"
                    className="h-full transition-shadow hover:shadow-hard"
                  >
                    <div
                      className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${template.category?.color || '#2563eb'}15`,
                        color: template.category?.color || '#2563eb',
                      }}
                    >
                      <BarChart3 className="h-7 w-7" />
                    </div>

                    <h3 className="mb-2 text-lg font-bold text-text">
                      {pickLocalizedName(template, i18n.language)}
                    </h3>

                    {template.description && (
                      <p className="mb-3 line-clamp-2 text-sm text-text-secondary">
                        {template.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2.5 py-1 font-medium ${
                          reportType === 'RL'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-success/10 text-success'
                        }`}
                      >
                        {reportType === 'RL'
                          ? t('aggregates_page.report_type_rl')
                          : t('aggregates_page.report_type_tls')}
                      </span>
                      <span className="text-text-muted">
                        {calcs?.entity_label}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 text-sm font-medium text-primary">
                      <span>{t('aggregate_form.choose')}</span>
                      <ArrowRight className="h-4 w-4 rotate-180" />
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!selectedTemplate) {
    return <Loading message={t('aggregate_form.preparing')} />;
  }

  const calcs = selectedTemplate.calculations;
  const reportType = calcs?.report_type || 'RL';
  const entityLabel = calcs?.entity_label || 'الجهة';
  const templateDisplayName = pickLocalizedName(selectedTemplate, i18n.language);

  // ═══════════════════════════════════════════
  // Render — Step 2: Period Selection
  // ═══════════════════════════════════════════

  if (step === 'period') {
    const periodComplete = calculatedPeriod?.isComplete ?? false;
    const canCreate = periodComplete && !existingAggregate && !loadingVisits;

    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg p-2 transition-colors hover:bg-bg-secondary"
            >
              <ArrowRight className="h-5 w-5 text-text-secondary" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text">
                {templateDisplayName}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                {t('aggregate_form.period_title')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/aggregates')}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={handleCreateReport}
              disabled={!canCreate}
              loading={loadingVisits}
            >
              {t('reports_page.create_report')}
            </Button>
          </div>
        </div>

        {error && (
          <Card padding="md" className="border-danger bg-danger/5">
            <div className="flex items-start gap-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        <Card padding="lg">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
            <Calendar className="h-5 w-5 text-primary" />
            {t('aggregate_form.period_title')}
          </h3>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-text">
              {t('aggregate_form.period_type')}
            </label>
            <div className="flex flex-wrap gap-2">
              {(['biweekly', 'monthly', 'custom'] as PeriodType[]).map(
                (type) => {
                  const labels: Record<PeriodType, string> = {
                    biweekly: t('aggregate_form.period_biweekly'),
                    monthly: t('aggregate_form.period_monthly'),
                    custom: t('aggregate_form.period_custom'),
                  };
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
                      {labels[type]}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {periodType === 'custom' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  {t('aggregate_form.from_date')}
                </label>
                <input
                  type="date"
                  value={customPeriodStart}
                  onChange={(e) =>
                    setCustomPeriod(e.target.value, customPeriodEnd)
                  }
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  {t('aggregate_form.to_date')}
                </label>
                <input
                  type="date"
                  value={customPeriodEnd}
                  onChange={(e) =>
                    setCustomPeriod(customPeriodStart, e.target.value)
                  }
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
                  <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
                )}
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium text-text">
                    {t('aggregate_form.period_info')}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {periodComplete
                      ? t('aggregate_form.period_from_to', {
                          start: calculatedPeriod.start,
                          end: calculatedPeriod.end,
                        })
                      : calculatedPeriod.label}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {existingAggregate && (
          <Card padding="lg" className="border-warning/30 bg-warning/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-warning" />
              <div className="flex-1">
                <h3 className="mb-2 text-base font-bold text-text">
                  {t('aggregate_form.existing_warning')}
                </h3>
                <p className="mb-4 text-sm text-text-secondary">
                  {t('aggregate_form.existing_desc', {
                    date: new Date(
                      existingAggregate.created_at
                    ).toLocaleDateString(
                      i18n.language === 'ar' ? 'ar-EG' : 'en-US',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    ),
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    icon={<ExternalLink className="h-4 w-4" />}
                    onClick={handleOpenExisting}
                  >
                    {t('aggregate_form.open_existing')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={clearExistingAggregate}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card padding="md" className="bg-bg-secondary">
          <div className="flex items-start gap-2 text-sm">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p className="text-text-secondary">
              {t('aggregate_form.info_box')}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Render — Step 3: Fill Report
  // ═══════════════════════════════════════════

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="rounded-lg p-2 transition-colors hover:bg-bg-secondary"
          >
            <ArrowRight className="h-5 w-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              {templateDisplayName}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {t('aggregate_form.edit_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/aggregates')}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            icon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            disabled={saving}
            loading={saving}
          >
            {t('aggregate_form.save_report')}
          </Button>
        </div>
      </div>

      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="flex items-start gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {visitsFetched && (
        <Card padding="md" className="border-success/30 bg-success/5">
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {t('aggregate_form.visits_fetched', { count: visits.length })}
            </span>
          </div>
        </Card>
      )}

      {calculatedPeriod && (
        <Card padding="md" className="bg-bg-secondary">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-muted" />
              <span className="text-text-secondary">
                {t('aggregate_form.period_title')}:
              </span>
              <span className="font-medium text-text">
                {calculatedPeriod.start} → {calculatedPeriod.end}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-text-muted" />
              <span className="text-text-secondary">
                {t('aggregate_form.specialist')}
              </span>
              <span className="font-medium text-text">
                {user?.fullName || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-text-muted" />
              <span className="text-text-secondary">
                {t('aggregate_form.region')}
              </span>
              <span className="font-medium text-text">
                {activeEntity?.entityName || '—'}
              </span>
            </div>
          </div>
        </Card>
      )}

      <Card padding="lg">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <FileText className="h-5 w-5 text-info" />
          {t('aggregate_form.visits_section')}
        </h3>

        <VisitsTable
          visits={visits}
          entityLabel={entityLabel}
          loading={loadingVisits}
        />
      </Card>

      <Card padding="lg">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <Sparkles className="h-5 w-5 text-warning" />
          {t('aggregate_form.activities_section')}
        </h3>

        <ManualActivitiesTable
          activities={manualActivities}
          onChange={(activities: ManualActivityRow[]) =>
            setManualActivities(activities)
          }
        />
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={() => navigate('/aggregates')}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          size="lg"
          icon={<Save className="h-5 w-5" />}
          onClick={handleSave}
          disabled={saving}
          loading={saving}
        >
          {t('aggregate_form.save_report')}
        </Button>
      </div>
    </div>
  );
}

export default CreateAggregatePage;