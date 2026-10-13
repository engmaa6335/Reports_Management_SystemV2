import { Lock } from 'lucide-react';

interface AutoFilledFieldProps {
  label: string;
  value: string;
  hint?: string;
  editable?: boolean;
  type?: 'text' | 'date' | 'datetime';
  onChange?: (v: string) => void;
}

function formatDate(dateStr: string, type: 'date' | 'datetime'): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (type === 'datetime') {
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function AutoFilledField({
  label,
  value,
  hint,
  editable = false,
  type = 'text',
  onChange,
}: AutoFilledFieldProps) {
  const displayValue =
    type === 'date' || type === 'datetime'
      ? formatDate(value, type)
      : value || '—';

  // ⭐ حقل للقراءة فقط — مع تمييز بصري
  if (!editable) {
    return (
      <div className="space-y-2">
        {/* Label مع أيقونة القفل */}
        <label className="flex items-center gap-1.5 text-sm font-medium text-text">
          <Lock className="w-3.5 h-3.5 text-info flex-shrink-0" />
          <span>{label}</span>
          <span className="text-xs text-text-muted font-normal">
            (تلقائي)
          </span>
        </label>

        {/* Value مع خلفية تمييز */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-info/20 bg-info/5">
          <span className="text-text font-medium flex-1 min-w-0 truncate">
            {displayValue}
          </span>
          <span className="text-xs text-info/70 flex-shrink-0">🔒</span>
        </div>

        {hint && (
          <p className="text-xs text-text-muted">{hint}</p>
        )}
      </div>
    );
  }

  // ⭐ حقل قابل للتعديل
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-sm font-medium text-text">
        <Lock className="w-3.5 h-3.5 text-info flex-shrink-0" />
        <span>{label}</span>
        <span className="text-xs text-text-muted font-normal">
          (تلقائي - قابل للتعديل)
        </span>
      </label>

      <input
        type={
          type === 'date'
            ? 'date'
            : type === 'datetime'
            ? 'datetime-local'
            : 'text'
        }
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg border-2 border-info/30 bg-info/5 text-text focus:outline-none focus:ring-2 focus:ring-info/30 focus:border-info"
      />

      {hint && (
        <p className="text-xs text-text-muted">{hint}</p>
      )}
    </div>
  );
}