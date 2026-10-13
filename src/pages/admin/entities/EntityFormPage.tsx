import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Save,
  Building2,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useEntitiesStore } from '../../../stores/entities-store';
import { Button, Card } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import * as api from '../../../lib/entities-api';
import type {
  ContactInfo,
  CreateEntityPayload,
  UpdateEntityPayload,
} from '../../../types/entities';

// ================================================
// Helpers
// ================================================

function getEntityIcon(typeCode: string | null | undefined): string {
  switch (typeCode) {
    case 'region':
      return '🗺️';
    case 'school':
      return '🏫';
    case 'tls_center':
      return '🏢';
    case 'edu_unit':
      return '📚';
    case 'edc':
      return '🏛️';
    case 'qa_unit':
      return '✅';
    default:
      return '📍';
  }
}

// ================================================
// Types
// ================================================

interface FormState {
  entity_type_id: string;
  parent_id: string;
  code: string;
  name_ar: string;
  name_en: string;
  address: string;
  manager_name: string;
  contact_phone: string;
  contact_email: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  entity_type_id: '',
  parent_id: '',
  code: '',
  name_ar: '',
  name_en: '',
  address: '',
  manager_name: '',
  contact_phone: '',
  contact_email: '',
  is_active: true,
};

// ================================================
// Component
// ================================================

export function EntityFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const {
    entityTypes,
    selectedEntity,
    loadingDetail,
    saving,
    error,
    loadEntityTypes,
    loadEntityById,
    updateEntity,
    clearSelectedEntity,
    clearError,
  } = useEntitiesStore();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [potentialParents, setPotentialParents] = useState<
    { id: string; name_ar: string; entity_type_code: string | null }[]
  >([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [codeTaken, setCodeTaken] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);

  // ================================================
  // Effects
  // ================================================

  useEffect(() => {
    loadEntityTypes();
  }, [loadEntityTypes]);

  useEffect(() => {
    if (isEdit && id && id !== 'undefined') {
      loadEntityById(id);
    }
    return () => {
      if (isEdit) clearSelectedEntity();
    };
  }, [id, isEdit, loadEntityById, clearSelectedEntity]);

  useEffect(() => {
    if (isEdit && selectedEntity) {
      const ci = selectedEntity.contact_info || {};
      setForm({
        entity_type_id: selectedEntity.entity_type_id || '',
        parent_id: selectedEntity.parent_id || '',
        code: selectedEntity.code || '',
        name_ar: selectedEntity.name_ar || '',
        name_en: selectedEntity.name_en || '',
        address: selectedEntity.address || '',
        manager_name: ci.manager_name ? String(ci.manager_name) : '',
        contact_phone: ci.phone ? String(ci.phone) : '',
        contact_email: ci.email ? String(ci.email) : '',
        is_active: selectedEntity.is_active ?? true,
      });
    }
  }, [isEdit, selectedEntity]);

  useEffect(() => {
    if (!form.entity_type_id) {
      setPotentialParents([]);
      return;
    }

    const type = entityTypes.find((t) => t.id === form.entity_type_id);
    if (!type) return;

    const fetchParents = async () => {
      setLoadingParents(true);
      try {
        const parents = await api.listPotentialParents(type.code);
        setPotentialParents(parents);

        if (form.parent_id && !parents.find((p) => p.id === form.parent_id)) {
          setForm((f) => ({ ...f, parent_id: '' }));
        }
      } catch (err) {
        console.error('Failed to load parents:', err);
      } finally {
        setLoadingParents(false);
      }
    };

    fetchParents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.entity_type_id, entityTypes]);

  useEffect(() => {
    if (!form.code.trim()) {
      setCodeTaken(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingCode(true);
      try {
        const taken = await api.isCodeTaken(
          form.code,
          isEdit ? id : undefined
        );
        setCodeTaken(taken);
      } catch {
        setCodeTaken(false);
      } finally {
        setCheckingCode(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.code, id, isEdit]);

  // ================================================
  // Handlers
  // ================================================

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
    if (!form.entity_type_id) e.entity_type_id = 'النوع مطلوب';

    if (form.contact_email && !/^\S+@\S+\.\S+$/.test(form.contact_email)) {
      e.contact_email = 'بريد إلكتروني غير صالح';
    }

    if (codeTaken) {
      e.code = 'الكود مستخدم بالفعل';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const contactInfo: ContactInfo = {};
    if (form.manager_name.trim())
      contactInfo.manager_name = form.manager_name.trim();
    if (form.contact_phone.trim())
      contactInfo.phone = form.contact_phone.trim();
    if (form.contact_email.trim())
      contactInfo.email = form.contact_email.trim();

    try {
      if (isEdit && id) {
        const payload: UpdateEntityPayload = {
          entity_type_id: form.entity_type_id,
          parent_id: form.parent_id || null,
          code: form.code.trim() || null,
          name_ar: form.name_ar.trim(),
          name_en: form.name_en.trim() || null,
          address: form.address.trim() || null,
          contact_info: contactInfo,
          is_active: form.is_active,
        };
        await updateEntity(id, payload);
        navigate(`/admin/entities/${id}`, { replace: true });
      } else {
        // ⭐ للإنشاء — استدعاء API مباشر لضمان الحصول على ID
        const payload: CreateEntityPayload = {
          entity_type_id: form.entity_type_id,
          parent_id: form.parent_id || null,
          code: form.code.trim() || null,
          name_ar: form.name_ar.trim(),
          name_en: form.name_en.trim() || null,
          region_id: null,
          address: form.address.trim() || null,
          contact_info: contactInfo,
          metadata: {},
          is_active: form.is_active,
        };

        const result = await api.createEntity(payload);

        // ⭐ تحقق صريح من ID
        if (!result || !result.id) {
          console.error('❌ Invalid result from createEntity:', result);
          alert('تم الإنشاء لكن حدث خطأ في المعرّف. العودة للقائمة.');
          navigate('/admin/entities', { replace: true });
          return;
        }

        console.log('✅ Navigating to entity:', result.id);
        navigate(`/admin/entities/${result.id}`, { replace: true });
      }
    } catch (err: any) {
      console.error('❌ Submit error:', {
        message: err?.message,
        details: err?.details,
        code: err?.code,
      });

      let errorMsg = 'فشل إنشاء الكيان';
      if (err?.code === '23505') {
        errorMsg = '⚠️ هذا الكيان موجود بالفعل (تكرار)';
      } else if (err?.code === '23503') {
        errorMsg = '⚠️ الكيان الأب غير صالح';
      } else if (err?.code === '42501') {
        errorMsg = '⚠️ ليس لديك صلاحية لإنشاء كيانات';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      alert(errorMsg);
    }
  };

  // ================================================
  // Helpers
  // ================================================

  const selectedType = useMemo(
    () => entityTypes.find((t) => t.id === form.entity_type_id),
    [entityTypes, form.entity_type_id]
  );

  const requiresParent = useMemo(() => {
    if (!selectedType) return false;
    return selectedType.code !== 'edc';
  }, [selectedType]);

  const parentTypeLabel = useMemo(() => {
    if (!selectedType) return '';
    switch (selectedType.code) {
      case 'edu_unit':
      case 'qa_unit':
      case 'region':
        return 'مركز التطوير التربوي (EDC)';
      case 'school':
      case 'tls_center':
        return 'المنطقة';
      default:
        return '';
    }
  }, [selectedType]);

  const baseInput = (hasError: boolean) =>
    `w-full px-4 py-2.5 rounded-lg border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
      hasError ? 'border-danger' : 'border-border'
    }`;

  // ================================================
  // Render — Loading
  // ================================================

  if (isEdit && loadingDetail) {
    return <Loading message="جاري تحميل الكيان..." />;
  }

  // ================================================
  // Render — Main
  // ================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              navigate(
                isEdit && id ? `/admin/entities/${id}` : '/admin/entities'
              )
            }
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              {isEdit ? (
                <>
                  <Building2 className="w-6 h-6 text-primary" />
                  تعديل كيان
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 text-primary" />
                  إضافة كيان جديد
                </>
              )}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {isEdit ? 'عدّل بيانات الكيان' : 'أدخل بيانات الكيان الجديد'}
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
          {isEdit ? 'حفظ التعديلات' : 'إنشاء الكيان'}
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
          {/* Name AR */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الاسم (عربي) <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.name_ar}
              onChange={(e) => update('name_ar', e.target.value)}
              placeholder="مثال: مدرسة الأمل"
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
              placeholder="Example: Al-Amal School"
              className={baseInput(false)}
              dir="ltr"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الكود
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.code}
                onChange={(e) => update('code', e.target.value)}
                placeholder="مثال: SCH-001"
                className={`${baseInput(!!errors.code || codeTaken)} ${
                  codeTaken ? 'border-danger' : ''
                }`}
                dir="ltr"
              />
              {checkingCode && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!checkingCode && form.code.trim() && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {codeTaken ? (
                    <XCircle className="w-5 h-5 text-danger" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  )}
                </div>
              )}
            </div>
            {errors.code && (
              <p className="text-sm text-danger mt-1">⚠️ {errors.code}</p>
            )}
            {!errors.code && codeTaken && (
              <p className="text-sm text-danger mt-1">
                ⚠️ الكود مستخدم بالفعل
              </p>
            )}
            {!errors.code && !codeTaken && form.code.trim() && (
              <p className="text-sm text-success mt-1">✅ الكود متاح</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              النوع <span className="text-danger">*</span>
            </label>
            <select
              value={form.entity_type_id}
              onChange={(e) => update('entity_type_id', e.target.value)}
              className={baseInput(!!errors.entity_type_id)}
              disabled={isEdit}
            >
              <option value="">— اختر النوع —</option>
              {entityTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {getEntityIcon(t.code)} {t.name_ar}
                </option>
              ))}
            </select>
            {errors.entity_type_id && (
              <p className="text-sm text-danger mt-1">
                ⚠️ {errors.entity_type_id}
              </p>
            )}
            {isEdit && (
              <p className="text-xs text-text-muted mt-1">
                💡 لا يمكن تغيير النوع بعد الإنشاء
              </p>
            )}
          </div>

          {/* Parent */}
          {requiresParent && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text mb-2">
                الكيان الأب{' '}
                {parentTypeLabel && (
                  <span className="text-xs text-text-muted font-normal">
                    ({parentTypeLabel})
                  </span>
                )}
              </label>
              {loadingParents ? (
                <div className="px-4 py-3 rounded-lg border border-border bg-bg-secondary text-text-muted text-sm">
                  جاري تحميل الآباء...
                </div>
              ) : potentialParents.length === 0 ? (
                <div className="px-4 py-3 rounded-lg border border-warning bg-warning/5 text-warning text-sm">
                  ⚠️ لا توجد كيانات آباء متاحة — أضف الأب أولاً
                </div>
              ) : (
                <select
                  value={form.parent_id}
                  onChange={(e) => update('parent_id', e.target.value)}
                  className={baseInput(false)}
                >
                  <option value="">— اختر الكيان الأب —</option>
                  {potentialParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getEntityIcon(p.entity_type_code)} {p.name_ar}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-text-muted mt-1">
                💡 الفلترة في صفحة الكيانات تعتمد على هذا الحقل
              </p>
            </div>
          )}

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text mb-2">
              العنوان
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="مثال: غزة - الرمال - شارع عمر المختار"
              className={baseInput(false)}
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
                كيان نشط (يظهر في القوائم)
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Section 2: Contact Info */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-text mb-4">
          📞 معلومات التواصل
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Manager Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text mb-2">
              اسم مدير الكيان
            </label>
            <input
              type="text"
              value={form.manager_name}
              onChange={(e) => update('manager_name', e.target.value)}
              placeholder="مثال: أحمد محمد"
              className={baseInput(false)}
            />
            <p className="text-xs text-text-muted mt-1">
              💡 يُستخدم في التعبئة التلقائية داخل التقارير
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الهاتف
            </label>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => update('contact_phone', e.target.value)}
              placeholder="+970..."
              className={baseInput(false)}
              dir="ltr"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => update('contact_email', e.target.value)}
              placeholder="contact@example.com"
              className={baseInput(!!errors.contact_email)}
              dir="ltr"
            />
            {errors.contact_email && (
              <p className="text-sm text-danger mt-1">
                ⚠️ {errors.contact_email}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={() =>
            navigate(
              isEdit && id ? `/admin/entities/${id}` : '/admin/entities'
            )
          }
        >
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
          {isEdit ? 'حفظ التعديلات' : 'إنشاء الكيان'}
        </Button>
      </div>
    </div>
  );
}