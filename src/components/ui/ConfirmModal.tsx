import { X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Button } from './index';

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANTS: Record<
  ConfirmVariant,
  {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    buttonVariant: 'danger' | 'primary' | 'warning';
  }
> = {
  danger: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconBg: 'bg-danger/10',
    iconColor: 'text-danger',
    buttonVariant: 'danger',
  },
  warning: {
    icon: <AlertCircle className="w-6 h-6" />,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    buttonVariant: 'warning',
  },
  info: {
    icon: <Info className="w-6 h-6" />,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    buttonVariant: 'primary',
  },
  success: {
    icon: <Info className="w-6 h-6" />,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    buttonVariant: 'primary',
  },
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'warning',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const config = VARIANTS[variant];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-6 pb-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${config.iconBg} ${config.iconColor}`}
          >
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-text mb-1">{title}</h3>
            <div className="text-sm text-text-secondary leading-relaxed">
              {message}
            </div>
          </div>
          {!loading && (
            <button
              onClick={onCancel}
              className="flex-shrink-0 p-1.5 hover:bg-bg-secondary rounded-lg transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-bg-secondary border-t border-border">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            disabled={loading}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}