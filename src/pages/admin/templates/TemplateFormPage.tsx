import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Save,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react';
import { useTemplatesAdminStore } from '../../../stores/templates-admin-store';
import { Button, Card } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import * as api from '../../../lib/templates-admin-api';
import type {
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from '../../../types/templates-admin';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface FormState {
  code: string;
  name_ar: string;
  name_en: string;
  description: string;
  category_id: string;
  entity_type_id: string;
  creator_role_id: string;
  report_kind: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  code: '',
  name_ar: '',
  name_en: '',
  description: '',
  category_id: '',
  entity_type_id: '',
  creator_role_id: '',
  report_kind: '',
  is_active: true,
};

// ⭐ قيم report_kind المسموحة (من DB constraint)
const REPORT_KIND_OPTIONS = [
  { value: '', label: '— بدون —' },
  { value: 'visit', label: 'زيارة' },
  { value: 'aggregate', label: 'تجميعي' },
];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function TemplateFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const {
    categories,
    roles,
    entityTypes,
    selectedTemplate,
    loadingDetail,
    saving,
    error,
    loadCategories,
    loadRoles,
    loadEntityTypes,
    loadTemplateById,
    createTemplate,
    updateTemplate,
    clearSelectedTemplate,
    clearError,
  } = useTemplatesAdminStore();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  // ═══════════════════════════════════════════
  // Effects
  // ═══════════════════════════════════════════

  useEffect(() => {
    loadCategories();
    loadRoles();
    loadEntityTypes();
  }, [loadCategories, loadRoles, loadEntityTypes]);

  // ⭐ تحميل القالب عند التعديل
  useEffect(() => {
    if (isEdit && id) {
      loadTemplateById(id);
    }
    return () => {
      if (isEdit) clearSelectedTemplate();
    };
  }, [id, isEdit, loadTemplateById, clearSelectedTemplate]);

  // ⭐ ملء النموذج من البيانات المحمّلة
  useEffect(() => {
    if (isEdit && selectedTemplate) {
      setForm({
        code: selectedTemplate.code || '',
        name_ar: selectedTemplate.name_ar || '',
        name_en: selectedTemplate.name_en || '',
        description: selectedTemplate.description || '',
        category_id: selectedTemplate.category_id || '',
        entity_type_id: selectedTemplate.entity_type_id || '',
        creator_role_id: selectedTemplate.creator_role_id || '',
        report_kind: selectedTemplate.report_kind || '',
        is_active: selectedTemplate.is_active ?? true,
      });
    }
  }, [isEdit, selectedTemplate]);

  // ⭐ فحص الكود (debounced) — فقط عند الإضافة
  useEffect(() => {
    if (isEdit) return;
    if (!form.code.trim()) {
      setCodeAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
  setCheckingCode(true);
  try {
    const templates = await api.listTemplates({
      search: form.code.trim(),
      categoryCode: null,
      isActive: null,
    });
    const exists = templates.some(
      (t) => t.code.toLowerCase() === form.code.trim().toLowerCase()
    );
    setCodeAvailable(!exists);
  } catch {
    setCodeAvailable(null);
  } finally {
    setCheckingCode(false);
  }
}, 500);

    return () => clearTimeout(timer);
  }, [form.code, isEdit]);

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

    if (!form.name_ar.trim()) e.name_ar = 'الاسم العربي مطلوب';

    if (!isEdit) {
      if (!form.code.trim()) {
        e.code = 'الكود مطلوب';
      } else if (!/^[a-z0-9_]+$/.test(form.code.trim())) {
        e.code = 'الكود يجب أن يكون حروف إنجليزية صغيرة وأرقام و _ فقط';
      } else if (codeAvailable === false) {
        e.code = 'الكود مستخدم بالفعل';
      }
    }

    if (!form.category_id) e.category_id = 'الفئة مطلوبة';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      if (isEdit && id) {
        const payload: UpdateTemplatePayload = {
          name_ar: form.name_ar.trim(),
          name_en: form.name_en.trim() || null,
          description: form.description.trim() || null,
          category_id: form.category_id,
          entity_type_id: form.entity_type_id || null,
          creator_role_id: form.creator_role_id || null,
          report_kind: form.report_kind || null,
          is_active: form.is_active,
        };
        await updateTemplate(id, payload);
        navigate(`/settings/templates`, { replace: true });
      } else {
        const payload: CreateTemplatePayload = {
          code: form.code.trim().toLowerCase(),
          name_ar: form.name_ar.trim(),
          name_en: form.name_en.trim() || null,
          description: form.description.trim() || null,
          category_id: form.category_id,
          entity_type_id: form.entity_type_id || null,
          creator_role_id: form.creator_role_id || null,
          report_kind: form.report_kind || null,
          is_active: form.is_active,
        };
        const newId = await createTemplate(payload);
        navigate(`/settings/templates/${newId}`, { replace: true });
      }
    } catch (err) {
      console.error('❌ Submit error:', err);
    }
  };

  const handleCancel = () => {
    navigate('/settings/templates');
  };

  // ═══════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════

  const baseInput = (hasError: boolean) =>
    `w-full px-4 py-2.5 rounded-lg border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
      hasError ? 'border-danger' : 'border-border'
    }`;

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === form.category_id),
    [categories, form.category_id]
  );

  // ═══════════════════════════════════════════
  // Render — Loading (Edit only)
  // ═══════════════════════════════════════════

  if (isEdit && loadingDetail) {
    return <Loading message="جاري تحميل القالب..." />;
  }

  // ═══════════════════════════════════════════
  // Render — Main
  // ═══════════════════════════════════════════

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
                  <FileText className="w-6 h-6 text-primary" />
                  تعديل القالب
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 text-primary" />
                  إضافة قالب جديد
                </>
              )}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {isEdit ? 'عدّل بيانات القالب' : 'أدخل بيانات القالب الجديد'}
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
          {isEdit ? 'حفظ التعديلات' : 'إنشاء القالب'}
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

      {/* Section 1: Basic Info */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-text mb-4">
          📋 المعلومات الأساسية
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الكود <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.code}
                onChange={(e) =>
                  update('code', e.target.value.toLowerCase())
                }
                placeholder="مثال: specialist_tls_visit"
                className={`${baseInput(
                  !!errors.code || codeAvailable === false
                )} ${codeAvailable === false ? 'border-danger' : ''}`}
                dir="ltr"
                disabled={isEdit}
              />
              {!isEdit && checkingCode && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!isEdit && !checkingCode && form.code.trim() && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {codeAvailable === false ? (
                    <XCircle className="w-5 h-5 text-danger" />
                  ) : codeAvailable === true ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : null}
                </div>
              )}
            </div>
            {errors.code && (
              <p className="text-sm text-danger mt-1">⚠️ {errors.code}</p>
            )}
            {!errors.code &&
              !isEdit &&
              codeAvailable === false &&
              form.code.trim() && (
                <p className="text-sm text-danger mt-1">
                  ⚠️ الكود مستخدم بالفعل
                </p>
              )}
            {!errors.code &&
              !isEdit &&
              codeAvailable === true &&
              form.code.trim() && (
                <p className="text-sm text-success mt-1">✅ الكود متاح</p>
              )}
            {isEdit && (
              <p className="text-xs text-text-muted mt-1">
                💡 لا يمكن تغيير الكود بعد الإنشاء
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الفئة <span className="text-danger">*</span>
            </label>
            <select
              value={form.category_id}
              onChange={(e) => update('category_id', e.target.value)}
              className={baseInput(!!errors.category_id)}
            >
              <option value="">— اختر الفئة —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon || '📁'} {c.name_ar}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-sm text-danger mt-1">
                ⚠️ {errors.category_id}
              </p>
            )}
          </div>

          {/* Name AR */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الاسم (عربي) <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.name_ar}
              onChange={(e) => update('name_ar', e.target.value)}
              placeholder="مثال: زيارة مختص تربوي TLS"
              className={baseInput(!!errors.name_ar)}
            />
            {errors.name_ar && (
              <p className="text-sm text-danger mt-1">⚠️ {errors.name_ar}</p>
            )}
          </div>

          {/* Name EN */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الاسم (إنجليزي)
            </label>
            <input
              type="text"
              value={form.name_en}
              onChange={(e) => update('name_en', e.target.value)}
              placeholder="Example: Specialist TLS Visit"
              className={baseInput(false)}
              dir="ltr"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text mb-2">
              الوصف
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="وصف مختصر للقالب..."
              rows={3}
              className={`${baseInput(false)} resize-y`}
            />
          </div>

          {/* Active */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update('is_active', e.target.checked)}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-text">
                قالب نشط (يظهر للمستخدمين)
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Section 2: Advanced Settings */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-text mb-4">
          ⚙️ إعدادات متقدمة
          <span className="text-xs text-text-muted font-normal mr-2">
            (اختيارية)
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Entity Type */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              نوع الكيان المرتبط
            </label>
            <select
              value={form.entity_type_id}
              onChange={(e) => update('entity_type_id', e.target.value)}
              className={baseInput(false)}
            >
              <option value="">— بدون قيد —</option>
              {entityTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon || '📍'} {t.name_ar}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              💡 لربط القالب بكيان محدد (مدرسة، مركز، ...)
            </p>
          </div>

          {/* Creator Role */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الدور المُنشئ
            </label>
            <select
              value={form.creator_role_id}
              onChange={(e) => update('creator_role_id', e.target.value)}
              className={baseInput(false)}
            >
              <option value="">— أي دور —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name_ar}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              💡 من يستطيع استخدام هذا القالب
            </p>
          </div>

          {/* Report Kind */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text mb-2">
              نوع التقرير
            </label>
            <select
              value={form.report_kind}
              onChange={(e) => update('report_kind', e.target.value)}
              className={baseInput(false)}
            >
              {REPORT_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              💡 يُستخدم للتصنيف الداخلي
            </p>
          </div>
        </div>
      </Card>

      {/* Info Banner (Edit Mode) */}
      {isEdit && selectedTemplate && (
        <Card padding="md" className="border-info/30 bg-info/5">
          <div className="flex items-start gap-3 text-sm">
            <span className="text-lg">ℹ️</span>
            <div className="flex-1 text-info">
              <strong>ملاحظات:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  • عدد الحقول:{' '}
                  <strong>{selectedTemplate.fields_count ?? 0}</strong>
                </li>
                <li>
                  • عدد التقارير:{' '}
                  <strong>{selectedTemplate.reports_count ?? 0}</strong>
                </li>
                <li>
                  • النسخة الحالية:{' '}
                  <strong>
                    v{selectedTemplate.current_version?.version_number || '—'}
                  </strong>
                </li>
              </ul>
              <p className="text-xs text-text-muted mt-2">
                💡 لإدارة الحقول، افتح تفاصيل القالب.
              </p>
            </div>
          </div>
        </Card>
      )}

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
          {isEdit ? 'حفظ التعديلات' : 'إنشاء القالب'}
        </Button>
      </div>
    </div>
  );
}