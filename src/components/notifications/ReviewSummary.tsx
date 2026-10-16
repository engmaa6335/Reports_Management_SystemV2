import { AlertCircle, CheckCircle2, Eye, UserCheck, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { useNotificationComposerStore } from '../../stores/notification-composer-store';

export function ReviewSummary() {
  const {
    title,
    body,
    channel,
    priority,
    isImportant,
    intent,
    recipients,
  } = useNotificationComposerStore();

  const channelLabels: Record<string, string> = {
    internal: 'داخل النظام',
    email: 'البريد الإلكتروني',
    both: 'داخل النظام + البريد',
  };

  const priorityLabels: Record<string, string> = {
    low: 'منخفضة',
    normal: 'عادية',
    high: 'عالية',
    urgent: 'عاجلة',
  };

  const manualCount = intent.manual_user_ids.length;
  const excludedCount = intent.excluded_user_ids.length;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-text">ملخص المراجعة</h3>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="العنوان" value={title || '—'} bold />
          <Row label="القناة" value={channelLabels[channel] ?? channel} />
          <Row label="الأولوية" value={priorityLabels[priority] ?? priority} />
          <Row
            label="مهم"
            value={isImportant ? 'نعم — لا يمكن كتمه' : 'لا'}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-text-muted mb-2">نص الرسالة:</div>
          <div className="bg-bg-secondary rounded-lg p-3 text-sm whitespace-pre-wrap text-text">
            {body || '—'}
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            icon={<Users className="w-4 h-4" />}
            label="المستلمون"
            value={recipients.length}
            variant="success"
          />
          <StatBox
            icon={<UserCheck className="w-4 h-4" />}
            label="المصادر"
            value={intent.entity_ids.length + intent.role_ids.length}
            variant="primary"
          />
          <StatBox
            icon={<UserCheck className="w-4 h-4" />}
            label="إضافات يدوية"
            value={manualCount}
            variant="info"
          />
          <StatBox
            icon={<AlertCircle className="w-4 h-4" />}
            label="استثناءات"
            value={excludedCount}
            variant={excludedCount > 0 ? 'warning' : 'default'}
          />
        </div>
      </Card>

      {recipients.length === 0 && (
        <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-danger">لا يوجد مستلمون</p>
            <p className="text-sm text-text-secondary mt-1">
              ارجع للخطوة السابقة وأضف كيانًا أو دورًا أو مستخدمًا.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="text-text-muted flex-shrink-0 w-24">{label}:</span>
      <span className={`flex-1 text-text ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
}) {
  const variants = {
    default: 'bg-bg-secondary text-text',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  };
  return (
    <div className={`rounded-lg p-3 ${variants[variant]}`}>
      <div className="flex items-center gap-2 text-xs opacity-80 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}