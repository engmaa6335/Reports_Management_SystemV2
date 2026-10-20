import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  FileText,
  Building2,
  User as UserIcon,
  Calendar,
  Clock,
  Edit,
  Printer,
  Star,
  Trash2,
} from 'lucide-react';
import { useReportsStore } from '../../stores/reports-store';
import type { ReportField } from '../../stores/reports-store';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { DeleteReportModal } from '../../components/reports/DeleteReportModal';
import { RevisionsList } from '../../components/reports/RevisionsList';
import { supabase } from '../../lib/supabase';

// ================================================
// Helpers
// ================================================

function formatDate(dateStr: string | null, lang: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return '—'; }
}

function formatDateTime(dateStr: string | null, lang: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

function getStatusBadge(status: string, t: (key: string) => string) {
  const badges: Record<string, { label: string; className: string }> = {
    active: { label: t('report_view.status_active'), className: 'bg-success/10 text-success border-success/30' },
    updated: { label: t('report_view.status_updated'), className: 'bg-info/10 text-info border-info/30' },
    aggregated: { label: t('report_view.status_aggregated'), className: 'bg-warning/10 text-warning border-warning/30' },
    archived: { label: t('report_view.status_archived'), className: 'bg-text-muted/10 text-text-muted border-text-muted/30' },
  };
  return badges[status] || { label: status, className: 'bg-bg-secondary text-text border-border' };
}

function getPeriodLabel(periodType: string | null, t: (key: string) => string): string {
  if (!periodType) return '—';
  const labels: Record<string, string> = {
    weekly: t('report_form.weekly'),
    biweekly: t('report_form.biweekly'),
    monthly: t('report_form.monthly'),
    custom: t('report_form.custom'),
  };
  return labels[periodType] || periodType;
}

function getScaleBadgeClass(scaleValue: string | undefined): string {
  switch (scaleValue) {
    case 'high': return 'bg-success/15 text-success border border-success/30';
    case 'medium': return 'bg-warning/15 text-warning border border-warning/30';
    case 'low': return 'bg-danger/15 text-danger border border-danger/30';
    default: return 'bg-bg-secondary text-text-muted border border-border';
  }
}

// ================================================
// Field Value Renderer
// ================================================

interface RenderFieldValueProps {
  fieldType: string;
  value: unknown;
  options?: { value: string; label: string }[];
  fieldOptions?: Record<string, unknown>;
  t: (key: string, opts?: any) => string;
  lang: string;
}

function RenderFieldValue({ fieldType, value, options, fieldOptions, t, lang }: RenderFieldValueProps) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-text-muted italic">{t('report_view.no_value')}</span>;
  }

  if (fieldType === 'auto_filled') {
    const displayType = (fieldOptions?.display_type as string) || 'text';
    if (displayType === 'date' && typeof value === 'string') {
      return <span className="font-medium text-lg">{formatDate(value, lang)}</span>;
    }
    return <span className="font-medium text-lg">{String(value)}</span>;
  }

  if (fieldType === 'indicator_group') {
    const indicators = (fieldOptions?.indicators as Array<{ num: number; text: string }>) || [];
    const scale = (fieldOptions?.scale as string[]) || [];
    const scaleLabels = (fieldOptions?.scale_labels as string[]) || [];
    const valueMap = (value as Record<string, string>) || {};

    if (indicators.length === 0) {
      return <span className="text-text-muted italic">{t('report_view.no_indicators')}</span>;
    }

    return (
      <div className="space-y-3">
        {indicators.map((ind) => {
          const selectedValue = valueMap[String(ind.num)];
          const scaleIdx = selectedValue ? scale.indexOf(selectedValue) : -1;
          const label = scaleIdx >= 0 ? scaleLabels[scaleIdx] : t('report_view.not_rated');

          return (
            <div key={ind.num} className="flex items-start gap-3 p-4 rounded-lg bg-bg-secondary border border-border print:border-gray-300 print-avoid-break">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                {ind.num}
              </span>
              <p className="flex-1 text-base font-semibold text-text leading-relaxed">{ind.text}</p>
              <span className={`flex-shrink-0 text-sm font-bold px-3 py-1.5 rounded-md ${getScaleBadgeClass(selectedValue)}`}>
                {label}
              </span>
            </div>
          );
        })}
        <div className="mt-4 pt-3 border-t border-border text-sm text-text-muted flex items-center gap-3">
          <span dangerouslySetInnerHTML={{ __html: t('report_view.indicators_summary', { count: Object.keys(valueMap).length, total: indicators.length }) }} />
        </div>
      </div>
    );
  }

  if (fieldType === 'date') return <span className="text-lg">{formatDate(value as string, lang)}</span>;
  if (fieldType === 'datetime') return <span className="text-lg">{formatDateTime(value as string, lang)}</span>;

  if (fieldType === 'rating') {
    const ratingValue = Number(value);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className={`w-6 h-6 ${ratingValue >= star ? 'fill-warning text-warning' : 'text-text-muted'}`} />
        ))}
        <span className="text-base text-text-secondary mr-2 font-medium">{ratingValue} / 5</span>
      </div>
    );
  }

  if (fieldType === 'select' && options && options.length > 0) {
    const opt = options.find((o) => o.value === value);
    return <span className="text-lg">{opt?.label || String(value)}</span>;
  }

  if (fieldType === 'textarea') {
    return <p className="whitespace-pre-wrap text-lg text-text leading-relaxed font-medium">{String(value)}</p>;
  }

  if (typeof value === 'boolean') {
    return <span className="text-lg">{value ? t('report_view.yes') : t('report_view.no')}</span>;
  }

  if (typeof value === 'object') {
    return <pre className="text-xs bg-bg-secondary p-2 rounded overflow-auto">{JSON.stringify(value, null, 2)}</pre>;
  }

  return <span className="text-lg">{String(value)}</span>;
}

// ================================================
// Component
// ================================================

export function ViewReportPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { activeEntity, availableEntities, setActiveEntity } = useEntityStore();
  const { currentReport, revisions, loading, deleting, error, loadReportById, deleteReport, clearCurrentReport } = useReportsStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entityNamesMap, setEntityNamesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!activeEntity && availableEntities && availableEntities.length > 0) {
      setActiveEntity(availableEntities[0].entityId);
    }
  }, [activeEntity, availableEntities, setActiveEntity]);

  useEffect(() => {
    if (id) loadReportById(id);
    return () => { clearCurrentReport(); };
  }, [id, loadReportById, clearCurrentReport]);

  useEffect(() => {
    if (!currentReport) return;
    const fetchEntityNames = async () => {
      const entityIds: string[] = [];
      currentReport.fields?.forEach((field: ReportField) => {
        if (field.field_type === 'center_select' || field.field_type === 'school_select') {
          const value = (currentReport.data as Record<string, unknown>)?.[field.field_key];
          if (value && typeof value === 'string' && value.length > 20) entityIds.push(value);
        }
      });
      if (entityIds.length === 0) return;
      const { data, error } = await supabase.from('entities').select('id, name_en, name_ar').in('id', entityIds);
      if (error) { console.error('❌ Error fetching entity names:', error); return; }
      const map: Record<string, string> = {};
      (data || []).forEach((e: { id: string; name_en?: string; name_ar?: string }) => {
        map[e.id] = e.name_ar || e.name_en || e.id;
      });
      setEntityNamesMap(map);
    };
    fetchEntityNames();
  }, [currentReport]);

  const isOwner = currentReport?.created_by === user?.id;
  const isTechSupport = activeEntity?.roleCode === 'tech_support';
  const canEdit = isOwner || isTechSupport;
  const canDelete = isTechSupport;

  const handlePrint = () => window.print();
  const handleEdit = () => { if (currentReport) navigate(`/reports/${currentReport.id}/edit`); };
  const handleDelete = async (reason: string) => {
    if (!currentReport) return;
    await deleteReport(currentReport.id, reason);
    setShowDeleteModal(false);
    navigate('/reports', { replace: true });
  };

  if (loading) return <Loading message={t('report_form.loading_report')} />;

  if (error || !currentReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reports')} className="p-2 rounded-lg hover:bg-bg-secondary transition-colors">
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-2xl font-bold text-text">{t('report_view.title')}</h1>
        </div>
        <Card padding="lg" className="border-danger bg-danger/5">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-danger mb-2">{t('report_form.report_not_found')}</h2>
            <p className="text-text-secondary mb-6">{error || t('report_form.report_not_found_desc')}</p>
            <Button variant="primary" icon={<ArrowRight className="w-4 h-4" />} onClick={() => navigate('/reports')}>
              {t('report_form.back_to_list')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const badge = getStatusBadge(currentReport.status, t);
  const category = (currentReport.template as any)?.category as { color?: string; name_ar?: string } | undefined;
  const fieldLabels = Object.fromEntries((currentReport.fields || []).map((f: ReportField) => [f.field_key, f.label_ar]));

  return (
    <>
      <div className="space-y-6 print:space-y-4">
        <div className="hidden print:block text-center pb-4 mb-4 border-b-2 border-black">
          <div className="text-3xl mb-2">🏛️</div>
          <h1 className="text-2xl font-bold mb-1">{t('report_view.print_header_title')}</h1>
          <p className="text-sm text-gray-600">{t('report_view.print_header_subtitle')}</p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/reports')} className="p-2 rounded-lg hover:bg-bg-secondary transition-colors">
              <ArrowRight className="w-5 h-5 text-text-secondary" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-text">{currentReport.template?.name_ar || t('reports_page.table_report')}</h1>
              <p className="text-text-secondary text-base mt-1">
                {currentReport.entity?.name_ar} — {formatDate(currentReport.created_at, i18n.language)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>{t('report_view.print_pdf')}</Button>
            {canEdit && (
              <Button variant="primary" icon={<Edit className="w-4 h-4" />} onClick={handleEdit}>{t('report_view.edit_btn')}</Button>
            )}
            {canDelete && (
              <Button variant="danger" icon={<Trash2 className="w-4 h-4" />} onClick={() => setShowDeleteModal(true)}>{t('report_view.delete_btn')}</Button>
            )}
          </div>
        </div>

        <Card padding="lg" className="print:shadow-none print:border print:border-gray-300 print-avoid-break">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm font-semibold text-text-muted uppercase mb-2">{t('report_view.meta_template')}</div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-semibold text-lg text-text">{currentReport.template?.name_ar || '—'}</span>
              </div>
              {category && (
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: `${category.color}15`, color: category.color }}>{category.name_ar}</span>
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-text-muted uppercase mb-2">{t('report_view.meta_entity')}</div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-secondary" />
                <span className="font-semibold text-lg text-text">{currentReport.entity?.name_ar || '—'}</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-text-muted uppercase mb-2">{t('report_view.meta_creator')}</div>
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-info" />
                <span className="font-semibold text-lg text-text">{currentReport.creator?.full_name || '—'}</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-text-muted uppercase mb-2">{t('report_view.meta_status')}</div>
              <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold border ${badge.className}`}>{badge.label}</span>
            </div>
          </div>

          {(currentReport.period_type || currentReport.period_start || currentReport.period_end) && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm font-semibold text-text-muted uppercase mb-2">{t('report_view.meta_period_type')}</div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-text-secondary" />
                    <span className="text-lg text-text">{getPeriodLabel(currentReport.period_type, t)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-muted uppercase mb-2">{t('report_view.meta_from_date')}</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-text-secondary" />
                    <span className="text-lg text-text">{formatDate(currentReport.period_start, i18n.language)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-muted uppercase mb-2">{t('report_view.meta_to_date')}</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-text-secondary" />
                    <span className="text-lg text-text">{formatDate(currentReport.period_end, i18n.language)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentReport.edit_count > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Edit className="w-4 h-4" />
                <span>{t('report_view.edit_count', { count: currentReport.edit_count, date: formatDateTime(currentReport.last_edited_at, i18n.language) })}</span>
              </div>
            </div>
          )}
        </Card>

        <Card padding="lg" className="print:shadow-none print:border print:border-gray-300">
          <h3 className="text-2xl font-bold text-text mb-6 print:border-b print:border-gray-300 print:pb-2">{t('report_view.data_section')}</h3>
          {!currentReport.fields || currentReport.fields.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-lg">{t('report_view.no_fields')}</div>
          ) : (
            <div className="space-y-6">
              {currentReport.fields.map((field: ReportField) => {
                const rawValue = (currentReport.data as Record<string, unknown>)[field.field_key];
                const options = ((field.options as { options?: { value: string; label: string }[] })?.options) || [];
                const displayValue = (field.field_type === 'center_select' || field.field_type === 'school_select') && typeof rawValue === 'string' && entityNamesMap[rawValue] ? entityNamesMap[rawValue] : rawValue;
                return (
                  <div key={field.id} className="pb-6 border-b-2 border-border last:border-0 last:pb-0 print:pb-4 print-avoid-break">
                    <div className="text-base font-bold text-text mb-3">{field.label_ar}</div>
                    <div className="text-lg text-text leading-relaxed">
                      <RenderFieldValue fieldType={field.field_type} value={displayValue} options={options} fieldOptions={field.options as Record<string, unknown>} t={t} lang={i18n.language} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {revisions.length > 0 && (
          <Card padding="lg" className="print:shadow-none print:border print:border-gray-300">
            <h3 className="text-2xl font-bold text-text mb-6 print:border-b print:border-gray-300 print:pb-2 flex items-center gap-2">
              {t('report_view.revisions_title')}
              <span className="text-base font-normal text-text-muted">{t('report_view.revisions_count', { count: revisions.length })}</span>
            </h3>
            <RevisionsList revisions={revisions} fieldLabels={fieldLabels} />
          </Card>
        )}

        <div className="hidden print:block mt-8 pt-4 border-t-2 border-black text-center text-xs text-gray-600">
          <p>{t('report_view.print_footer_created')}</p>
          <p className="mt-1">{t('report_view.print_footer_date', { date: new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })}</p>
          <p className="mt-1">{t('report_view.print_footer_copyright')}</p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 print:hidden">
          <Button variant="ghost" icon={<ArrowRight className="w-4 h-4" />} onClick={() => navigate('/reports')}>
            {t('report_form.back_to_list')}
          </Button>
        </div>
      </div>

      <DeleteReportModal
        isOpen={showDeleteModal}
        reportTitle={currentReport.template?.name_ar || t('reports_page.table_report')}
        reportEntityName={currentReport.entity?.name_ar || '—'}
        reportCreatorName={currentReport.creator?.full_name || '—'}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={deleting}
      />
    </>
  );
}