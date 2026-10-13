import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Save } from 'lucide-react';
import { useReportsStore } from '../../stores/reports-store';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { DynamicField } from '../../components/reports/DynamicField';
import { FormSection } from '../../components/reports/FormSection';
import type { PeriodType } from '../../types/database.types';

// ================================================
// Helpers
// ================================================

// ⭐ هل الحقل يأخذ عرض كامل؟
function isFullWidthField(field: any): boolean {
  // indicator_group + textarea دائماً عمودان
  if (['indicator_group', 'textarea'].includes(field.field_type)) {
    return true;
  }

  // ⭐ التحكم من options.full_width (يُدار من Settings)
  const opts = (field.options as any) || {};
  if (opts.full_width === true) {
    return true;
  }

  return false;
}

// ⭐ استخراج الأقسام ديناميكياً من options.section
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
        accentColor: ['primary', 'success', 'warning', 'info'].includes(
          accent
        )
          ? accent
          : 'primary',
        order: sectionOpts.order ?? 9999,
        fields: [],
      });
    }

    map.get(key)!.fields.push(field);
  });

  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

// ================================================
// Component
// ================================================

export function EditReportPage() {
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

  // ================================================
  // Effects
  // ================================================

  // Load Report
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

  // Initialize Form Data
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

      setInitialized(true);
    }
  }, [currentReport, initialized]);

  // ⭐ Ordered Fields — من order_index فقط (ديناميكي)
  const orderedFields = useMemo(() => {
    if (!currentReport?.fields) return [];
    return [...currentReport.fields].sort(
      (a, b) => ((a as any).order_index || 0) - ((b as any).order_index || 0)
    );
  }, [currentReport]);

  // ⭐ Sections — مستخرجة تلقائياً من options.section
  const sections = useMemo(() => {
    return extractSections(orderedFields);
  }, [orderedFields]);

  // ================================================
  // Handlers
  // ================================================

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
        const validation = field.validation_rules as
          | { required?: boolean }
          | undefined;
        if (validation?.required) {
          const value = formData[field.field_key];
          if (value === undefined || value === null || value === '') {
            newErrors[field.field_key] = 'هذا الحقل مطلوب';
          }
        }
      });
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
        setErrors({ _period: 'الرجاء تحديد فترة التقرير' });
        return;
      }

      if (periodStart > periodEnd) {
        setErrors({
          _period: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية',
        });
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

  // ================================================
  // Render — Loading
  // ================================================

  if (loading || !initialized) {
    return <Loading message="جاري تحميل التقرير..." />;
  }

  // ================================================
  // Render — Error
  // ================================================

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
          <h1 className="text-2xl font-bold text-text">تعديل التقرير</h1>
        </div>

        <Card padding="lg" className="border-danger bg-danger/5">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-danger mb-2">
              لم يتم العثور على التقرير
            </h2>
            <p className="text-text-secondary mb-6">
              {error || 'التقرير غير موجود أو تم حذفه'}
            </p>
            <Button
              variant="primary"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/reports')}
            >
              العودة إلى التقارير
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ⭐ دالة عرض الحقل
  const renderField = (field: any) => {
    const fullWidth = isFullWidthField(field);
    return (
      <div key={field.id} className={fullWidth ? 'md:col-span-2' : ''}>
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

  // ================================================
  // Render — Edit Form
  // ================================================

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
              ✏️ تعديل التقرير
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {currentReport.template?.name_ar}
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
            disabled={saving}
            loading={saving}
          >
            💾 حفظ التعديلات
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card padding="md" className="border-info/30 bg-info/5">
        <div className="flex items-start gap-3">
          <span className="text-lg">ℹ️</span>
          <div className="text-sm text-info">
            <strong>ملاحظة:</strong> سيتم إنشاء نسخة احتياطية من التقرير
            الحالي قبل الحفظ.
          </div>
        </div>
      </Card>

      {/* Error Banner */}
      {(error || errors._period) && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span>{errors._period || error}</span>
          </div>
        </Card>
      )}

      {/* Period Section — فقط إذا كانت مطلوبة */}
      {needsPeriod && (
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-text mb-4">
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
                  setPeriodType(e.target.value as PeriodType)
                }
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="weekly">أسبوعي</option>
                <option value="biweekly">كل أسبوعين</option>
                <option value="monthly">شهري</option>
                <option value="custom">مخصص</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                من تاريخ <span className="text-danger">*</span>
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
                إلى تاريخ <span className="text-danger">*</span>
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

      {/* ⭐ Sections — ديناميكية */}
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
          disabled={saving}
          loading={saving}
        >
          💾 حفظ التعديلات
        </Button>
      </div>
    </div>
  );
}