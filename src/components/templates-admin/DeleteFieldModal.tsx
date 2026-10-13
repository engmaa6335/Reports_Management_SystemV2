import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui';

interface DeleteFieldModalProps {
  isOpen: boolean;
  fieldName: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteFieldModal({
  isOpen,
  fieldName,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteFieldModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4 border-b border-border">
          <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-danger/10 text-danger">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-text mb-1">
              حذف الحقل
            </h3>
            <p className="text-sm text-text-secondary">
              <strong className="text-text">"{fieldName}"</strong>
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
        <div className="p-6">
          <div className="p-4 rounded-lg bg-warning/5 border border-warning/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm text-warning">
                <strong>تحذير:</strong> سيتم حذف الحقل نهائياً.
                <p className="text-xs mt-1">
                  💡 لن يؤثر ذلك على التقارير المنشأة سابقاً.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-bg-secondary border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            إلغاء
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={onConfirm}
            disabled={isDeleting}
            loading={isDeleting}
          >
            نعم، احذف
          </Button>
        </div>
      </div>
    </div>
  );
}