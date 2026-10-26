// ═══════════════════════════════════════════════════════════
// DeleteSummaryModal — Hard delete confirmation
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';

interface DeleteSummaryModalProps {
  open: boolean;
  summaryTitle: string;
  summaryCreatorName: string;
  totalVisits: number;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function DeleteSummaryModal({
  open,
  summaryTitle,
  summaryCreatorName,
  totalVisits,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteSummaryModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError(t('aggregate_summaries.delete_reason_label'));
      return;
    }
    setError('');
    await onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="w-full max-w-md bg-surface rounded-xl shadow-2xl border border-border">
        <div className="flex items-start gap-3 px-6 py-4 border-b border-border bg-danger/5">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-text">
              {t('aggregate_summaries.confirm_delete_title')}
            </h3>
            <p className="text-xs text-text-muted mt-1">
              {t('aggregate_summaries.confirm_delete_message')}
            </p>
          </div>
          {!isDeleting && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 hover:bg-bg-secondary rounded-lg"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-bg-secondary text-sm">
            <div className="font-medium text-text truncate">{summaryTitle}</div>
            <div className="text-xs text-text-muted mt-1">
              {summaryCreatorName} · {totalVisits}{' '}
              {t('aggregate_summaries.visits_count')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t('aggregate_summaries.delete_reason_label')}{' '}
              <span className="text-danger">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={t('aggregate_summaries.delete_reason_placeholder')}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                error ? 'border-danger' : 'border-border'
              }`}
              disabled={isDeleting}
            />
            {error && <p className="text-xs text-danger mt-1">⚠️ {error}</p>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-bg-secondary flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={handleConfirm}
            loading={isDeleting}
            disabled={isDeleting}
          >
            {t('aggregate_summaries.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeleteSummaryModal;