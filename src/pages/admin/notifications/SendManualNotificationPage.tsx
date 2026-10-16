import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Send, X, CheckCircle2, RotateCcw } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth-store';
import {
  useNotificationComposerStore,
  selectIsStep1Valid,
  selectIsStep2Valid,
} from '../../../stores/notification-composer-store';
import { StepBar } from '../../../components/notifications/StepBar';
import { MessageComposer } from '../../../components/notifications/MessageComposer';
import { RecipientBuilder } from '../../../components/notifications/RecipientBuilder';
import { ReviewSummary } from '../../../components/notifications/ReviewSummary';
import type { ComposerStep } from '../../../types/notifications.types';

// ════════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ════════════════════════════════════════════════════════════

export function SendManualNotificationPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [step, setStep] = useState<ComposerStep>(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    notificationId: string;
    recipientCount: number;
  } | null>(null);

  const store = useNotificationComposerStore();
  const {
    title,
    recipients,
    sending,
    sendError,
    send,
    reset,
    refreshRecipients,
  } = store;

  // ── حساب المستلمين عند الدخول ──
  useEffect(() => {
    if (user?.id) {
      refreshRecipients(user.id);
    }
  }, [user?.id, refreshRecipients]);

  // ── التحقق من كل خطوة ──
  const step1Valid = selectIsStep1Valid(store);
  const step2Valid = selectIsStep2Valid(store);
  const step3Ready = step1Valid && step2Valid && recipients.length > 0;

  const completed = useMemo(() => {
    const s = new Set<ComposerStep>();
    if (step1Valid) s.add(1);
    if (step2Valid && step1Valid) s.add(2);
    if (step3Ready) s.add(3);
    return s;
  }, [step1Valid, step2Valid, step3Ready]);

  // ── الانتقال بين الخطوات ──
  const canGoTo = (target: ComposerStep): boolean => {
    if (target === 1) return true;
    if (target === 2) return step1Valid;
    if (target === 3) return step1Valid && step2Valid;
    return false;
  };

  const goTo = (target: ComposerStep) => {
    if (!canGoTo(target)) return;
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    if (step < 3 && canGoTo((step + 1) as ComposerStep)) {
      goTo((step + 1) as ComposerStep);
    }
  };

  const goPrev = () => {
    if (step > 1) goTo((step - 1) as ComposerStep);
  };

  // ── الإرسال ──
  const handleSendClick = () => {
    if (!step3Ready) return;
    setConfirmOpen(true);
  };

  const confirmSend = async () => {
    const result = await send();
    setConfirmOpen(false);

    if (result && (result.status === 'ok' || result.status === 'duplicate')) {
      setSuccessInfo({
        notificationId: result.notification_id,
        recipientCount: result.recipient_count ?? recipients.length,
      });
    }
  };

  const handleReset = () => {
    reset();
    setStep(1);
    setSuccessInfo(null);
  };

  // ── شاشة النجاح ──
  if (successInfo) {
    return (
      <SuccessScreen
        notificationId={successInfo.notificationId}
        recipientCount={successInfo.recipientCount}
        onViewLog={() => navigate('/settings/notifications/log')}
        onSendAnother={handleReset}
      />
    );
  }

  // ── الواجهة ──
  return (
    <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">إرسال تنبيه مخصص</h1>
          <p className="text-sm text-text-secondary mt-1">
            ثلاث خطوات: الرسالة ← المستلمون ← المراجعة والإرسال
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate('/settings/notifications')}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          عودة
        </Button>
      </div>

      {/* شريط الخطوات */}
      <StepBar current={step} completed={completed} onStepClick={goTo} />

      {/* محتوى الخطوة */}
      {step === 1 && (
        <div className="space-y-4">
          <MessageComposer />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="primary"
              onClick={goNext}
              disabled={!step1Valid}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              التالي: المستلمون
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <RecipientBuilder />

          <div className="flex justify-between gap-3 pt-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={goPrev}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              السابق
            </Button>
            <Button
              variant="primary"
              onClick={goNext}
              disabled={!step2Valid}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              التالي: المراجعة
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <ReviewSummary />

          {sendError && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-start gap-3">
              <X className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-danger">فشل الإرسال</div>
                <div className="text-sm text-text-secondary mt-1">
                  {sendError}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-3 pt-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={goPrev}
              icon={<ArrowRight className="w-4 h-4" />}
              disabled={sending}
            >
              السابق
            </Button>
            <Button
              variant="success"
              onClick={handleSendClick}
              disabled={!step3Ready || sending}
              loading={sending}
              icon={<Send className="w-4 h-4" />}
            >
              {sending
                ? 'جاري الإرسال...'
                : `إرسال إلى ${recipients.length} مستلم`}
            </Button>
          </div>
        </div>
      )}

      {/* مودال التأكيد */}
      <ConfirmModal
        open={confirmOpen}
        title="تأكيد إرسال التنبيه"
        message={
          <div className="space-y-3">
            <p>أنت على وشك إرسال تنبيه بعنوان:</p>
            <p className="font-bold text-text bg-bg-secondary px-3 py-2 rounded-lg">
              {title}
            </p>
            <p>
              إلى <strong className="text-primary">{recipients.length}</strong>{' '}
              مستلمًا.
            </p>
            <p className="text-xs text-text-muted">
              سيتم تثبيت القائمة النهائية الآن، وسيُسجَّل الإرسال في سجل
              التدقيق.
            </p>
          </div>
        }
        confirmText="تأكيد الإرسال"
        cancelText="إلغاء"
        variant="info"
        loading={sending}
        onConfirm={confirmSend}
        onCancel={() => !sending && setConfirmOpen(false)}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// شاشة النجاح
// ════════════════════════════════════════════════════════════

interface SuccessScreenProps {
  notificationId: string;
  recipientCount: number;
  onViewLog: () => void;
  onSendAnother: () => void;
}

function SuccessScreen({
  notificationId,
  recipientCount,
  onViewLog,
  onSendAnother,
}: SuccessScreenProps) {
  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <Card>
        <div className="text-center space-y-6 py-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" strokeWidth={2} />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-text mb-2">
              تم الإرسال بنجاح
            </h2>
            <p className="text-text-secondary">
              تم إرسال التنبيه إلى{' '}
              <strong className="text-primary">{recipientCount}</strong>{' '}
              مستلمًا.
            </p>
          </div>

          <div className="bg-bg-secondary rounded-lg p-4 text-right">
            <div className="text-xs text-text-muted mb-1">معرّف التنبيه:</div>
            <div className="font-mono text-xs text-text break-all">
              {notificationId}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="secondary"
              onClick={onViewLog}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              عرض سجل التنبيهات
            </Button>
            <Button
              variant="primary"
              onClick={onSendAnother}
              icon={<RotateCcw className="w-4 h-4" />}
            >
              إرسال تنبيه آخر
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}