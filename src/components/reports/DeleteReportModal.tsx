import { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface DeleteReportModalProps {
  isOpen: boolean;
  reportTitle: string;
  reportEntityName: string;
  reportCreatorName: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isDeleting: boolean;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function DeleteReportModal({
  isOpen,
  reportTitle,
  reportEntityName,
  reportCreatorName,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteReportModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setError('');

    if (!reason.trim()) {
      setError('سبب الحذف مطلوب');
      return;
    }

    if (reason.trim().length < 5) {
      setError('السبب يجب أن يكون 5 أحرف على الأقل');
      return;
    }

    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => !isDeleting && onClose()}
    >
      <div
        className="bg-surface rounded-2xl shadow-hard w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-danger" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                حذف نهائي
              </h2>
              <p className="text-xs text-text-muted">
                لا يمكن التراجع عن هذا الإجراء
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Warning */}
          <div className="bg-danger/5 border border-danger/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text">
                <p className="font-semibold text-danger mb-2">
                  ⚠️ تحذير: حذف نهائي
                </p>
                <p className="text-text-secondary">
                  سيتم حذف هذا التقرير <strong>نهائياً</strong> من قاعدة
                  البيانات. جميع النسخ السابقة (Revisions) والمرفقات
                  والروابط ستُحذف أيضاً. <strong>لا يمكن استرجاعه.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Report Info */}
          <div className="bg-bg-secondary rounded-xl p-4 space-y-2">
            <div className="text-xs text-text-muted">
              معلومات التقرير:
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-text-muted">📄</span>
                <span className="font-medium text-text">
                  {reportTitle}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted">🏢</span>
                <span className="text-text">{reportEntityName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted">👤</span>
                <span className="text-text">{reportCreatorName}</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              ⚠️ سبب الحذف <span className="text-danger">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="اكتب سبب حذف هذا التقرير (سيُحفظ في سجل التدقيق)..."
              rows={3}
              disabled={isDeleting}
              autoFocus
              className={`
                w-full px-4 py-2.5 rounded-lg border transition-all resize-none
                bg-surface text-text placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                disabled:opacity-50
                ${error ? 'border-danger' : 'border-border'}
              `}
            />
            <div className="flex items-center justify-between mt-1">
              {error ? (
                <p className="text-xs text-danger flex items-center gap-1">
                  <span>⚠️</span> {error}
                </p>
              ) : (
                <p className="text-xs text-text-muted">
                  السبب سيُحفظ في سجل التدقيق
                </p>
              )}
              <p className="text-xs text-text-muted">
                {reason.length} / 5
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-bg-secondary">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            إلغاء
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={handleConfirm}
            disabled={isDeleting || !reason.trim()}
            loading={isDeleting}
          >
            🗑️ حذف نهائي
          </Button>
        </div>
      </div>
    </div>
  );
}