import { Star } from 'lucide-react';
import { AutoFilledField } from './AutoFilledField';
import { IndicatorGroupField } from './IndicatorGroupField';
import { SubjectSelectField } from './SubjectSelectField';
import { EntitySelectField } from './EntitySelectField';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface DynamicFieldConfig {
  id?: string;
  field_key: string;
  field_type: string;
  label_ar: string;
  placeholder?: string | null;
  help_text?: string | null;
  validation_rules?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

interface DynamicFieldProps {
  field: DynamicFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  templateCode?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function DynamicField({
  field,
  value,
  onChange,
  error,
  templateCode,
}: DynamicFieldProps) {
  const options =
    (field.options as { options?: SelectOption[] })?.options || [];
  const validation = (field.validation_rules || {}) as {
    required?: boolean;
  };

  const baseInputClass = `
    w-full px-4 py-2.5 rounded-lg border transition-all
    bg-surface text-text placeholder:text-text-muted
    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
    ${error ? 'border-danger' : 'border-border'}
  `;

  // ═══════════════════════════════════════════════════════════
  // 🆕 AUTO_FILLED — حقل تلقائي مع تمييز بصري
  // ═══════════════════════════════════════════════════════════
  if (field.field_type === 'auto_filled') {
    const opts = (field.options as any) || {};

    return (
      <AutoFilledField
        label={field.label_ar}
        value={(value as string) || ''}
        hint={field.help_text || opts.hint || undefined}
        editable={opts.editable ?? false}
        type={opts.display_type || 'text'}
        onChange={onChange as (v: string) => void}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════
  // INDICATOR_GROUP
  // ═══════════════════════════════════════════════════════════
  if (field.field_type === 'indicator_group') {
    const accentColor =
      templateCode === 'specialist_tls_visit' ? 'primary' : 'success';

    return (
      <IndicatorGroupField
        field={field as any}
        value={(value as Record<string, string>) || {}}
        onChange={onChange as (v: Record<string, string>) => void}
        error={error}
        accentColor={accentColor}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SUBJECT_SELECT
  // ═══════════════════════════════════════════════════════════
  if (field.field_type === 'subject_select') {
    return (
      <SubjectSelectField
        field={{
          field_key: field.field_key,
          label_ar: field.label_ar,
          placeholder: field.placeholder,
          help_text: field.help_text,
          validation_rules: field.validation_rules,
        }}
        value={(value as string) || ''}
        onChange={onChange as (v: string) => void}
        error={error}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SCHOOL_SELECT / CENTER_SELECT
  // ═══════════════════════════════════════════════════════════
  if (
    field.field_type === 'school_select' ||
    field.field_type === 'center_select'
  ) {
    return (
      <EntitySelectField
        fieldType={
          field.field_type as 'school_select' | 'center_select'
        }
        label={field.label_ar}
        helpText={field.help_text}
        value={(value as string) || ''}
        onChange={onChange as (v: string) => void}
        error={error}
        required={validation.required}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Standard Fields
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-text">
        {field.label_ar}
        {validation.required && (
          <span className="text-danger mr-1">*</span>
        )}
      </label>

      {/* Help Text */}
      {field.help_text && (
        <p className="text-xs text-text-muted">{field.help_text}</p>
      )}

      {/* Text */}
      {field.field_type === 'text' && (
        <input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          className={baseInputClass}
        />
      )}

      {/* Textarea */}
      {field.field_type === 'textarea' && (
        <textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          rows={4}
          className={`${baseInputClass} resize-y`}
        />
      )}

      {/* Number */}
      {field.field_type === 'number' && (
        <input
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null)
          }
          placeholder={field.placeholder || ''}
          className={baseInputClass}
        />
      )}

      {/* Date */}
      {field.field_type === 'date' && (
        <input
          type="date"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
        />
      )}

      {/* Datetime */}
      {field.field_type === 'datetime' && (
        <input
          type="datetime-local"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
        />
      )}

      {/* Select */}
      {field.field_type === 'select' && (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
        >
          <option value="">— اختر —</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Rating */}
      {field.field_type === 'rating' && (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                className={`w-7 h-7 ${
                  (value as number) >= star
                    ? 'fill-warning text-warning'
                    : 'text-text-muted'
                }`}
              />
            </button>
          ))}
          {value ? (
            <span className="text-sm text-text-secondary mr-2">
              {value as number} / 5
            </span>
          ) : null}
        </div>
      )}

      {/* Checkbox */}
      {field.field_type === 'checkbox' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-text">
            {field.placeholder || 'نعم'}
          </span>
        </label>
      )}

      {/* Radio */}
      {field.field_type === 'radio' && (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name={field.field_key}
                value={opt.value}
                checked={value === opt.value}
                onChange={(e) => onChange(e.target.value)}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-text">{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Fallback */}
      {![
        'text',
        'textarea',
        'number',
        'date',
        'datetime',
        'select',
        'rating',
        'checkbox',
        'radio',
        'auto_filled',
        'indicator_group',
        'subject_select',
        'school_select',
        'center_select',
      ].includes(field.field_type) && (
        <div className="px-4 py-3 rounded-lg bg-bg-secondary text-text-muted text-sm">
          نوع الحقل غير مدعوم: {field.field_type}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-danger flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}