// src/pages/plans/PlanReviewModal.tsx

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui';
import { usePlansStore } from '../../stores/plans-store';
import type { PlanReview } from '../../types/plans';

interface Props {
  planId: string;
  specialistName: string;
  canApprove: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (planId: string, action: 'approve' | 'request_revision' | 'comment', note?: string) => void;
}

export function PlanReviewModal({ planId, specialistName, canApprove, saving, onClose, onSubmit }: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { getPlanReviews } = usePlansStore();

  const [note, setNote] = useState('');
  const [history, setHistory] = useState<PlanReview[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setLoadingHistory(true);
    getPlanReviews(planId).then((data) => { setHistory(data); setLoadingHistory(false); });
  }, [planId, getPlanReviews]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-surface)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--color-text)]">
            {lang === 'ar' ? `مراجعة خطة: ${specialistName}` : `Review Plan: ${specialistName}`}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-sm font-bold text-[var(--color-text-secondary)] block mb-2">
            {lang === 'ar' ? 'ملاحظة (اختياري)' : 'Note (optional)'}
          </label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} className="input w-full" rows={3}
            placeholder={lang === 'ar' ? 'اكتب ملاحظتك هنا...' : 'Write your note here...'} />
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          <Button variant="secondary" icon={<MessageSquare className="w-4 h-4" />}
            onClick={() => onSubmit(planId, 'comment', note)} disabled={saving || !note.trim()}>
            {lang === 'ar' ? 'حفظ ملاحظة فقط' : 'Save Comment Only'}
          </Button>
          <Button variant="secondary" icon={<AlertTriangle className="w-4 h-4" />}
            onClick={() => onSubmit(planId, 'request_revision', note)} disabled={saving || !note.trim()}>
            {lang === 'ar' ? 'طلب تعديل' : 'Request Revision'}
          </Button>
          {canApprove && (
            <Button variant="primary" icon={<CheckCircle className="w-4 h-4" />}
              onClick={() => onSubmit(planId, 'approve', note)} disabled={saving}>
              {lang === 'ar' ? 'اعتماد الخطة' : 'Approve Plan'}
            </Button>
          )}
        </div>

        {!loadingHistory && history.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-[var(--color-text)] mb-2">
              {lang === 'ar' ? 'سجل المراجعات' : 'Review History'}
            </h4>
            <div className="space-y-2">
              {history.map((r) => (
                <div key={r.id} className="p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">{r.reviewerName}</span>
                    <span className="text-[var(--color-text-muted)]">
                      {new Date(r.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                    </span>
                  </div>
                  <div className="text-[var(--color-text-secondary)]">
                    <strong>{r.action}:</strong> {r.note || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}