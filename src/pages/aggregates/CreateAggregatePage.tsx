import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { PeriodType, ManualActivityRow } from '../../types/aggregates';

// ═══════════════════════════════════════════════════════════
// CreateAggregatePage — الصفحة الفعلية
// ═══════════════════════════════════════════════════════════

export function CreateAggregatePage() {
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
  // Auto-calculate period when type/custom dates change
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

  // ⭐ زر "إنشاء التقرير" — يجلب الزيارات
  const handleCreateReport = async () => {
    if (!user?.id || !activeEntity?.entityId) return;

    await fetchVisits({
      userId: user.id,
      entityId: activeEntity.entityId,
    });

    // إذا الفترة مكتملة ولم يوجد تقرير سابق → انتقل لملء التقرير
    const state = useAggregatesStore.getState();
    if (
      state.calculatedPeriod?.isComplete &&
      !state.existingAggregate &&
      !state.error
    ) {
      setStep('fill');
    }
  };

  // ⭐ زر "حفظ التقرير"
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

  // ⭐ فتح التقرير الموجود
  const handleOpenExisting = () => {
    if (existingAggregate) {
      navigate(`/aggregates/${existingAggregate.id}`);
    }
  };

  // ═══════════════════════════════════════════
  // Render — Loading
  // ═══════════════════════════════════════════

  if (loadingTemplates && step === 'select') {
    return <Loading message="جاري تحميل القوالب..." />;
  }

  // ═══════════════════════════════════════════
  // Render — Step 1: Select Template
  // ═══════════════════════════════════════════

  if (step === 'select') {
    return (
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/aggregates')}
            className="rounded-lg p-2 transition-colors hover:bg-bg-secondary"
          >
            <ArrowRight className="h-5 w-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              📊 إنشاء تقرير تجميعي
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              اختر نوع التجميع الذي تريد إنشاءه
            </p>
          </div>
        </div>

        {/* Empty */}
        {availableTemplates.length === 0 ? (
          <Card padding="lg">
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl">📋</div>
              <h2 className="mb-2 text-xl font-bold text-text">
                لا توجد قوالب تجميعية متاحة
              </h2>
              <p className="text-text-secondary">
                تواصل مع الدعم الفني لمنحك صلاحية التجميع
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
                      {template.name_ar}
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
                        {reportType === 'RL' ? 'زيارات R.L' : 'زيارات TLS'}
                      </span>
                      <span className="text-text-muted">
                        {calcs?.entity_label}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 text-sm font-medium text-primary">
                      <span>اختيار</span>
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

  // ═══════════════════════════════════════════
  // Guard
  // ═══════════════════════════════════════════

  if (!selectedTemplate) {
    return <Loading message="جاري التحضير..." />;
  }

  const calcs = selectedTemplate.calculations;
  const reportType = calcs?.report_type || 'RL';
  const entityLabel = calcs?.entity_label || 'الجهة';

  // ═══════════════════════════════════════════
  // Render — Step 2: Period Selection
  // ═══════════════════════════════════════════

  if (step === 'period') {
    const periodComplete = calculatedPeriod?.isComplete ?? false;
    const canCreate = periodComplete && !existingAggregate && !loadingVisits;

    return (
      <div className="space-y-6" dir="rtl">
        {/* Header */}
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
                {selectedTemplate.name_ar}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                حدد الفترة الزمنية للتقرير
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/aggregates')}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={handleCreateReport}
              disabled={!canCreate}
              loading={loadingVisits}
            >
              إنشاء التقرير
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Card padding="md" className="border-danger bg-danger/5">
            <div className="flex items-start gap-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        {/* Period Selection */}
        <Card padding="lg">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
            <Calendar className="h-5 w-5 text-primary" />
            فترة التقرير
          </h3>

          {/* Period Type */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-text">
              نوع الفترة
            </label>
            <div className="flex flex-wrap gap-2">
              {(['biweekly', 'monthly', 'custom'] as PeriodType[]).map(
                (type) => {
                  const labels: Record<PeriodType, string> = {
                    biweekly: 'نصف شهري',
                    monthly: 'شهري',
                    custom: 'مخصص',
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

          {/* Custom Dates */}
          {periodType === 'custom' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  من تاريخ
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
                  إلى تاريخ
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

          {/* Period Result */}
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
                    الفترة الزمنية:
                  </p>
                  <p className="text-sm text-text-secondary">
                    {periodComplete
                      ? `من ${calculatedPeriod.start} إلى ${calculatedPeriod.end}`
                      : calculatedPeriod.label}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ⭐ Existing Aggregate Warning */}
        {existingAggregate && (
          <Card padding="lg" className="border-warning/30 bg-warning/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-warning" />
              <div className="flex-1">
                <h3 className="mb-2 text-base font-bold text-text">
                  ⚠️ يوجد تقرير تجميعي لهذه الفترة مسبقاً
                </h3>
                <p className="mb-4 text-sm text-text-secondary">
                  تم إنشاء تقرير تجميعي لهذه الفترة بتاريخ{' '}
                  <span className="font-medium text-text">
                    {new Date(existingAggregate.created_at).toLocaleDateString(
                      'ar-EG',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }
                    )}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    icon={<ExternalLink className="h-4 w-4" />}
                    onClick={handleOpenExisting}
                  >
                    فتح التقرير الموجود
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={clearExistingAggregate}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Info Box */}
        <Card padding="md" className="bg-bg-secondary">
          <div className="flex items-start gap-2 text-sm">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p className="text-text-secondary">
              عند الضغط على "إنشاء التقرير" سيقوم النظام بجلب جميع الزيارات
              التي وقعت ضمن الفترة المحددة تلقائياً.
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
      {/* Header */}
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
              {selectedTemplate.name_ar}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              راجع الزيارات وأضف الأنشطة الإشرافية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/aggregates')}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            icon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            disabled={saving}
            loading={saving}
          >
            حفظ التقرير
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="flex items-start gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Success Info */}
      {visitsFetched && (
        <Card padding="md" className="border-success/30 bg-success/5">
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              تم جلب الزيارات بنجاح — {visits.length} زيارة في الفترة المحددة
            </span>
          </div>
        </Card>
      )}

      {/* Period Summary */}
      {calculatedPeriod && (
        <Card padding="md" className="bg-bg-secondary">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-muted" />
              <span className="text-text-secondary">الفترة:</span>
              <span className="font-medium text-text">
                {calculatedPeriod.start} → {calculatedPeriod.end}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-text-muted" />
              <span className="text-text-secondary">المختص:</span>
              <span className="font-medium text-text">
                {user?.fullName || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-text-muted" />
              <span className="text-text-secondary">المنطقة:</span>
              <span className="font-medium text-text">
                {activeEntity?.entityName || '—'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ═══ Visits Table ═══ */}
      <Card padding="lg">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <FileText className="h-5 w-5 text-info" />
          أولاً: الزيارات
        </h3>

        <VisitsTable
          visits={visits}
          entityLabel={entityLabel}
          loading={loadingVisits}
        />
      </Card>

      {/* ═══ Manual Activities ═══ */}
      <Card padding="lg">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <Sparkles className="h-5 w-5 text-warning" />
          ثانياً: أنشطة إشرافية أخرى
        </h3>

        <ManualActivitiesTable
          activities={manualActivities}
          onChange={(activities: ManualActivityRow[]) =>
            setManualActivities(activities)
          }
        />
      </Card>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={() => navigate('/aggregates')}>
          إلغاء
        </Button>
        <Button
          variant="primary"
          size="lg"
          icon={<Save className="h-5 w-5" />}
          onClick={handleSave}
          disabled={saving}
          loading={saving}
        >
          حفظ التقرير التجميعي
        </Button>
      </div>
    </div>
  );
}

export default CreateAggregatePage;