import { useState } from 'react';
import { X, Save, Lock } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import {
  createTheme,
  updateTheme,
  type Theme,
  type ThemeInput,
} from '../../lib/themes-api';

const COLOR_VARS = [
  { key: '--color-primary', label: 'الأساسي' },
  { key: '--color-primary-light', label: 'الأساسي فاتح' },
  { key: '--color-primary-dark', label: 'الأساسي داكن' },
  { key: '--color-secondary', label: 'الثانوي' },
  { key: '--color-success', label: 'النجاح' },
  { key: '--color-warning', label: 'التحذير' },
  { key: '--color-danger', label: 'الخطر' },
  { key: '--color-info', label: 'المعلومات' },
  { key: '--color-bg', label: 'الخلفية' },
  { key: '--color-bg-secondary', label: 'الخلفية الثانوية' },
  { key: '--color-surface', label: 'السطح' },
  { key: '--color-border', label: 'الحدود' },
  { key: '--color-text', label: 'النص' },
  { key: '--color-text-secondary', label: 'النص الثانوي' },
  { key: '--color-text-muted', label: 'النص الباهت' },
];

const AVAILABLE_FONTS = [
  { value: 'Cairo', label: 'القاهرة (Cairo)' },
  { value: 'Tajawal', label: 'تجوال (Tajawal)' },
  { value: 'Almarai', label: 'المراعي (Almarai)' },
  { value: 'IBM Plex Sans Arabic', label: 'IBM بلكس' },
  { value: 'Noto Kufi Arabic', label: 'نوتو كوفي' },
  { value: 'Readex Pro', label: 'ريدكس' },
  { value: 'Rubik', label: 'روبيك' },
  { value: 'Changa', label: 'تشانغا' },
];

const DEFAULT_COLORS = Object.fromEntries(
  COLOR_VARS.map((v) => [v.key, '#000000'])
);

export function ThemeEditorModal({
  theme,
  onClose,
  onSaved,
}: {
  theme: Theme | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const isEdit = !!theme;
  const isCanonical = theme?.code === 'light' && theme?.is_default;

  const [form, setForm] = useState<ThemeInput>({
    code: theme?.code ?? '',
    name_ar: theme?.name_ar ?? '',
    name_en: theme?.name_en ?? '',
    description: theme?.description ?? '',
    category: theme?.category ?? 'colorful',
    icon: theme?.icon ?? 'palette',
    colors: { ...DEFAULT_COLORS, ...(theme?.colors || {}) },
    shadow_intensity: theme?.shadow_intensity ?? 'medium',
    border_radius: theme?.border_radius ?? 'medium',
    font_family: theme?.font_family ?? 'Cairo',
    is_dark: theme?.is_dark ?? false,
    preview_image_url: theme?.preview_image_url ?? null,
    is_system: theme?.is_system ?? false,
    is_active: theme?.is_active ?? true,
    is_default: theme?.is_default ?? false,
    order_index: theme?.order_index ?? 99,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const patch = (p: Partial<ThemeInput>) =>
    setForm((f) => ({ ...f, ...p }));
  const setColor = (key: string, value: string) =>
    setForm((f) => ({ ...f, colors: { ...f.colors, [key]: value } }));

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    setErr(null);
    try {
      if (isEdit && theme) await updateTheme(theme.id, form, user.id);
      else await createTheme(form, user.id);
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isCanonical) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-surface rounded-xl shadow-2xl p-6 max-w-md text-center">
          <Lock className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">الثيم المرجعي محمي</h3>
          <p className="text-sm text-text-secondary mb-4">
            الثيم "light" هو الثيم المرجعي المبني عليه النظام. لا يمكن تعديله.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-primary text-white"
          >
            حسناً
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-lg font-bold">
            {isEdit ? 'تعديل ثيم' : 'إضافة ثيم'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-secondary rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {err && (
            <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">
              {err}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="الكود (بالإنجليزية)">
              <input
                className="input"
                value={form.code}
                disabled={isEdit}
                onChange={(e) => patch({ code: e.target.value })}
                placeholder="modern-blue"
              />
            </Field>
            <Field label="الاسم بالعربية">
              <input
                className="input"
                value={form.name_ar}
                onChange={(e) => patch({ name_ar: e.target.value })}
              />
            </Field>
            <Field label="الاسم بالإنجليزية">
              <input
                className="input"
                value={form.name_en ?? ''}
                onChange={(e) => patch({ name_en: e.target.value })}
              />
            </Field>
            <Field label="الترتيب">
              <input
                type="number"
                className="input"
                value={form.order_index}
                onChange={(e) =>
                  patch({ order_index: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="نصف قطر الحواف">
              <select
                className="input"
                value={form.border_radius ?? 'medium'}
                onChange={(e) =>
                  patch({ border_radius: e.target.value as any })
                }
              >
                <option value="none">بدون</option>
                <option value="small">صغير</option>
                <option value="medium">متوسط</option>
                <option value="large">كبير</option>
              </select>
            </Field>
            <Field label="شدة الظل">
              <select
                className="input"
                value={form.shadow_intensity ?? 'medium'}
                onChange={(e) =>
                  patch({ shadow_intensity: e.target.value as any })
                }
              >
                <option value="none">بدون</option>
                <option value="light">خفيف</option>
                <option value="medium">متوسط</option>
                <option value="heavy">ثقيل</option>
              </select>
            </Field>
            <Field label="الخط">
              <select
                className="input"
                value={form.font_family ?? 'Cairo'}
                onChange={(e) => patch({ font_family: e.target.value })}
                style={{ fontFamily: form.font_family ?? 'Cairo' }}
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option
                    key={f.value}
                    value={f.value}
                    style={{ fontFamily: f.value }}
                  >
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_dark}
                  onChange={(e) => patch({ is_dark: e.target.checked })}
                />{' '}
                وضع داكن
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => patch({ is_active: e.target.checked })}
                />{' '}
                مفعّل
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-2">الألوان</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {COLOR_VARS.map((v) => (
                <div key={v.key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.colors[v.key] || '#000000'}
                    onChange={(e) => setColor(v.key, e.target.value)}
                    className="w-9 h-9 rounded border border-border cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-secondary truncate">
                      {v.label}
                    </div>
                    <input
                      className="w-full text-xs px-1 py-0.5 border border-border rounded font-mono"
                      value={form.colors[v.key] || ''}
                      onChange={(e) => setColor(v.key, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border sticky bottom-0 bg-surface">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-bg-secondary"
          >
            إلغاء
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'جارٍ الحفظ…' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}