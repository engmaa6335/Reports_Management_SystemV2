import { Star } from 'lucide-react';
import type { FormField } from '../../types/templates-admin';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface FieldPreviewProps {
  field: Partial<FormField>;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function FieldPreview({ field }: FieldPreviewProps) {
  const label = field.label_ar || 'اسم الحقل';
  const placeholder = field.placeholder || '';
  const isRequired = !!(field.validation_rules as any)?.required;
  const options = (field.options as any) || {};

  const baseInput =
    'w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text text-sm cursor-not-allowed';

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-text">
        👁️ معاينة حية
      </h4>

      <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
        {/* Label */}
        <label className="block text-sm font-medium text-text mb-2">
          {label}
          {isRequired && <span className="text-danger mr-1">*</span>}
        </label>

        {/* Field Type Preview */}
        {field.field_type === 'text' && (
          <input
            type="text"
            placeholder={placeholder}
            disabled
            className={baseInput}
          />
        )}

        {field.field_type === 'textarea' && (
          <textarea
            placeholder={placeholder}
            disabled
            rows={3}
            className={`${baseInput} resize-none`}
          />
        )}

        {field.field_type === 'number' && (
          <input
            type="number"
            placeholder={placeholder}
            disabled
            className={baseInput}
          />
        )}

        {field.field_type === 'date' && (
          <input type="date" disabled className={baseInput} />
        )}

        {field.field_type === 'datetime' && (
          <input type="datetime-local" disabled className={baseInput} />
        )}

        {field.field_type === 'select' && (
          <select disabled className={baseInput}>
            <option>— اختر —</option>
            {(options.options || []).map((o: any, i: number) => (
              <option key={i}>{o.label || o.value}</option>
            ))}
          </select>
        )}

        {field.field_type === 'radio' && (
          <div className="space-y-2">
            {(options.options || []).length === 0 ? (
              <div className="text-xs text-text-muted italic">
                لا توجد خيارات
              </div>
            ) : (
              (options.options || []).map((o: any, i: number) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input type="radio" disabled className="w-4 h-4" />
                  <span>{o.label || o.value}</span>
                </label>
              ))
            )}
          </div>
        )}

        {field.field_type === 'checkbox' && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled className="w-4 h-4" />
            <span>{placeholder || 'نعم'}</span>
          </label>
        )}

        {field.field_type === 'rating' && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className="w-5 h-5 text-text-muted"
              />
            ))}
          </div>
        )}

        {field.field_type === 'auto_filled' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-info/20 bg-info/10">
            <span className="text-text-muted flex-1 text-sm">
              {placeholder || '— قيمة تلقائية —'}
            </span>
            <span className="text-xs">🔒</span>
          </div>
        )}

        {field.field_type === 'indicator_group' && (
          <div className="space-y-2">
            {((options.indicators || []) as any[]).slice(0, 3).map((ind, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-md bg-surface border border-border text-xs"
              >
                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                  {ind.num || i + 1}
                </span>
                <span className="flex-1 text-text truncate">{ind.text}</span>
                <span className="text-text-muted">—</span>
              </div>
            ))}
            {((options.indicators || []) as any[]).length > 3 && (
              <div className="text-xs text-text-muted text-center">
                + {((options.indicators || []) as any[]).length - 3} مؤشر آخر
              </div>
            )}
          </div>
        )}

        {field.field_type === 'subject_select' && (
          <select disabled className={baseInput}>
            <option>— اختر المادة —</option>
            <option>رياضيات</option>
            <option>لغة عربية</option>
          </select>
        )}

        {(field.field_type === 'school_select' ||
          field.field_type === 'center_select') && (
          <select disabled className={baseInput}>
            <option>— اختر —</option>
          </select>
        )}
      </div>

      <p className="text-xs text-text-muted text-center">
        💡 هذه معاينة فقط — لن تُحفظ
      </p>
    </div>
  );
}