import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  icon?: string;
  description?: string;
  accentColor?: 'primary' | 'success' | 'warning' | 'info';
  children: ReactNode;
}

const ACCENT_STYLES = {
  primary: {
    border: 'border-primary/20',
    bg: 'bg-primary/5',
    icon: 'text-primary',
    title: 'text-primary',
  },
  success: {
    border: 'border-success/20',
    bg: 'bg-success/5',
    icon: 'text-success',
    title: 'text-success',
  },
  warning: {
    border: 'border-warning/20',
    bg: 'bg-warning/5',
    icon: 'text-warning',
    title: 'text-warning',
  },
  info: {
    border: 'border-info/20',
    bg: 'bg-info/5',
    icon: 'text-info',
    title: 'text-info',
  },
};

export function FormSection({
  title,
  icon,
  description,
  accentColor = 'primary',
  children,
}: FormSectionProps) {
  const styles = ACCENT_STYLES[accentColor];

  return (
    <div className={`rounded-xl border-2 ${styles.border} overflow-hidden`}>
      {/* Header */}
      <div
        className={`${styles.bg} px-4 sm:px-5 py-3 border-b-2 ${styles.border}`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {icon && (
            <span className="text-xl sm:text-2xl flex-shrink-0">{icon}</span>
          )}
          <div className="min-w-0 flex-1">
            <h3
              className={`text-sm sm:text-base font-bold ${styles.title}`}
            >
              {title}
            </h3>
            {description && (
              <p className="text-xs text-text-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}