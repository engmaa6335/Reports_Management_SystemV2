import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Printer,
  Edit,
  User as UserIcon,
  Building2,
  Calendar,
  FileText,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useAggregatesStore } from '../../stores/aggregates-store';
import { Button, Card, Loading } from '../../components/ui';
import { VisitsTable } from '../../components/aggregates/VisitsTable';
import type {
  SpecialistReportData,
  VisitRow,
  ManualActivityRow,
} from '../../types/aggregates';

// ═══════════════════════════════════════════════════════════
// ViewAggregatePage — عرض وطباعة التقرير التجميعي
// ═══════════════════════════════════════════════════════════

// ⭐ نمط كسر النص الطويل (لكل خلايا الجداول)
const breakableCellStyle: React.CSSProperties = {
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
  maxWidth: '100%',
};

export function ViewAggregatePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);

  const {
    currentAggregate,
    loadingDetail,
    error,
    loadAggregateById,
    clearError,
  } = useAggregatesStore();

  // ═══════════════════════════════════════════
  // Load
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (id) {
      loadAggregateById(id);
    }
    return () => clearError();
  }, [id, loadAggregateById, clearError]);

  // ═══════════════════════════════════════════
  // Print
  // ═══════════════════════════════════════════

  const handlePrint = () => {
    window.print();
  };

  // ═══════════════════════════════════════════
  // Render — Loading
  // ═══════════════════════════════════════════

  if (loadingDetail) {
    return <Loading message={t('report_form.loading_report')} />;
  }

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <Card padding="lg" className="border-danger bg-danger/5">
          <div className="flex items-start gap-3 text-danger">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="mb-1 font-bold">{t('aggregate_view.error_loading')}</h2>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
        <Button
          variant="ghost"
          icon={<ArrowRight className="h-4 w-4" />}
          onClick={() => navigate('/aggregates')}
        >
          {t('aggregate_form.back_to_list')}
        </Button>
      </div>
    );
  }

  if (!currentAggregate) {
    return (
      <div className="space-y-6" dir="rtl">
        <Card padding="lg">
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">📄</div>
            <h2 className="mb-2 text-xl font-bold text-text">
              {t('aggregate_form.not_found')}
            </h2>
            <p className="mb-6 text-text-secondary">
              {t('aggregate_form.not_found_desc')}
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/aggregates')}
            >
              {t('aggregate_form.back_to_list')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Data
  // ═══════════════════════════════════════════

  const reportData = currentAggregate.data as SpecialistReportData;
  const calcs = currentAggregate.aggregate_template?.calculations;
  const reportType = calcs?.report_type || reportData?.report_type || 'RL';
  const entityLabel = calcs?.entity_label || 'الجهة';

  const visits: VisitRow[] = reportData?.visits || [];
  const manualActivities: ManualActivityRow[] =
    reportData?.manual_activities || [];

  const specialistName = reportData?.specialist_name || '—';
  const specialization = reportData?.specialization || '—';
  const regionName = reportData?.region_name || '—';
  const periodStart =
    reportData?.period_start || currentAggregate.period_start || '—';
  const periodEnd =
    reportData?.period_end || currentAggregate.period_end || '—';
  const periodType =
    reportData?.period_type || currentAggregate.period_type || '—';

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '—') return '—';
    try {
      return new Date(dateStr).toLocaleDateString(
        i18n.language === 'ar' ? 'ar-EG' : 'en-US',
        { day: 'numeric', month: 'long', year: 'numeric' }
      );
    } catch {
      return dateStr;
    }
  };

  const periodTypeLabel = (() => {
    if (periodType === 'biweekly') return t('aggregate_form.period_biweekly');
    if (periodType === 'monthly') return t('aggregate_form.period_monthly');
    if (periodType === 'custom') return t('aggregate_form.period_custom');
    return '—';
  })();

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  return (
    <div className="space-y-6" dir="rtl">
      {/* ═══ Action Bar (لا يُطبع) ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/aggregates')}
            className="rounded-lg p-2 transition-colors hover:bg-bg-secondary"
          >
            <ArrowRight className="h-5 w-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              {t('aggregate_view.view_title')}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {t('aggregate_view.view_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            icon={<Edit className="h-4 w-4" />}
            onClick={() => navigate(`/aggregates/${id}/edit`)}
          >
            {t('aggregate_view.edit')}
          </Button>
          <Button
            variant="primary"
            icon={<Printer className="h-4 w-4" />}
            onClick={handlePrint}
          >
            {t('aggregate_view.print_pdf')}
          </Button>
        </div>
      </div>

      {/* ═══ Report Content (يُطبع) ═══ */}
      <div ref={printRef} className="print:p-0">
        <Card padding="lg" className="print:shadow-none print:border-0">
          {/* ═══ Header ═══ */}
          <div className="mb-8 border-b-2 border-border pb-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-text">
              {t('aggregate_view.title')}
            </h1>
            <h2 className="text-lg font-semibold text-primary">
              {reportType === 'RL'
                ? t('aggregate_view.rl_visits')
                : t('aggregate_view.tls_visits')}
            </h2>
          </div>

          {/* ═══ Metadata ═══ */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <UserIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-muted" />
                <div className="flex-1">
                  <span className="text-xs text-text-muted">
                    {t('aggregate_view.specialist')}
                  </span>
                  <p className="font-medium text-text">{specialistName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-muted" />
                <div className="flex-1">
                  <span className="text-xs text-text-muted">{t('aggregate_view.specialization')}</span>
                  <p className="font-medium text-text">{specialization}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-muted" />
                <div className="flex-1">
                  <span className="text-xs text-text-muted">
                    {t('aggregate_view.region')}
                  </span>
                  <p className="font-medium text-text">{regionName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-muted" />
                <div className="flex-1">
                  <span className="text-xs text-text-muted">
                    {t('aggregate_view.period', { type: periodTypeLabel })}
                  </span>
                  <p className="font-medium text-text">
                    {t('aggregate_view.period_from_to', { start: formatDate(periodStart), end: formatDate(periodEnd) })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Summary Stats ═══ */}
          <div className="mb-8 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
              <div className="text-3xl font-bold text-primary">
                {visits.length}
              </div>
              <div className="mt-1 text-xs text-text-secondary">
                {t('aggregate_view.total_visits')}
              </div>
            </div>
            <div className="rounded-lg border border-info/20 bg-info/5 p-4 text-center">
              <div className="text-3xl font-bold text-info">
                {manualActivities.length}
              </div>
              <div className="mt-1 text-xs text-text-secondary">
                {t('aggregate_view.total_activities')}
              </div>
            </div>
          </div>

          {/* ═══ Section 1: Visits ═══ */}
          <div className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 border-r-4 border-primary pr-3 text-lg font-bold text-text">
              <FileText className="h-5 w-5 text-primary" />
              {t('aggregate_view.visits_section')}
            </h3>

            <VisitsTable visits={visits} entityLabel={entityLabel} />
          </div>

          {/* ═══ Section 2: Manual Activities ═══ */}
          <div className="mb-8">
            <h3 className="mb-4 flex items-center gap-2 border-r-4 border-warning pr-3 text-lg font-bold text-text">
              <Sparkles className="h-5 w-5 text-warning" />
              {t('aggregate_view.activities_section')}
            </h3>

            {manualActivities.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border bg-bg-secondary p-6 text-center">
                <p className="text-sm text-text-muted">
                  {t('aggregate_view.no_activities')}
                </p>
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-lg border border-border">
                <table className="w-full table-fixed border-collapse bg-surface text-sm">
                  <thead>
                    <tr className="border-b-2 border-border bg-bg-secondary">
                      <th className="w-10 px-2 py-3 text-center font-bold text-text">
                        {t('aggregate_view.col_num')}
                      </th>
                      <th className="w-28 px-2 py-3 text-center font-bold text-text">
                        {t('aggregate_view.col_date')}
                      </th>
                      <th className="px-2 py-3 text-right font-bold text-text">
                        {t('aggregate_view.col_activity')}
                      </th>
                      <th className="px-2 py-3 text-right font-bold text-text">
                        {t('aggregate_view.col_topic')}
                      </th>
                      <th className="px-2 py-3 text-right font-bold text-text">
                        {t('aggregate_view.col_target')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualActivities.map((activity, idx) => (
                      <tr
                        key={activity.id}
                        className={`border-b border-border ${
                          idx % 2 === 0
                            ? 'bg-surface'
                            : 'bg-bg-secondary/30'
                        }`}
                      >
                        <td className="px-2 py-3 text-center align-top font-semibold text-text-muted">
                          {idx + 1}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-center align-top text-text text-xs">
                          {formatDate(activity.date)}
                        </td>
                        <td
                          className="px-2 py-3 text-right align-top text-text"
                          style={breakableCellStyle}
                        >
                          {activity.activity || '—'}
                        </td>
                        <td
                          className="px-2 py-3 text-right align-top text-text"
                          style={breakableCellStyle}
                        >
                          {activity.topic || '—'}
                        </td>
                        <td
                          className="px-2 py-3 text-right align-top text-text"
                          style={breakableCellStyle}
                        >
                          {activity.target_group || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ═══ Footer — Signatures ═══ */}
          <div className="mt-12 grid grid-cols-2 gap-8 border-t-2 border-border pt-8">
            <div className="text-center">
              <p className="mb-12 text-sm font-medium text-text-secondary">
                {t('aggregate_view.signature_specialist')}
              </p>
              <div className="border-t border-border pt-2">
                <p className="text-sm font-medium text-text">
                  {specialistName}
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="mb-12 text-sm font-medium text-text-secondary">
                {t('aggregate_view.signature_manager')}
              </p>
              <div className="border-t border-border pt-2">
                <p className="text-sm font-medium text-text-muted">
                  ................................
                </p>
              </div>
            </div>
          </div>

          {/* ═══ Print Footer ═══ */}
          <div className="mt-8 border-t border-border pt-4 text-center text-xs text-text-muted">
            <p>
              {t('aggregate_view.created_at', {
                date: new Date(currentAggregate.created_at).toLocaleDateString(
                  i18n.language === 'ar' ? 'ar-EG' : 'en-US',
                  { day: 'numeric', month: 'long', year: 'numeric' }
                )
              })}
            </p>
          </div>
        </Card>
      </div>

      {/* ═══ Bottom Actions (لا يُطبع) ═══ */}
      <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
        <Button variant="ghost" onClick={() => navigate('/aggregates')}>
          {t('aggregate_form.back_to_list')}
        </Button>
        <Button
          variant="primary"
          size="lg"
          icon={<Printer className="h-5 w-5" />}
          onClick={handlePrint}
        >
          {t('aggregate_view.print_pdf')}
        </Button>
      </div>
    </div>
  );
}

export default ViewAggregatePage;