import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Save,
  Plus,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import { useTemplatesAdminStore } from '../../../stores/templates-admin-store';
import { Button, Card } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { FieldOptionsEditor } from '../../../components/templates-admin/FieldOptionsEditor';
import { FieldPreview } from '../../../components/templates-admin/FieldPreview';
import type {
  FieldType,
  CreateFieldPayload,
  UpdateFieldPayload,
} from '../../../types/templates-admin';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface FormState {
  field_key: string;
  field_type: FieldType;
  label_ar: string;
  label_en: string;
  placeholder: string;
  help_text: string;
  order_index: number;
  is_required: boolean;
  options: Record<string, unknown>;
}

const EMPTY_FORM: FormState = {
  field_key: '',
  field_type: 'text',
  label_ar: '',
  label_en: '',
  placeholder: '',
  help_text: '',
  order_index: 1,
  is_required: false,
  options: {},
};

// ⭐ Field Types المدعومة
const FIELD_TYPES: Array<{ value: FieldType; label: string; icon: string }> = [
  { value: 'text', label: 'نص', icon: '📝' },
  { value: 'textarea', label: 'نص طويل', icon: '📄' },
  { value: 'number', label: 'رقم', icon: '🔢' },
  { value: 'date', label: 'تاريخ', icon: '📅' },
  { value: 'datetime', label: 'تاريخ ووقت', icon: '🕐' },
  { value: 'select', label: 'قائمة منسدلة', icon: '📋' },
  { value: 'radio', label: 'اختيار واحد', icon: '⚪' },
  { value: 'checkbox', label: 'مربع اختيار', icon: '☑️' },
  { value: 'rating', label: 'تقييم بالنجوم', icon: '⭐' },
  { value: 'auto_filled', label: 'حقل تلقائي', icon: '🔒' },
  { value: 'indicator_group', label: 'مجموعة مؤشرات', icon: '📊' },
  { value: 'subject_select', label: 'اختيار مادة', icon: '📚' },
  { value: 'school_select', label: 'اختيار مدرسة', icon: '🏫' },
  { value: 'center_select', label: 'اختيار مركز', icon: '🏢' },
];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function FieldFormPage() {
  const { id: templateId, fieldId } = useParams<{
    id: string;
    fieldId?: string;
  }>();
  const navigate = useNavigate();
  const isEdit = !!fieldId;

  const {
    selectedTemplate,
    fields,
    saving,
    error,
    loadTemplateById,
    createField,
    updateField,
    clearError,
  } = useTemplatesAdminStore();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ═══════════════════════════════════════════
  // Effects
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (templateId) {
      loadTemplateById(templateId);
    }
  }, [templateId, loadTemplateById]);

  // ⭐ تعبئة النموذج عند التعديل
  useEffect(() => {
    if (isEdit && fieldId && fields.length > 0) {
      const field = fields.find((f) => f.id === fieldId);
      if (field) {
        setForm({
          field_key: field.field_key,
          field_type: field.field_type as FieldType,
          label_ar: field.label_ar,
          label_en: field.label_en || '',
          placeholder: field.placeholder || '',
          help_text: field.help_text || '',
          order_index: field.order_index || 1,
          is_required: !!(field.validation_rules as any)?.required,
          options: (field.options as Record<string, unknown>) || {},
        });
      }
    } else if (!isEdit && fields.length > 0) {
      // ⭐ للجديد: order_index = max + 1
      const maxOrder = Math.max(...fields.map((f) => f.order_index || 0), 0);
      setForm((prev) => ({ ...prev, order_index: maxOrder + 1 }));
    }
  }, [isEdit, fieldId, fields]);

  // ═══════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!form.field_key.trim()) {
      e.field_key = 'مفتاح الحقل مطلوب';
    } else if (!/^[a-z][a-z0-9_]*$/.test(form.field_key.trim())) {
      e.field_key = 'يبدأ بحرف إنجليزي صغير + أحرف/أرقام/_';
    }

    if (!form.label_ar.trim()) e.label_ar = 'الاسم العربي مطلوب';
    if (!form.order_index || form.order_index < 1) {
      e.order_index = 'الترتيب مطلوب';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!selectedTemplate?.current_version_id) {
      alert('القالب لا يحتوي على نسخة صالحة');
      return;
    }

    // ⭐ بناء validation_rules
    const validation_rules: Record<string, unknown> = {};
    if (form.is_required) {
      validation_rules.required = true;
    }

    try {
      if (isEdit && fieldId) {
        const payload: UpdateFieldPayload = {
          field_key: form.field_key.trim(),
          field_type: form.field_type,
          label_ar: form.label_ar.trim(),
          label_en: form.label_en.trim() || null,
          placeholder: form.placeholder.trim() || null,
          help_text: form.help_text.trim() || null,
          validation_rules,
          options: form.options,
          order_index: form.order_index,
        };
        await updateField(fieldId, payload);
      } else {
        const payload: CreateFieldPayload = {
          field_key: form.field_key.trim(),
          field_type: form.field_type,
          label_ar: form.label_ar.trim(),
          label_en: form.label_en.trim() || null,
          placeholder: form.placeholder.trim() || null,
          help_text: form.help_text.trim() || null,
          validation_rules,
          options: form.options,
          order_index: form.order_index,
        };
        await createField(selectedTemplate.current_version_id, payload);
      }

      navigate(`/settings/templates/${templateId}`, { replace: true });
    } catch (err) {
      console.error('❌ Submit error:', err);
    }
  };

  const handleCancel = () => {
    navigate(`/settings/templates/${templateId}`);
  };

  // ═══════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════

  const baseInput = (hasError: boolean) =>
    `w-full px-4 py-2.5 rounded-lg border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
      hasError ? 'border-danger' : 'border-border'
    }`;

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  if (!selectedTemplate) {
    return <Loading message="جاري تحميل القالب..." />;
  }

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
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              {isEdit ? (
                <>
                  <Edit2 className="w-6 h-6 text-primary" />
                  تعديل الحقل
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 text-primary" />
                  إضافة حقل جديد
                </>
              )}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              في قالب: {selectedTemplate.name_ar}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={<Save className="w-4 h-4" />}
          onClick={handleSubmit}
          disabled={saving}
          loading={saving}
        >
          {isEdit ? 'حفظ التعديلات' : 'إنشاء الحقل'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button
              onClick={clearError}
              className="text-danger hover:underline text-xs"
            >
              إغلاق
            </button>
          </div>
        </Card>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* ═══════════ MAIN ═══════════ */}
        <div className="space-y-6 min-w-0">
          {/* Section 1: Basic Info */}
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-text mb-4">
              📋 المعلومات الأساسية
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field Key */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  مفتاح الحقل <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.field_key}
                  onChange={(e) =>
                    update(
                      'field_key',
                      e.target.value.toLowerCase().replace(/\s+/g, '_')
                    )
                  }
                  placeholder="مثال: teacher_name"
                  className={baseInput(!!errors.field_key)}
                  dir="ltr"
                />
                {errors.field_key && (
                  <p className="text-sm text-danger mt-1">
                    ⚠️ {errors.field_key}
                  </p>
                )}
                <p className="text-xs text-text-muted mt-1">
                  💡 يُستخدم في قاعدة البيانات — لا يتغير لاحقاً
                </p>
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  الترتيب <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={form.order_index}
                  onChange={(e) =>
                    update('order_index', Number(e.target.value))
                  }
                  min={1}
                  className={baseInput(!!errors.order_index)}
                />
                {errors.order_index && (
                  <p className="text-sm text-danger mt-1">
                    ⚠️ {errors.order_index}
                  </p>
                )}
              </div>

              {/* Field Type */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text mb-2">
                  نوع الحقل <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {FIELD_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update('field_type', t.value)}
                      className={`p-3 rounded-lg border-2 text-right transition-all ${
                        form.field_type === t.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="text-2xl mb-1">{t.icon}</div>
                      <div className="text-xs font-medium text-text">
                        {t.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Label AR */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  الاسم (عربي) <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.label_ar}
                  onChange={(e) => update('label_ar', e.target.value)}
                  placeholder="مثال: اسم المعلم"
                  className={baseInput(!!errors.label_ar)}
                />
                {errors.label_ar && (
                  <p className="text-sm text-danger mt-1">
                    ⚠️ {errors.label_ar}
                  </p>
                )}
              </div>

              {/* Label EN */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  الاسم (إنجليزي)
                </label>
                <input
                  type="text"
                  value={form.label_en}
                  onChange={(e) => update('label_en', e.target.value)}
                  placeholder="Example: Teacher Name"
                  className={baseInput(false)}
                  dir="ltr"
                />
              </div>

              {/* Placeholder */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text mb-2">
                  نص مؤقت (Placeholder)
                </label>
                <input
                  type="text"
                  value={form.placeholder}
                  onChange={(e) => update('placeholder', e.target.value)}
                  placeholder="نص يظهر داخل الحقل قبل الكتابة"
                  className={baseInput(false)}
                />
              </div>

              {/* Help Text */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text mb-2">
                  نص مساعدة
                </label>
                <input
                  type="text"
                  value={form.help_text}
                  onChange={(e) => update('help_text', e.target.value)}
                  placeholder="نص صغير يظهر أسفل الحقل"
                  className={baseInput(false)}
                />
              </div>

              {/* Required */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-border bg-bg-secondary">
                  <input
                    type="checkbox"
                    checked={form.is_required}
                    onChange={(e) =>
                      update('is_required', e.target.checked)
                    }
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-text">
                    حقل مطلوب <span className="text-danger">*</span>
                  </span>
                </label>
              </div>
            </div>
          </Card>

          {/* Section 2: Options */}
          <Card padding="lg">
            <FieldOptionsEditor
              fieldType={form.field_type}
              value={form.options}
              onChange={(opts) => update('options', opts)}
            />
          </Card>
        </div>

        {/* ═══════════ SIDEBAR ═══════════ */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card padding="lg">
            <FieldPreview
              field={{
                field_key: form.field_key,
                field_type: form.field_type,
                label_ar: form.label_ar || 'اسم الحقل',
                placeholder: form.placeholder,
                help_text: form.help_text,
                validation_rules: form.is_required
                  ? { required: true }
                  : {},
                options: form.options,
              }}
            />
          </Card>
        </aside>
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
          {isEdit ? 'حفظ التعديلات' : 'إنشاء الحقل'}
        </Button>
      </div>
    </div>
  );
}