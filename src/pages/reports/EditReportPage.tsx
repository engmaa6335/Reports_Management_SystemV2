import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Save, Loader2 } from 'lucide-react';
import { useReportsStore } from '../../stores/reports-store';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { DynamicField } from '../../components/reports/DynamicField';
import { FormSection } from '../../components/reports/FormSection';
import type { PeriodType } from '../../types/database.types';
import { supabase } from '../../lib/supabase';

function isFullWidthField(field: any): boolean {
  if (['indicator_group', 'textarea'].includes(field.field_type)) {
    return true;
  }
  const opts = (field.options as any) || {};
  if (opts.full_width === true) {
    return true;
  }
  return false;
}

interface SectionData {
  key: string;
  title: string;
  icon: string;
  description?: string;
  accentColor: 'primary' | 'success' | 'warning' | 'info';
  order: number;
  fields: any[];
}

function extractSections(fields: any[]): SectionData[] {
  const map = new Map<string, SectionData>();

  fields.forEach((field) => {
    const opts = (field.options as any) || {};
    const sectionOpts = opts.section || {};

    const key = sectionOpts.key || 'default';
    const accent = sectionOpts.accent_color || 'primary';

    if (!map.has(key)) {
      map.set(key, {
        key,
        title: sectionOpts.title || '📌 حقول إضافية',
        icon: sectionOpts.icon || '📌',
        description: sectionOpts.description,
        accentColor: ['primary', 'success', 'warning', 'info'].includes(accent) ? accent : 'primary',
        order: sectionOpts.order ?? 9999,
        fields: [],
      });
    }

    map.get(key)!.fields.push(field);
  });

  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

function validateIndicatorGroups(
  fields: any[],
  formData: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};

  fields.forEach((field) => {
    if (field.field_type !== 'indicator_group') return;

    const opts = (field.options as any) || {};
    const indicators = (opts.indicators as Array<{ num: number; text: string }>) || [];

    if (indicators.length === 0) return;

    const value = formData[field.field_key];
    const valueMap = value && typeof value === 'object' ? (value as Record<string, string>) : {};

    const answered = indicators.filter(
      (ind) => valueMap[String(ind.num)] && valueMap[String(ind.num)] !== ''
    ).length;

    if (answered < indicators.length) {
      errors[field.field_key] = `يجب تقييم جميع المؤشرات (${answered}/${indicators.length})`;
    }
  });

  return errors;
}

export function EditReportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { activeEntity } = useEntityStore();
  const {
    currentReport,
    loading,
    saving,
    error,
    loadReportById,
    updateReport,
    clearCurrentReport,
  } = useReportsStore();

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  const [needsPeriod, setNeedsPeriod] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  
  const [loadingManager, setLoadingManager] = useState(false);
  const prevCenterIdRef = useRef<string>('');
  const prevEntityIdRef = useRef<string>(activeEntity?.entityId || '');

  // 1. Load report
  useEffect(() => {
    if (id) {
      loadReportById(id);
    }

    return () => {
      clearCurrentReport();
      setInitialized(false);
      setFormData({});
      setErrors({});
    };
  }, [id, loadReportById, clearCurrentReport]);

  // 2. إغلاق صفحة التعديل عند تغيير الكيان
  useEffect(() => {
    const currentEntityId = activeEntity?.entityId || '';
    if (!prevEntityIdRef.current) {
      prevEntityIdRef.current = currentEntityId;
      return;
    }
    if (prevEntityIdRef.current !== currentEntityId) {
      prevEntityIdRef.current = currentEntityId;
      navigate('/reports', { replace: true });
    }
  }, [activeEntity?.entityId, navigate]);

  // 3. Initialize form data
  useEffect(() => {
    if (currentReport && !initialized) {
      setFormData(currentReport.data || {});

      const hasPeriod = !!(
        currentReport.period_type ||
        currentReport.period_start ||
        currentReport.period_end
      );

      setNeedsPeriod(hasPeriod);
      setPeriodType(currentReport.period_type || 'weekly');
      setPeriodStart(currentReport.period_start || '');
      setPeriodEnd(currentReport.period_end || '');

      // تهيئة prevCenterIdRef بالمركز الحالي حتى لا يعيد جلب المدير فوراً
      const centerSelectField = currentReport.fields?.find(
        (f: any) => f.field_type === 'center_select' || f.field_type === 'school_select'
      );
      if (centerSelectField) {
        prevCenterIdRef.current = (currentReport.data as any)?.[centerSelectField.field_key] || '';
      }

      setInitialized(true);
    }
  }, [currentReport, initialized]);

  // 4. جلب اسم مدير المركز عند تغيير المركز (مطابق لصفحة الإنشاء)
  useEffect(() => {
    if (!currentReport?.fields || currentReport.fields.length === 0 || !initialized) return;

    const autoFields = currentReport.fields.filter(
      (f: any) =>
        f.field_type === 'auto_filled' &&
        ((f.options as any) || {}).auto_source === 'selected_entity.manager_name'
    );
    if (autoFields.length === 0) return;

    const centerSelectField = currentReport.fields.find(
      (f: any) => f.field_type === 'center_select' || f.field_type === 'school_select'
    );
    if (!centerSelectField) return;

    const centerId = formData[centerSelectField.field_key] as string;

    if (centerId === prevCenterIdRef.current) return;
    prevCenterIdRef.current = centerId || '';

    if (!centerId) {
      setFormData((prev) => {
        const next = { ...prev };
        autoFields.forEach((f: any) => {
          next[f.field_key] = '';
        });
        return next;
      });
      setLoadingManager(false);
      return;
    }

    const fetchSelectedEntity = async () => {
      setLoadingManager(true);
      try {
        const { data, error } = await supabase
          .from('entities')
          .select('contact_info, name_en, name_ar')
          .eq('id', centerId)
          .single();

        if (error) {
          setLoadingManager(false);
          return;
        }

        const contactInfo = (data?.contact_info as any) || {};

        setFormData((prev) => {
          const next = { ...prev };
          autoFields.forEach((f: any) => {
            next[f.field_key] = contactInfo.manager_name || '';
          });
          return next;
        });
      } catch (err) {
        console.error('Error fetching manager:', err);
      } finally {
        setLoadingManager(false);
      }
    };

    fetchSelectedEntity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // ⭐ حماية من الخطأ إذا كان currentReport قيمته null
    currentReport 
      ? formData[
          currentReport.fields?.find(
            (f: any) => f.field_type === 'center_select' || f.field_type === 'school_select'
          )?.field_key || ''
        ]
      : undefined,
    currentReport?.id,
    initialized
  ]);

  const orderedFields = useMemo(() => {
    if (!currentReport?.fields) return [];
    return [...currentReport.fields].sort(
      (a, b) => ((a as any).order_index || 0) - ((b as any).order_index || 0)
    );
  }, [currentReport]);

  const sections = useMemo(() => {
    return extractSections(orderedFields);
  }, [orderedFields]);

  const handleFieldChange = (fieldKey: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));
    if (errors[fieldKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentReport?.fields) {
      currentReport.fields.forEach((field) => {
        const validation = field.validation_rules as { required?: boolean } | undefined;
        if (validation?.required) {
          const value = formData[field.field_key];
          if (value === undefined || value === null || value === '') {
            newErrors[field.field_key] = t('report_form.required_field');
          }
        }
      });

      const indicatorErrors = validateIndicatorGroups(currentReport.fields as any[], formData);
      Object.assign(newErrors, indicatorErrors);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!currentReport || !activeEntity || !user) return;

    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (needsPeriod) {
      if (!periodStart || !periodEnd) {
        setErrors({ _period: t('report_form.period_required') });
        return;
      }

      if (periodStart > periodEnd) {
        setErrors({ _period: t('report_form.date_error') });
        return;
      }
    }

    try {
      await updateReport(currentReport.id, {
        data: formData,
        periodType: needsPeriod ? periodType : null,
        periodStart: needsPeriod ? periodStart : null,
        periodEnd: needsPeriod ? periodEnd : null,
      });

      navigate(`/reports/${currentReport.id}`, { replace: true });
    } catch (err) {
      console.error('❌ Submit error:', err);
    }
  };

  const handleCancel = () => {
    navigate(`/reports/${id}`);
  };

  if (loading || !initialized) {
    return <Loading message={t('report_form.loading_report')} />;
  }

  if (error || !currentReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/reports')}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-2xl font-bold text-text">{t('report_form.edit_title')}</h1>
        </div>

        <Card padding="lg" className="border-danger bg-danger/5">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-danger mb-2">
              {t('report_form.report_not_found')}
            </h2>
            <p className="text-text-secondary mb-6">
              {error || t('report_form.report_not_found_desc')}
            </p>
            <Button
              variant="primary"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/reports')}
            >
              {t('report_form.back_to_list')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const renderField = (field: any) => {
    const fullWidth = isFullWidthField(field);
    const isManagerField =
      field.field_type === 'auto_filled' &&
      ((field.options as any) || {}).auto_source === 'selected_entity.manager_name';

    return (
      <div key={field.id} className={fullWidth ? 'md:col-span-2' : ''}>
        {isManagerField && loadingManager && (
          <div className="mb-1 flex items-center gap-1.5 text-xs text-text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t('report_form.fetching_manager')}</span>
          </div>
        )}
        <DynamicField
          field={{
            id: field.id,
            field_key: field.field_key,
            field_type: field.field_type,
            label_ar: field.label_ar,
            placeholder: (field as any).placeholder,
            help_text: (field as any).help_text,
            options: field.options,
            validation_rules: field.validation_rules,
          }}
          value={formData[field.field_key]}
          onChange={(newValue: unknown) => {
            handleFieldChange(field.field_key, newValue);
          }}
          error={errors[field.field_key]}
          templateCode={currentReport.template?.code}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
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
              ✏️ {t('report_form.edit_title')}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {currentReport.template?.name_ar}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            {t('report_form.cancel')}
          </Button>
          <Button
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSubmit}
            disabled={saving}
            loading={saving}
          >
            {t('report_form.save_changes')}
          </Button>
        </div>
      </div>

      <Card padding="md" className="border-info/30 bg-info/5">
        <div className="flex items-start gap-3">
          <span className="text-lg">ℹ️</span>
          <div className="text-sm text-info">
            <strong>{t('common.note')}:</strong> {t('report_form.save_note')}
          </div>
        </div>
      </Card>

      {(error || errors._period) && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span>{errors._period || error}</span>
          </div>
        </Card>
      )}

      {needsPeriod && (
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-text mb-4">
            {t('report_form.period_section')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                {t('report_form.period_type')}
              </label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="weekly">{t('report_form.weekly')}</option>
                <option value="biweekly">{t('report_form.biweekly')}</option>
                <option value="monthly">{t('report_form.monthly')}</option>
                <option value="custom">{t('report_form.custom')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                {t('report_form.from_date')} <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                {t('report_form.to_date')} <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <FormSection
            key={section.key}
            title={section.title}
            icon={section.icon}
            description={section.description}
            accentColor={section.accentColor}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {section.fields.map(renderField)}
            </div>
          </FormSection>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={handleCancel}>
          {t('report_form.cancel')}
        </Button>
        <Button
          variant="primary"
          size="lg"
          icon={<Save className="w-5 h-5" />}
          onClick={handleSubmit}
          disabled={saving}
          loading={saving}
        >
          {t('report_form.save_changes')}
        </Button>
      </div>
    </div>
  );
}

export default EditReportPage;