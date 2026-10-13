import { useState } from 'react';
import { AlertTriangle, Trash2, PowerOff, X } from 'lucide-react';
import { Button } from '../../components/ui';
import type { DeleteTemplateCheck } from '../../types/templates-admin';

interface DeleteTemplateModalProps {
  isOpen: boolean;
  templateName: string;
  checkResult: DeleteTemplateCheck | null;
  onClose: () => void;
  onSoftDelete: () => Promise<void>;
  onCascadeDelete: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteTemplateModal({
  isOpen,
  templateName,
  checkResult,
  onClose,
  onSoftDelete,
  onCascadeDelete,
  isDeleting,
}: DeleteTemplateModalProps) {
  const [mode, setMode] = useState<'soft' | 'cascade' | null>(null);
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const reportsCount = checkResult?.reportsCount || 0;
  const hasReports = reportsCount > 0;

  const handleConfirm = async () => {
    if (mode === 'soft') {
      await onSoftDelete();
    } else if (mode === 'cascade') {
      if (confirmText !== 'DELETE') return;
      await onCascadeDelete();
    }
  };

  const canConfirm =
    mode === 'soft' || (mode === 'cascade' && confirmText === 'DELETE');

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4 border-b border-border">
          <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-warning/10 text-warning">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-text mb-1">
              حذف القالب
            </h3>
            <p className="text-sm text-text-secondary">
              <strong className="text-text">"{templateName}"</strong>
            </p>
          </div>
          {!isDeleting && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-bg-secondary rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          {hasReports && (
            <div className="p-4 rounded-lg bg-warning/5 border border-warning/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm text-warning">
                  <strong>يوجد {reportsCount} تقرير مرتبط بهذا القالب!</strong>
                  <p className="text-xs mt-1">
                    اختر طريقة الحذف بحذر
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mode Selection */}
          {!hasReports ? (
            <div className="text-sm text-text-secondary">
              هل أنت متأكد من حذف هذا القالب؟ لا يوجد تقارير مرتبطة به.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-text">
                اختر طريقة الحذف:
              </p>

              {/* Option: Soft Delete */}
              <button
                onClick={() => setMode('soft')}
                className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
                  mode === 'soft'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center flex-shrink-0">
                    <PowerOff className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text">
                      تعطيل القالب (Soft Delete)
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      القالب يختفي من القوائم لكن التقارير تبقى محفوظة.
                      يمكنك إعادة تفعيله لاحقاً.
                    </p>
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-success/10 text-success">
                      ✅ آمن
                    </span>
                  </div>
                </div>
              </button>

              {/* Option: Cascade Delete */}
              <button
                onClick={() => setMode('cascade')}
                className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
                  mode === 'cascade'
                    ? 'border-danger bg-danger/5'
                    : 'border-border hover:border-danger/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-danger/10 text-danger flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text">
                      حذف نهائي مع التقارير
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      سيتم حذف القالب و <strong className="text-danger">
                      {reportsCount} تقرير</strong> مرتبط به نهائياً.
                      لا يمكن التراجع!
                    </p>
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-danger/10 text-danger">
                      ⚠️ خطير
                    </span>
                  </div>
                </div>
              </button>

              {/* Confirm Text for Cascade */}
              {mode === 'cascade' && (
                <div className="mt-3 pt-3 border-t border-border">
                  <label className="block text-xs font-medium text-text mb-2">
                    للتأكيد، اكتب <strong className="text-danger font-mono">
                    DELETE</strong> بالضبط:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text font-mono focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger"
                    dir="ltr"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-bg-secondary border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            إلغاء
          </Button>
          <Button
            variant={mode === 'cascade' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={!canConfirm || isDeleting}
            loading={isDeleting}
          >
            {mode === 'soft'
              ? 'نعم، عطّل'
              : mode === 'cascade'
              ? 'نعم، احذف نهائياً'
              : 'تأكيد'}
          </Button>
        </div>
      </div>
    </div>
  );
}