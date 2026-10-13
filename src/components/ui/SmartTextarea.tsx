import { useRef, useEffect } from 'react';
import type { TextareaHTMLAttributes } from 'react';

// ═══════════════════════════════════════════════════════════
// SmartTextarea — عرض ثابت + تمدد عمودي حسب المحتوى
// ═══════════════════════════════════════════════════════════

interface SmartTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
}

export function SmartTextarea({
  value,
  onChange,
  minRows = 2,
  className = '',
  ...rest
}: SmartTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // ⭐ يتمدد عمودياً حسب المحتوى (بدون تمدد أفقي)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const lineHeight = 22;
    const padding = 20;
    const minHeight = minRows * lineHeight + padding;

    // أعد ضبط الارتفاع لحساب الارتفاع الفعلي
    el.style.height = 'auto';

    // الارتفاع الحقيقي (بعد الالتفاف)
    const contentHeight = el.scrollHeight;

    el.style.height = `${Math.max(contentHeight, minHeight)}px`;
    el.style.overflowY = 'hidden';
  }, [value, minRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={minRows}
      wrap="soft"
      className={`
        w-full max-w-full px-3 py-2.5 rounded-lg border border-border
        bg-surface text-text placeholder:text-text-muted
        text-sm leading-relaxed
        resize-none
        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
        print:!h-auto print:!min-h-fit print:!overflow-visible print:resize-none
        ${className}
      `}
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}
      {...rest}
    />
  );
}

export default SmartTextarea;