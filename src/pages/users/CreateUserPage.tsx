import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save, UserPlus } from 'lucide-react';
import { useUsersStore } from '../../stores/users-store';
import { createUser, listEntitiesByType } from '../../lib/users-api';
import { getAllowedEntityTypes } from '../../lib/role-entity-types';
import { Button, Card } from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import type { Entity } from '../../types/users';

// ================================================
// Component
// ================================================

export function CreateUserPage() {
  const navigate = useNavigate();
  const { roles, loadRoles } = useUsersStore();

  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    full_name: '',
    phone: '',
    role_id: '',
    entity_id: '',
  });

  const [availableEntities, setAvailableEntities] = useState<Entity[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // ================================================
  // Effects
  // ================================================

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // ⭐ عندما يتغير الدور → جلب الكيانات المسموحة فقط
  useEffect(() => {
    if (!form.role_id) {
      setAvailableEntities([]);
      return;
    }

    const role = roles.find((r) => r.id === form.role_id);
    if (!role) return;

    const allowedTypes = getAllowedEntityTypes(role.code);
    if (allowedTypes.length === 0) {
      setAvailableEntities([]);
      return;
    }

    const fetchEntities = async () => {
      setLoadingEntities(true);
      try {
        // جلب كل الأنواع المسموحة
        const all: Entity[] = [];
        for (const typeCode of allowedTypes) {
          const list = await listEntitiesByType(typeCode);
          all.push(...list);
        }
        setAvailableEntities(all);

        // إعادة تعيين الكيان إذا لم يكن في القائمة الجديدة
        if (form.entity_id && !all.find((e) => e.id === form.entity_id)) {
          setForm((f) => ({ ...f, entity_id: '' }));
        }
      } catch (err) {
        console.error('Failed to load entities:', err);
      } finally {
        setLoadingEntities(false);
      }
    };

    fetchEntities();
  }, [form.role_id, roles, form.entity_id]);

  // ================================================
  // Options for SearchableSelect
  // ================================================

  const entityOptions = useMemo(
    () =>
      availableEntities.map((e) => ({
        value: e.id,
        label: e.name_ar,
        sublabel:
          e.entity_type_name && e.entity_type_name !== 'منطقة'
            ? e.entity_type_name
            : undefined,
        icon: getEntityIcon(e.entity_type_code),
      })),
    [availableEntities]
  );

  // ================================================
  // Handlers
  // ================================================

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!form.email.trim()) e.email = 'البريد مطلوب';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'بريد غير صالح';

    if (!form.username.trim()) e.username = 'اسم المستخدم مطلوب';
    else if (!/^[a-zA-Z0-9_.-]+$/.test(form.username))
      e.username = 'حروف إنجليزية، أرقام، _ . - فقط';

    if (!form.password) e.password = 'كلمة المرور مطلوبة';
    else if (form.password.length < 8)
      e.password = 'كلمة المرور 8 أحرف على الأقل';

    if (!form.full_name.trim()) e.full_name = 'الاسم الكامل مطلوب';
    if (!form.role_id) e.role_id = 'الدور مطلوب';
    if (!form.entity_id) e.entity_id = 'الكيان مطلوب';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setServerError(null);

    try {
      const { userId } = await createUser({
        email: form.email,
        password: form.password,
        username: form.username,
        full_name: form.full_name,
        phone: form.phone || undefined,
        role_id: form.role_id,
        entity_id: form.entity_id,
      });

      navigate(`/admin/users/${userId}`, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء المستخدم';
      setServerError(msg);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ================================================
  // Render
  // ================================================

  const baseInput = (hasError: boolean) =>
    `w-full px-4 py-2.5 rounded-lg border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
      hasError ? 'border-danger' : 'border-border'
    }`;

  const selectedRole = roles.find((r) => r.id === form.role_id);
  const allowedTypeNames = selectedRole
    ? getAllowedEntityTypes(selectedRole.code)
        .map(getEntityTypeName)
        .join('، ')
    : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-primary" />
              إضافة مستخدم جديد
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              أدخل بيانات المستخدم والدور
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
          إنشاء المستخدم
        </Button>
      </div>

      {/* Server Error */}
      {serverError && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span>{serverError}</span>
          </div>
        </Card>
      )}

      {/* Basic Info */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-text mb-4">
          📋 المعلومات الأساسية
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              البريد الإلكتروني <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="user@edc.ps"
              className={baseInput(!!errors.email)}
              dir="ltr"
            />
            {errors.email && (
              <p className="text-sm text-danger mt-1">⚠️ {errors.email}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              اسم المستخدم <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              placeholder="user_name"
              className={baseInput(!!errors.username)}
              dir="ltr"
            />
            {errors.username && (
              <p className="text-sm text-danger mt-1">
                ⚠️ {errors.username}
              </p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الاسم الكامل <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              placeholder="الاسم الكامل"
              className={baseInput(!!errors.full_name)}
            />
            {errors.full_name && (
              <p className="text-sm text-danger mt-1">
                ⚠️ {errors.full_name}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الهاتف
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+970..."
              className={baseInput(false)}
              dir="ltr"
            />
          </div>

          {/* Password */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text mb-2">
              كلمة المرور المؤقتة <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="8 أحرف على الأقل"
              className={baseInput(!!errors.password)}
              dir="ltr"
            />
            {errors.password && (
              <p className="text-sm text-danger mt-1">
                ⚠️ {errors.password}
              </p>
            )}
            <p className="text-xs text-text-muted mt-1">
              سيُطلب من المستخدم تغييرها عند أول دخول
            </p>
          </div>
        </div>
      </Card>

      {/* Role & Entity */}
      <Card padding="lg">
        <h3 className="text-lg font-semibold text-text mb-4">
          🎭 الدور والكيان
        </h3>

        <div className="space-y-4">
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الدور <span className="text-danger">*</span>
            </label>
            <select
              value={form.role_id}
              onChange={(e) => update('role_id', e.target.value)}
              className={baseInput(!!errors.role_id)}
            >
              <option value="">— اختر دور —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name_ar}
                </option>
              ))}
            </select>
            {errors.role_id && (
              <p className="text-sm text-danger mt-1">
                ⚠️ {errors.role_id}
              </p>
            )}
          </div>

          {/* Entity — SearchableSelect */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              الكيان <span className="text-danger">*</span>
            </label>
            {!form.role_id ? (
              <div className="px-4 py-3 rounded-lg border border-border bg-bg-secondary text-text-muted text-sm">
                اختر الدور أولاً ليتم عرض الكيانات المتاحة
              </div>
            ) : loadingEntities ? (
              <div className="px-4 py-3 rounded-lg border border-border bg-bg-secondary text-text-muted text-sm">
                جاري تحميل الكيانات...
              </div>
            ) : entityOptions.length === 0 ? (
              <div className="px-4 py-3 rounded-lg border border-warning bg-warning/5 text-warning text-sm">
                ⚠️ لا توجد كيانات متاحة لهذا الدور
              </div>
            ) : (
              <SearchableSelect
                options={entityOptions}
                value={form.entity_id}
                onChange={(v) => update('entity_id', v)}
                placeholder={`ابحث في ${allowedTypeNames}...`}
                hasError={!!errors.entity_id}
                emptyMessage="لا توجد نتائج مطابقة"
              />
            )}
            {errors.entity_id && (
              <p className="text-sm text-danger mt-1">
                ⚠️ {errors.entity_id}
              </p>
            )}
            {allowedTypeNames && (
              <p className="text-xs text-text-muted mt-1">
                💡 نوع الكيان المتاح: {allowedTypeNames}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={() => navigate('/admin/users')}>
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
          إنشاء المستخدم
        </Button>
      </div>
    </div>
  );
}

// ================================================
// Helpers
// ================================================

function getEntityIcon(entityTypeCode: string | null): string {
  switch (entityTypeCode) {
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

function getEntityTypeName(typeCode: string): string {
  const names: Record<string, string> = {
    region: 'منطقة',
    school: 'مدرسة',
    tls_center: 'مركز تطوير',
    edu_unit: 'وحدة تربوية',
    edc: 'مركز التطوير',
    qa_unit: 'وحدة ضمان الجودة',
  };
  return names[typeCode] || typeCode;
}