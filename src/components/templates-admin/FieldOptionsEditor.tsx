import { useState, useEffect } from 'react';
import { Settings, Code, AlertCircle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface FieldOptionsEditorProps {
  fieldType: string;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

type TabMode = 'form' | 'json';

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function FieldOptionsEditor({
  fieldType,
  value,
  onChange,
}: FieldOptionsEditorProps) {
  const [mode, setMode] = useState<TabMode>('form');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // ⭐ Sync JSON text when value changes (form → json)
  useEffect(() => {
    if (mode === 'json') {
      setJsonText(JSON.stringify(value || {}, null, 2));
    }
  }, [value, mode]);

  // ⭐ Update form field
  const updateOption = (key: string, val: unknown) => {
    const next = { ...value, [key]: val };
    onChange(next);
  };

  const removeOption = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  // ⭐ Apply JSON
  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('يجب أن يكون JSON كائناً');
      }
      onChange(parsed);
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'JSON غير صحيح');
    }
  };

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  const baseInput =
    'w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

  return (
    <div className="space-y-4">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-semibold text-text">
            ⚙️ إعدادات الحقل (options)
          </h4>
          <p className="text-xs text-text-muted mt-0.5">
            إعدادات خاصة بنوع الحقل "{fieldType}"
          </p>
        </div>

        <div className="flex items-center gap-1 bg-bg-secondary rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('form')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'form'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            نموذج
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('json');
              setJsonText(JSON.stringify(value || {}, null, 2));
              setJsonError(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'json'
                ? 'bg-surface text-primary shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* Form Mode */}
      {/* ═══════════════════════════════════════════ */}
      {mode === 'form' && (
        <div className="space-y-4">
          {/* ⭐ القسم (Section) — لكل الحقول */}
          <SectionEditor
            value={(value.section as any) || {}}
            onChange={(section) => updateOption('section', section)}
            onRemove={() => removeOption('section')}
            baseInput={baseInput}
          />

          {/* ⭐ عرض كامل — لكل الحقول */}
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-bg-secondary">
            <input
              type="checkbox"
              id="full_width"
              checked={value.full_width === true}
              onChange={(e) => updateOption('full_width', e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <label
              htmlFor="full_width"
              className="text-sm text-text cursor-pointer flex-1"
            >
              📐 عرض كامل (عمودان بدل عمود واحد)
            </label>
          </div>

          {/* ⭐ إعدادات حسب النوع */}
          {fieldType === 'auto_filled' && (
            <AutoFilledOptions
              value={value}
              updateOption={updateOption}
              baseInput={baseInput}
            />
          )}

          {fieldType === 'select' || fieldType === 'radio' ? (
            <SelectOptionsEditor
              value={(value.options as any[]) || []}
              onChange={(opts) => updateOption('options', opts)}
              baseInput={baseInput}
            />
          ) : null}

          {fieldType === 'indicator_group' && (
            <IndicatorGroupOptions
              value={value}
              updateOption={updateOption}
              baseInput={baseInput}
            />
          )}

          {/* placeholder — للحقول التي تدعمه */}
          {['text', 'textarea', 'number', 'select'].includes(fieldType) && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Placeholder (نص مؤقت)
              </label>
              <input
                type="text"
                value={(value.placeholder as string) || ''}
                onChange={(e) => updateOption('placeholder', e.target.value)}
                placeholder="مثال: اكتب هنا..."
                className={baseInput}
              />
            </div>
          )}

          {/* JSON Preview */}
          <details className="text-xs">
            <summary className="cursor-pointer text-text-muted hover:text-text">
              👁️ عرض JSON الحالي
            </summary>
            <pre
              className="mt-2 p-3 rounded-lg bg-bg-secondary border border-border overflow-x-auto text-[10px] font-mono text-text-secondary"
              dir="ltr"
            >
              {JSON.stringify(value, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* JSON Mode */}
      {/* ═══════════════════════════════════════════ */}
      {mode === 'json' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-info/5 border border-info/20 text-xs text-info">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>JSON متقدم:</strong> يمكنك تعديل الإعدادات مباشرة.
              <br />
              ⚠️ تأكد من صحة الصيغة قبل الحفظ.
            </div>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError(null);
            }}
            rows={15}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
            dir="ltr"
            spellCheck={false}
          />

          {jsonError && (
            <div className="p-2 rounded-lg bg-danger/10 border border-danger/30 text-xs text-danger flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{jsonError}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyJson}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              ✅ تطبيق JSON
            </button>
            <button
              type="button"
              onClick={() => {
                setJsonText(JSON.stringify(value || {}, null, 2));
                setJsonError(null);
              }}
              className="px-4 py-2 rounded-lg bg-bg-secondary text-text-secondary text-sm font-medium hover:bg-bg-secondary/80 transition-colors"
            >
              🔄 استعادة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════

// ⭐ Section Editor
function SectionEditor({
  value,
  onChange,
  onRemove,
  baseInput,
}: {
  value: {
    key?: string;
    title?: string;
    icon?: string;
    order?: number;
    accent_color?: string;
  };
  onChange: (v: any) => void;
  onRemove: () => void;
  baseInput: string;
}) {
  const hasSection = !!value.key;

  const update = (key: string, val: any) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-bg-secondary">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-text-secondary">
          📂 القسم
        </label>
        {hasSection && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-danger hover:underline"
          >
            إزالة القسم
          </button>
        )}
      </div>

      {!hasSection ? (
        <button
          type="button"
          onClick={() =>
            onChange({ key: 'section_1', title: 'قسم', order: 1 })
          }
          className="text-xs text-primary hover:underline"
        >
          + إضافة قسم
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={value.key || ''}
            onChange={(e) =>
              update(
                'key',
                e.target.value.toLowerCase().replace(/\s+/g, '_')
              )
            }
            placeholder="المفتاح"
            className={baseInput}
            dir="ltr"
          />
          <input
            type="text"
            value={value.title || ''}
            onChange={(e) => update('title', e.target.value)}
            placeholder="العنوان"
            className={baseInput}
          />
          <input
            type="text"
            value={value.icon || ''}
            onChange={(e) => update('icon', e.target.value)}
            placeholder="أيقونة (إيموجي)"
            className={baseInput}
          />
          <input
            type="number"
            value={value.order || 1}
            onChange={(e) => update('order', Number(e.target.value))}
            placeholder="الترتيب"
            className={baseInput}
          />
        </div>
      )}
    </div>
  );
}

// ⭐ Auto Filled Options
function AutoFilledOptions({
  value,
  updateOption,
  baseInput,
}: {
  value: Record<string, any>;
  updateOption: (k: string, v: any) => void;
  baseInput: string;
}) {
  return (
    <div className="space-y-3 p-3 rounded-lg border border-info/20 bg-info/5">
      <h5 className="text-xs font-bold text-info">
        🔒 إعدادات الحقل التلقائي
      </h5>

      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          المصدر (auto_source)
        </label>
        <select
          value={value.auto_source || ''}
          onChange={(e) => updateOption('auto_source', e.target.value)}
          className={baseInput}
        >
          <option value="">— اختر —</option>
          <option value="user.full_name">اسم المستخدم</option>
          <option value="user.email">بريد المستخدم</option>
          <option value="entity.name">اسم الكيان</option>
          <option value="entity.id">معرف الكيان</option>
          <option value="date.today">تاريخ اليوم</option>
          <option value="date.now">الآن</option>
          <option value="selected_entity.manager_name">
            مدير الكيان المختار
          </option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          نوع العرض
        </label>
        <select
          value={value.display_type || 'text'}
          onChange={(e) => updateOption('display_type', e.target.value)}
          className={baseInput}
        >
          <option value="text">نص</option>
          <option value="date">تاريخ</option>
          <option value="datetime">تاريخ ووقت</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="editable_auto"
          checked={value.editable === true}
          onChange={(e) => updateOption('editable', e.target.checked)}
          className="w-4 h-4 text-primary rounded"
        />
        <label
          htmlFor="editable_auto"
          className="text-xs text-text cursor-pointer"
        >
          قابل للتعديل من المستخدم
        </label>
      </div>
    </div>
  );
}

// ⭐ Select Options Editor
function SelectOptionsEditor({
  value,
  onChange,
  baseInput,
}: {
  value: Array<{ value: string; label: string }>;
  onChange: (v: Array<{ value: string; label: string }>) => void;
  baseInput: string;
}) {
  const addOption = () => {
    onChange([...value, { value: '', label: '' }]);
  };

  const updateOption = (idx: number, key: 'value' | 'label', val: string) => {
    const next = [...value];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };

  const removeOption = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2 p-3 rounded-lg border border-success/20 bg-success/5">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-bold text-success">
          📋 الخيارات ({value.length})
        </h5>
        <button
          type="button"
          onClick={addOption}
          className="text-xs text-primary hover:underline"
        >
          + إضافة خيار
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-2">
          لا توجد خيارات بعد
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={opt.value}
                onChange={(e) =>
                  updateOption(idx, 'value', e.target.value)
                }
                placeholder="القيمة"
                className={`${baseInput} flex-1`}
                dir="ltr"
              />
              <input
                type="text"
                value={opt.label}
                onChange={(e) =>
                  updateOption(idx, 'label', e.target.value)
                }
                placeholder="التسمية"
                className={`${baseInput} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="p-1.5 text-danger hover:bg-danger/10 rounded-md"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ⭐ Indicator Group Options
function IndicatorGroupOptions({
  value,
  updateOption,
  baseInput,
}: {
  value: Record<string, any>;
  updateOption: (k: string, v: any) => void;
  baseInput: string;
}) {
  const indicators = (value.indicators as any[]) || [];
  const scale = (value.scale as string[]) || ['high', 'medium', 'low'];
  const scaleLabels = (value.scale_labels as string[]) || [
    'متحقق بدرجة كبيرة',
    'متحقق بدرجة متوسطة',
    'متحقق بدرجة قليلة',
  ];

  return (
    <div className="space-y-3 p-3 rounded-lg border border-warning/20 bg-warning/5">
      <h5 className="text-xs font-bold text-warning">
        📊 إعدادات المؤشرات ({indicators.length})
      </h5>

      <div className="text-xs text-text-muted">
        💡 لإدارة المؤشرات، استخدم محرر JSON (تبويب JSON)
      </div>

      {indicators.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {indicators.map((ind, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2 rounded-md bg-surface border border-border text-xs"
            >
              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] flex-shrink-0">
                {ind.num}
              </span>
              <span className="text-text flex-1">{ind.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {scale.map((s, idx) => (
          <div
            key={s}
            className="p-2 rounded-md bg-surface border border-border text-xs text-center"
          >
            <div className="font-mono text-text-muted text-[10px]">
              {s}
            </div>
            <div className="text-text">{scaleLabels[idx] || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}