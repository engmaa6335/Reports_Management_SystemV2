import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowRight, Save, AlertCircle, Loader2, Info, FileText, Eye, Code,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/auth-store';

interface TemplateForm {
  code: string;
  name_ar: string;
  subject_ar: string;
  body_text: string;
  body_html: string;
  variables: string[];
  is_active: boolean;
}

const EMPTY_FORM: TemplateForm = {
  code: '',
  name_ar: '',
  subject_ar: '',
  body_text: '',
  body_html: '',
  variables: [],
  is_active: true,
};

const KNOWN_VARIABLES = [
  { code: 'actor_name', label: 'اسم المُنفِّذ', sample: 'محمد أمين' },
  { code: 'actor_email', label: 'بريد المُنفِّذ', sample: 'm.amin@edu.ps' },
  { code: 'entity_name', label: 'اسم الكيان', sample: 'الوحدة التربوية' },
  { code: 'report_title', label: 'عنوان التقرير', sample: 'التقرير الأسبوعي' },
  { code: 'report_url', label: 'رابط التقرير', sample: 'https://example.org/r/abc' },
  { code: 'event_date', label: 'تاريخ الحدث', sample: '2026-10-15' },
  { code: 'deadline', label: 'الموعد النهائي', sample: '2026-10-20' },
  { code: 'details_url', label: 'رابط التفاصيل', sample: 'https://example.org/d' },
  { code: 'template_name', label: 'اسم القالب', sample: 'قالب: تقرير جديد' },
];

export function NotificationTemplateFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isEdit && id) loadTemplate(id);
  }, [id, isEdit]);

  async function loadTemplate(templateId: string) {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('القالب غير موجود');

      const row = data as any;
      setForm({
        code: row.code ?? '',
        name_ar: row.name_ar ?? '',
        subject_ar: row.subject_ar ?? '',
        body_text: row.body_text ?? '',
        body_html: row.body_html ?? '',
        variables: Array.isArray(row.variables)
          ? row.variables.filter((v: any) => typeof v === 'string')
          : [],
        is_active: row.is_active ?? true,
      });
    } catch (e: any) {
      setError(e?.message ?? 'فشل تحميل القالب');
    } finally {
      setLoading(false);
    }
  }

  const setField = <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const insertVariable = (varName: string, target: 'subject_ar' | 'body_text' | 'body_html') => {
    setField(target, form[target] + `{{${varName}}}`);
  };

  const detectedVariables = useMemo(() => {
    const combined = `${form.subject_ar} ${form.body_text} ${form.body_html}`;
    const set = new Set<string>();
    for (const m of combined.matchAll(/\{\{(\w+)\}\}/g)) set.add(m[1]);
    return Array.from(set).sort();
  }, [form.subject_ar, form.body_text, form.body_html]);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.code.trim()) errors.code = 'الرمز مطلوب';
    else if (!/^[a-z0-9_]+$/.test(form.code))
      errors.code = 'أحرف صغيرة وأرقام و _ فقط';
    if (!form.name_ar.trim()) errors.name_ar = 'الاسم مطلوب';
    if (!form.body_text.trim() && !form.body_html.trim()) {
      errors.body_text = 'يجب توفير نص الرسالة أو HTML على الأقل';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

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
        name_ar: form.name_ar.trim() || null,
        subject_ar: form.subject_ar.trim() || null,
        body_text: form.body_text.trim() || null,
        body_html: form.body_html.trim() || null,
        variables: form.variables.length > 0 ? form.variables : detectedVariables,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (isEdit && id) {
        const { error: e } = await supabase
          .from('email_templates')
          .update(payload)
          .eq('id', id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from('email_templates')
          .insert(payload);
        if (e) throw e;
      }
      navigate('/settings/notifications/templates');
    } catch (e: any) {
      setError(e?.message ?? 'فشل الحفظ');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  const previewSamples: Record<string, string> = useMemo(() => {
    const o: Record<string, string> = {};
    for (const v of KNOWN_VARIABLES) o[v.code] = v.sample;
    return o;
  }, []);

  const substitute = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, k) => previewSamples[k] ?? `[${k}]`);

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
      <div className="flex items-center gap-3">
        <Link
          to="/settings/notifications/templates"
          className="p-2 rounded-lg border border-border hover:bg-bg-secondary transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text">
            {isEdit ? 'تعديل قالب' : 'إضافة قالب جديد'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-danger">خطأ</div>
            <div className="text-sm text-text-secondary mt-1">{error}</div>
          </div>
        </div>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text">البيانات الأساسية</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              الرمز <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setField('code', e.target.value.toLowerCase())}
              placeholder="welcome_template"
              disabled={isEdit}
              className={`w-full px-4 py-2.5 rounded-lg border font-mono text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.code ? 'border-danger' : 'border-border'} ${isEdit ? 'opacity-60' : ''}`}
            />
            {fieldErrors.code && <p className="text-xs text-danger mt-1">{fieldErrors.code}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              الاسم <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={form.name_ar}
              onChange={(e) => setField('name_ar', e.target.value)}
              placeholder="قالب الترحيب"
              className={`w-full px-4 py-2.5 rounded-lg border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.name_ar ? 'border-danger' : 'border-border'}`}
            />
            {fieldErrors.name_ar && <p className="text-xs text-danger mt-1">{fieldErrors.name_ar}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text mb-1.5">الموضوع</label>
            <input
              type="text"
              value={form.subject_ar}
              onChange={(e) => setField('subject_ar', e.target.value)}
              placeholder="تقرير جديد: {{report_title}}"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text">المتغيرات</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {KNOWN_VARIABLES.map((v) => (
            <button
              key={v.code}
              type="button"
              onClick={() => insertVariable(v.code, 'body_text')}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-mono border transition-colors ${detectedVariables.includes(v.code) ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface text-text-muted border-border hover:border-primary'}`}
            >
              {`{{${v.code}}}`}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-text">نص الرسالة</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${showPreview ? 'bg-primary text-white' : 'bg-bg-secondary text-text'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            {showPreview ? 'إخفاء' : 'معاينة'}
          </button>
        </div>
        <div className={showPreview ? 'grid md:grid-cols-2 gap-4' : ''}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                النص العادي <span className="text-danger">*</span>
              </label>
              <textarea
                value={form.body_text}
                onChange={(e) => setField('body_text', e.target.value)}
                rows={8}
                className={`w-full px-4 py-3 rounded-lg border resize-y font-mono text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${fieldErrors.body_text ? 'border-danger' : 'border-border'}`}
              />
              {fieldErrors.body_text && <p className="text-xs text-danger mt-1">{fieldErrors.body_text}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">HTML (اختياري)</label>
              <textarea
                value={form.body_html}
                onChange={(e) => setField('body_html', e.target.value)}
                rows={6}
                dir="ltr"
                className="w-full px-4 py-3 rounded-lg border border-border resize-y font-mono text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          {showPreview && (
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">المعاينة</label>
              <div className="bg-bg-secondary rounded-lg border border-border p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {form.subject_ar && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="text-xs font-bold text-text-muted mb-1">الموضوع:</div>
                    <div className="text-sm text-text font-medium">{substitute(form.subject_ar)}</div>
                  </div>
                )}
                {form.body_text && (
                  <div>
                    <div className="text-xs font-bold text-text-muted mb-1">النص:</div>
                    <div className="text-sm text-text whitespace-pre-wrap">{substitute(form.body_text)}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField('is_active', e.target.checked)}
              className="w-5 h-5 rounded accent-primary"
            />
            <span className="text-sm font-medium text-text">تفعيل القالب</span>
          </label>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/settings/notifications/templates')}
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
              {isEdit ? 'حفظ التغييرات' : 'إضافة القالب'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}