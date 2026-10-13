// ================================================
// Types
// ================================================

export interface Indicator {
  num: number;
  text: string;
}

export interface IndicatorGroupOptions {
  indicators: Indicator[];
  scale: string[];
  scale_labels: string[];
}

export interface IndicatorGroupFieldConfig {
  field_key: string;
  field_type: string;
  label_ar: string;
  placeholder?: string | null;
  help_text?: string | null;
  validation_rules?: Record<string, unknown>;
  options?: IndicatorGroupOptions;
}

interface IndicatorGroupFieldProps {
  field: IndicatorGroupFieldConfig;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  error?: string;
  accentColor?: 'primary' | 'success';
}

// ================================================
// Helper — Scale Colors
// ================================================

function getScaleActiveClass(
  scaleValue: string,
  accentColor: 'primary' | 'success'
): string {
  switch (scaleValue) {
    case 'high':
      return accentColor === 'primary'
        ? 'bg-primary text-white border-primary shadow-md scale-[1.02]'
        : 'bg-success text-white border-success shadow-md scale-[1.02]';
    case 'medium':
      return 'bg-warning text-white border-warning shadow-md scale-[1.02]';
    case 'low':
      return 'bg-danger text-white border-danger shadow-md scale-[1.02]';
    default:
      return 'bg-primary text-white border-primary shadow-md scale-[1.02]';
  }
}

// ================================================
// Component
// ================================================

export function IndicatorGroupField({
  field,
  value = {},
  onChange,
  error,
  accentColor = 'success',
}: IndicatorGroupFieldProps) {
  const options = field.options || {
    indicators: [],
    scale: [],
    scale_labels: [],
  };
  const label = field.label_ar;
  const description = field.help_text || undefined;
  const validation = (field.validation_rules || {}) as {
    required?: boolean;
  };

  // ================================================
  // Handlers
  // ================================================

  const handleSelect = (num: number, scaleValue: string) => {
    onChange({
      ...value,
      [String(num)]: scaleValue,
    });
  };

  // ================================================
  // Progress
  // ================================================

  const completed = options.indicators.filter(
    (ind) => value[String(ind.num)]
  ).length;
  const total = options.indicators.length;

  // ⭐ لون العداد حسب accentColor
  const progressColorClass =
    accentColor === 'primary'
      ? 'text-primary bg-primary/10'
      : 'text-success bg-success/10';

  // ⭐ لون رقم المؤشر حسب accentColor
  const numBadgeColorClass =
    accentColor === 'primary' ? 'bg-primary' : 'bg-success';

  // ================================================
  // Render
  // ================================================

  return (
    <div
      className={`space-y-5 p-5 rounded-xl border-2 ${
        error ? 'border-danger bg-danger/5' : 'border-border bg-surface'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b-2 border-border">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-text">
            {label}
            {validation.required && (
              <span className="text-danger mr-1">*</span>
            )}
          </h3>
          {description && (
            <p className="text-sm text-text-secondary mt-2">{description}</p>
          )}
        </div>
        <div
          className={`flex-shrink-0 text-sm font-bold px-3 py-1.5 rounded-lg ${progressColorClass}`}
        >
          {completed} / {total}
        </div>
      </div>

      {/* Indicators */}
      <div className="space-y-4">
        {options.indicators.map((indicator) => {
          const current = value[String(indicator.num)] || '';

          return (
            <div
              key={indicator.num}
              className="p-4 rounded-xl bg-bg-secondary border-2 border-border/60 hover:border-border transition-colors"
            >
              {/* ⭐ نص المؤشر — خط أكبر + أغمق + أعرض */}
              <div className="flex items-start gap-3 mb-4">
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-md ${numBadgeColorClass}`}
                >
                  {indicator.num}
                </span>
                <p className="text-base font-bold text-text leading-relaxed flex-1">
                  {indicator.text}
                </p>
              </div>

              {/* Scale Options */}
              <div className="grid grid-cols-3 gap-2">
               {options.scale
        .map((scaleValue, idx) => ({ scaleValue, idx }))
        .reverse()
        .map(({ scaleValue, idx }) => {
            const isSelected = current === scaleValue;
            const scaleLabel = options.scale_labels[idx] || scaleValue;

            return (
            <button
                key={scaleValue}
                type="button"
                onClick={() =>
                handleSelect(indicator.num, scaleValue)
                }
                className={`
                px-3 py-2.5 rounded-lg text-sm font-semibold
                transition-all duration-200 text-center
                ${
                    isSelected
                    ? getScaleActiveClass(scaleValue, accentColor)
                    : 'bg-surface text-text-secondary border-2 border-border hover:border-primary/40 hover:bg-primary/5'
                }
                `}
            >
                {scaleLabel}
            </button>
            );
        })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {options.indicators.length === 0 && (
        <div className="text-center py-6 text-text-muted text-sm border-2 border-dashed border-border rounded-lg">
          لا توجد مؤشرات لهذا القسم
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