import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  Save,
  AlertCircle,
  Loader2,
  Info,
  Bell,
  Building2,
  Users,
  Mail,
  Power,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/auth-store';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

interface RuleForm {
  code: string;
  name_ar: string;
  description: string;
  trigger_event: string;
  notification_type_id: string;
  channels: string[];
  priority: string;
  delay_minutes: number;
  is_active: boolean;
  category: string;
  email_template_id: string;
  internal_template_id: string;
  conditions_text: string;
  recipient_config_text: string;
  throttle_window_minutes: number;
  throttle_strategy: string;
  ignore_trivial_edits: boolean;
  trivial_edit_threshold: number;
}

interface NotificationTypeOption {
  id: string;
  code: string;
  name_ar: string;
  category: string | null;
}

interface EmailTemplateOption {
  id: string;
  code: string;
  name_ar: string | null;
}

interface EntityOption {
  id: string;
  name_ar: string;
}

interface RoleOption {
  id: string;
  code: string;
  name_ar: string;
}

const EMPTY_FORM: RuleForm = {
  code: '',
  name_ar: '',
  description: '',
  trigger_event: '',
  notification_type_id: '',
  channels: ['in_app'],
  priority: 'normal',
  delay_minutes: 0,
  is_active: true,
  category: '',
  email_template_id: '',
  internal_template_id: '',
  conditions_text: '{}',
  recipient_config_text: '{\n  "entity_ids": [],\n  "role_ids": [],\n  "user_ids": []\n}',
  throttle_window_minutes: 0,
  throttle_strategy: 'none',
  ignore_trivial_edits: true,
  trivial_edit_threshold: 0,
};

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export function NotificationRuleFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // قوائم مساعدة
  const [notificationTypes, setNotificationTypes] = useState<NotificationTypeOption[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateOption[]>([]);
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  // ── تحميل البيانات ──
  useEffect(() => {
    loadAuxData();
    if (isEdit && id) {
      loadRule(id);
    }
  }, [id, isEdit]);

  async function loadAuxData() {
    try {
      const [typesRes, templatesRes, entitiesRes, rolesRes] = await Promise.all([
        supabase
          .from('notification_types')
          .select('id, code, name_ar, category')
          .eq('is_active', true)
          .order('name_ar'),
        supabase
          .from('email_templates')
          .select('id, code, name_ar')
          .eq('is_active', true)
          .order('name_ar'),
        supabase
          .from('entities')
          .select('id, name_ar')
          .eq('is_active', true)
          .order('name_ar')
          .limit(500),
        supabase
          .from('roles')
          .select('id, code, name_ar')
          .eq('is_active', true)
          .order('name_ar'),
      ]);

      setNotificationTypes((typesRes.data ?? []) as NotificationTypeOption[]);
      setEmailTemplates((templatesRes.data ?? []) as EmailTemplateOption[]);
      setEntities((entitiesRes.data ?? []) as EntityOption[]);
      setRoles((rolesRes.data ?? []) as RoleOption[]);
    } catch (e: any) {
      console.error('Failed to load aux data:', e);
    }
  }

  async function loadRule(ruleId: string) {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('القاعدة غير موجودة');

      const row = data as any;

      setForm({
        code: row.code ?? '',
        name_ar: row.name_ar ?? '',
        description: row.description ?? '',
        trigger_event: row.trigger_event ?? '',
        notification_type_id: row.notification_type_id ?? '',
        channels: Array.isArray(row.channels) ? row.channels : ['in_app'],
        priority: row.priority ?? 'normal',
        delay_minutes: row.delay_minutes ?? 0,
        is_active: row.is_active ?? true,
        category: row.category ?? '',
        email_template_id: row.email_template_id ?? '',
        internal_template_id: row.internal_template_id ?? '',
        conditions_text: JSON.stringify(row.conditions ?? {}, null, 2),
        recipient_config_text: JSON.stringify(row.recipient_config ?? {}, null, 2),
        throttle_window_minutes: row.throttle_window_minutes ?? 0,
        throttle_strategy: row.throttle_strategy ?? 'none',
        ignore_trivial_edits: row.ignore_trivial_edits ?? true,
        trivial_edit_threshold: row.trivial_edit_threshold ?? 0,
      });
    } catch (e: any) {
      setError(e?.message ?? 'فشل تحميل القاعدة');
    } finally {
      setLoading(false);
    }
  }

  // ── تحديث الحقول ──
  const setField = <K extends keyof RuleForm>(key: K, value: RuleForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const toggleChannel = (channel: string) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  // ── التحقق ──
  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!form.code.trim()) errors.code = 'الرمز مطلوب';
    else if (!/^[a-z0-9_]+$/.test(form.code))
      errors.code = 'الرمز يجب أن يحتوي على أحرف صغيرة وأرقام و _ فقط';

    if (!form.name_ar.trim()) errors.name_ar = 'الاسم مطلوب';
    if (!form.trigger_event.trim()) errors.trigger_event = 'الحدث مطلوب';
    if (form.channels.length === 0) errors.channels = 'اختر قناة واحدة على الأقل';

    // تحقق من JSON
    try {
      if (form.conditions_text.trim()) {
        JSON.parse(form.conditions_text);
      }
    } catch {
      errors.conditions_text = 'JSON غير صالح';
    }

    try {
      if (form.recipient_config_text.trim()) {
        JSON.parse(form.recipient_config_text);
      }
    } catch {
      errors.recipient_config_text = 'JSON غير صالح';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── الحفظ ──
  async function handleSubmit() {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        code: form.code.trim(),
        name_ar: form.name_ar.trim(),
        description: form.description.trim() || null,
        trigger_event: form.trigger_event.trim(),
        notification_type_id: form.notification_type_id || null,
        channels: form.channels,
        priority: form.priority,
        delay_minutes: Number(form.delay_minutes) || 0,
        is_active: form.is_active,
        category: form.category.trim() || null,
        email_template_id: form.email_template_id || null,
        internal_template_id: form.internal_template_id || null,
        conditions: JSON.parse(form.conditions_text || '{}'),
        recipient_config: JSON.parse(form.recipient_config_text || '{}'),
        throttle_window_minutes: Number(form.throttle_window_minutes) || 0,
        throttle_strategy: form.throttle_strategy,
        ignore_trivial_edits: form.ignore_trivial_edits,
        trivial_edit_threshold: Number(form.trivial_edit_threshold) || 0,
        updated_by: user?.id ?? null,
      };

      if (isEdit && id) {
        const { error: updateError } = await supabase
          .from('notification_rules')
          .update(payload)
          .eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('notification_rules')
          .insert({
            ...payload,
            created_by: user?.id ?? null,
          });
        if (insertError) throw insertError;
      }

      navigate('/settings/notifications/rules');
    } catch (e: any) {
      const msg = e?.message ?? 'فشل الحفظ';
      setError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  // ════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12 gap-2 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          جاري التحميل...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/settings/notifications/rules"
            className="
              p-2 rounded-lg border border-border
              hover:bg-bg-secondary transition-colors
            "
            aria-label="عودة"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text">
              {isEdit ? 'تعديل قاعدة' : 'إضافة قاعدة جديدة'}
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              {isEdit
                ? 'عدّل بيانات القاعدة ثم احفظ التغييرات'
                : 'املأ الحقول لإنشاء قاعدة تنبيه آلية'}
            </p>
          </div>
        </div>
      </div>

      {/* رسالة خطأ عامة */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-danger">خطأ</div>
            <div className="text-sm text-text-secondary mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* ─── البيانات الأساسية ─── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text">البيانات الأساسية</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              الرمز الفريد <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setField('code', e.target.value.toLowerCase())}
              placeholder="report_created_notify"
              disabled={isEdit}
              className={`
                w-full px-4 py-2.5 rounded-lg border font-mono text-sm
                bg-surface text-text placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                ${fieldErrors.code ? 'border-danger' : 'border-border'}
                ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            />
            {fieldErrors.code ? (
              <p className="text-xs text-danger mt-1">{fieldErrors.code}</p>
            ) : (
              <p className="text-xs text-text-muted mt-1">
                أحرف صغيرة وأرقام و _ فقط. لا يمكن تغييره بعد الإنشاء.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              الاسم <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.name_ar}
              onChange={(e) => setField('name_ar', e.target.value)}
              placeholder="تنبيه: تقرير جديد"
              className={`
                w-full px-4 py-2.5 rounded-lg border
                bg-surface text-text placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                ${fieldErrors.name_ar ? 'border-danger' : 'border-border'}
              `}
            />
            {fieldErrors.name_ar && (
              <p className="text-xs text-danger mt-1">{fieldErrors.name_ar}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text mb-1.5">
              الوصف
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="وصف مختصر لما تفعله هذه القاعدة..."
              rows={3}
              className="
                w-full px-4 py-2.5 rounded-lg border border-border resize-y
                bg-surface text-text placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              "
            />
          </div>
        </div>
      </Card>

      {/* ─── الحدث ونوع التنبيه ─── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text">الحدث والنوع</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              الحدث المُشغِّل <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.trigger_event}
              onChange={(e) => setField('trigger_event', e.target.value)}
              placeholder="report.created"
              list="event-suggestions"
              className={`
                w-full px-4 py-2.5 rounded-lg border font-mono text-sm
                bg-surface text-text placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                ${fieldErrors.trigger_event ? 'border-danger' : 'border-border'}
              `}
            />
            <datalist id="event-suggestions">
              <option value="report.created" />
              <option value="report.updated" />
              <option value="report.deleted" />
              <option value="report.overdue" />
              <option value="aggregate.created" />
              <option value="user.created" />
              <option value="user.deleted" />
              <option value="entity.created" />
              <option value="entity.deleted" />
            </datalist>
            {fieldErrors.trigger_event ? (
              <p className="text-xs text-danger mt-1">{fieldErrors.trigger_event}</p>
            ) : (
              <p className="text-xs text-text-muted mt-1">
                اكتب حدثًا مخصصًا أو اختر من القائمة.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              نوع التنبيه
            </label>
            <select
              value={form.notification_type_id}
              onChange={(e) => setField('notification_type_id', e.target.value)}
              className="
                w-full px-4 py-2.5 rounded-lg border border-border
                bg-surface text-text
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              "
            >
              <option value="">— بدون نوع محدد —</option>
              {notificationTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name_ar} ({t.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              التصنيف
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              placeholder="report / admin / custom"
              className="
                w-full px-4 py-2.5 rounded-lg border border-border
                bg-surface text-text placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              "
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              الأولوية
            </label>
            <select
              value={form.priority}
              onChange={(e) => setField('priority', e.target.value)}
              className="
                w-full px-4 py-2.5 rounded-lg border border-border
                bg-surface text-text
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              "
            >
              <option value="low">منخفضة</option>
              <option value="normal">عادية</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ─── القنوات والقوالب ─── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text">القنوات والقوالب</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              قنوات الإرسال <span className="text-danger">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'in_app', label: 'داخلي', available: true },
                { value: 'email', label: 'بريد إلكتروني', available: false, hint: 'غير مهيأ' },
                { value: 'sms', label: 'SMS', available: false, hint: 'غير مهيأ' },
                { value: 'push', label: 'Push', available: false, hint: 'غير مهيأ' },
              ].map((c) => {
                const isSelected = form.channels.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    disabled={!c.available}
                    onClick={() => c.available && toggleChannel(c.value)}
                    title={c.hint}
                    className={`
                      px-4 py-2 rounded-lg border text-sm font-medium
                      transition-all
                      ${isSelected && c.available
                        ? 'bg-primary text-white border-primary'
                        : c.available
                        ? 'bg-surface text-text border-border hover:border-primary'
                        : 'bg-bg-secondary text-text-muted border-border cursor-not-allowed opacity-60'}
                    `}
                  >
                    {c.label}
                    {!c.available && ' 🔒'}
                  </button>
                );
              })}
            </div>
            {fieldErrors.channels && (
              <p className="text-xs text-danger mt-2">{fieldErrors.channels}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                قالب البريد
              </label>
              <select
                value={form.email_template_id}
                onChange={(e) => setField('email_template_id', e.target.value)}
                className="
                  w-full px-4 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
              >
                <option value="">— بدون قالب —</option>
                {emailTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name_ar ?? t.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                قالب داخلي
              </label>
              <select
                value={form.internal_template_id}
                onChange={(e) => setField('internal_template_id', e.target.value)}
                className="
                  w-full px-4 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
              >
                <option value="">— بدون قالب —</option>
                {emailTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name_ar ?? t.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── المستلمون (recipient_config) ─── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text">تكوين المستلمين</h2>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            يُخزَّن تكوين المستلمين كـ <code className="bg-white px-1 rounded">JSON</code>.
            اكتب أرقام الكيانات والأدوار في الحقول التالية، أو الصق JSON مخصص.
            يُرجى استخدام معرّفات UUID صحيحة.
          </p>
        </div>

        <div className="space-y-4">
          <EntityRecipientPicker
            entities={entities}
            selected={extractIds(form.recipient_config_text, 'entity_ids')}
            onChange={(ids) =>
              setField(
                'recipient_config_text',
                updateRecipientConfig(form.recipient_config_text, 'entity_ids', ids)
              )
            }
          />

          <RoleRecipientPicker
            roles={roles}
            selected={extractIds(form.recipient_config_text, 'role_ids')}
            onChange={(ids) =>
              setField(
                'recipient_config_text',
                updateRecipientConfig(form.recipient_config_text, 'role_ids', ids)
              )
            }
          />

          <details className="border border-border rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-text hover:bg-bg-secondary">
              محرر JSON المتقدم (recipient_config)
            </summary>
            <div className="p-4 border-t border-border">
              <textarea
                value={form.recipient_config_text}
                onChange={(e) => setField('recipient_config_text', e.target.value)}
                rows={8}
                dir="ltr"
                className={`
                  w-full px-3 py-2 rounded-lg border font-mono text-xs
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                  ${fieldErrors.recipient_config_text ? 'border-danger' : 'border-border'}
                `}
              />
              {fieldErrors.recipient_config_text && (
                <p className="text-xs text-danger mt-1">
                  {fieldErrors.recipient_config_text}
                </p>
              )}
            </div>
          </details>
        </div>
      </Card>

      {/* ─── شروط التنفيذ (conditions) ─── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text">شروط التنفيذ</h2>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            شروط إضافية تُطبَّق قبل التنفيذ. مثال:{' '}
            <code className="bg-white px-1 rounded">
              {'{"report_status": "submitted"}'}
            </code>{' '}
            — يعني لا يُرسَل إلا للتقارير بحالة "مُسلَّم".
          </p>
        </div>

        <textarea
          value={form.conditions_text}
          onChange={(e) => setField('conditions_text', e.target.value)}
          rows={5}
          dir="ltr"
          className={`
            w-full px-3 py-2 rounded-lg border font-mono text-xs
            bg-surface text-text
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            ${fieldErrors.conditions_text ? 'border-danger' : 'border-border'}
          `}
        />
        {fieldErrors.conditions_text && (
          <p className="text-xs text-danger mt-1">{fieldErrors.conditions_text}</p>
        )}
      </Card>

      {/* ─── إعدادات متقدمة ─── */}
      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-bold text-text flex items-center gap-2">
            <Power className="w-4 h-4 text-primary" />
            إعدادات متقدمة (تأخير، تهدئة، تجاهل التعديلات الطفيفة)
          </summary>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                تأخير التنفيذ (دقائق)
              </label>
              <input
                type="number"
                min={0}
                value={form.delay_minutes}
                onChange={(e) => setField('delay_minutes', parseInt(e.target.value) || 0)}
                className="
                  w-full px-4 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
              />
              <p className="text-xs text-text-muted mt-1">
                0 = فوري. القيم الأكبر تؤخر الإرسال.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                استراتيجية التهدئة
              </label>
              <select
                value={form.throttle_strategy}
                onChange={(e) => setField('throttle_strategy', e.target.value)}
                className="
                  w-full px-4 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
              >
                <option value="none">بدون تهدئة</option>
                <option value="coalesce">تجميع الأحداث المتكررة</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                نافذة التهدئة (دقائق)
              </label>
              <input
                type="number"
                min={0}
                value={form.throttle_window_minutes}
                onChange={(e) => setField('throttle_window_minutes', parseInt(e.target.value) || 0)}
                className="
                  w-full px-4 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                عتبة التعديل الطفيف
              </label>
              <input
                type="number"
                min={0}
                value={form.trivial_edit_threshold}
                onChange={(e) => setField('trivial_edit_threshold', parseInt(e.target.value) || 0)}
                className="
                  w-full px-4 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
              />
            </div>

            <label className="md:col-span-2 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ignore_trivial_edits}
                onChange={(e) => setField('ignore_trivial_edits', e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm text-text">
                تجاهل التعديلات الطفيفة (لا ترسل تنبيهًا)
              </span>
            </label>
          </div>
        </details>
      </Card>

      {/* ─── الحالة والأزرار ─── */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField('is_active', e.target.checked)}
              className="w-5 h-5 rounded accent-primary"
            />
            <div>
              <div className="text-sm font-medium text-text">
                تفعيل القاعدة فورًا
              </div>
              <div className="text-xs text-text-muted">
                {form.is_active
                  ? 'ستُشغَّل تلقائيًا عند وقوع الحدث'
                  : 'لن تُشغَّل حتى تُفعّلها'}
              </div>
            </div>
          </label>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/settings/notifications/rules')}
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={saving}
              icon={<Save className="w-4 h-4" />}
            >
              {isEdit ? 'حفظ التغييرات' : 'إضافة القاعدة'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Helper Components
// ════════════════════════════════════════════════════════════

function EntityRecipientPicker({
  entities,
  selected,
  onChange,
}: {
  entities: EntityOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return entities;
    return entities.filter((e) => e.name_ar.includes(q));
  }, [entities, search]);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id]
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-2 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-text-muted" />
        الكيانات المستهدفة
        {selected.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
            {selected.length}
          </span>
        )}
      </label>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث عن كيان..."
        className="
          w-full px-4 py-2 rounded-lg border border-border mb-2
          bg-surface text-text placeholder:text-text-muted
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
        "
      />

      <div className="border border-border rounded-lg max-h-52 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-text-muted">
            لا نتائج مطابقة
          </p>
        ) : (
          filtered.slice(0, 100).map((e) => {
            const isSelected = selected.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => toggle(e.id)}
                className={`
                  w-full flex items-center gap-3 p-2.5 text-right
                  transition-colors
                  ${isSelected ? 'bg-primary/5' : 'hover:bg-bg-secondary'}
                `}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="w-4 h-4 rounded accent-primary pointer-events-none"
                />
                <span className="text-sm text-text">{e.name_ar}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function RoleRecipientPicker({
  roles,
  selected,
  onChange,
}: {
  roles: RoleOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id]
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text mb-2 flex items-center gap-2">
        <Users className="w-4 h-4 text-text-muted" />
        الأدوار المستهدفة
        {selected.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
            {selected.length}
          </span>
        )}
      </label>

      <div className="border border-border rounded-lg max-h-52 overflow-y-auto divide-y divide-border">
        {roles.length === 0 ? (
          <p className="p-4 text-center text-sm text-text-muted">
            لا توجد أدوار
          </p>
        ) : (
          roles.map((r) => {
            const isSelected = selected.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggle(r.id)}
                className={`
                  w-full flex items-center gap-3 p-2.5 text-right
                  transition-colors
                  ${isSelected ? 'bg-primary/5' : 'hover:bg-bg-secondary'}
                `}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="w-4 h-4 rounded accent-primary pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text truncate">{r.name_ar}</div>
                  <div className="text-xs text-text-muted font-mono">{r.code}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// JSON helpers
// ════════════════════════════════════════════════════════════

function extractIds(jsonText: string, key: string): string[] {
  try {
    const obj = JSON.parse(jsonText);
    const arr = obj?.[key];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function updateRecipientConfig(jsonText: string, key: string, ids: string[]): string {
  let obj: any = {};
  try {
    obj = JSON.parse(jsonText || '{}');
  } catch {
    obj = {};
  }
  if (!Array.isArray(obj.entity_ids)) obj.entity_ids = [];
  if (!Array.isArray(obj.role_ids)) obj.role_ids = [];
  if (!Array.isArray(obj.user_ids)) obj.user_ids = [];
  obj[key] = ids;
  return JSON.stringify(obj, null, 2);
}