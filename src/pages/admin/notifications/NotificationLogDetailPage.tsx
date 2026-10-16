import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  ScrollText,
  Loader2,
  AlertCircle,
  User,
  UserX,
  Users,
  Mail,
  MailOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Bell,
  Building2,
  Tag,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { notificationsService } from '../../../services/notifications.service';
import type {
  NotificationDetail,
  NotificationDetailRecipient,
  RecipientSource,
} from '../../../types/notifications.types';

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

const PRIORITY_INFO: Record<string, { label: string; cls: string }> = {
  low: { label: 'منخفضة', cls: 'bg-bg-secondary text-text-muted' },
  normal: { label: 'عادية', cls: 'bg-info/10 text-info' },
  high: { label: 'عالية', cls: 'bg-warning/10 text-warning' },
  urgent: { label: 'عاجلة', cls: 'bg-danger/10 text-danger' },
};

const CHANNEL_INFO: Record<string, { label: string; cls: string }> = {
  in_app: { label: 'داخلي', cls: 'bg-primary/10 text-primary' },
  internal: { label: 'داخلي', cls: 'bg-primary/10 text-primary' },
  email: { label: 'بريد', cls: 'bg-info/10 text-info' },
  both: { label: 'داخلي + بريد', cls: 'bg-success/10 text-success' },
  sms: { label: 'SMS', cls: 'bg-warning/10 text-warning' },
  push: { label: 'Push', cls: 'bg-purple-500/10 text-purple-600' },
};

const STATUS_INFO: Record<
  string,
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  sent: { label: 'أُرسل', cls: 'text-success', icon: CheckCircle2 },
  pending: { label: 'بالانتظار', cls: 'text-warning', icon: Clock },
  failed: { label: 'فشل', cls: 'text-danger', icon: XCircle },
  delivered: { label: 'تم التسليم', cls: 'text-success', icon: CheckCircle2 },
};

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export function NotificationLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<NotificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recipientsOpen, setRecipientsOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState<'' | 'read' | 'unread'>('');

  useEffect(() => {
    if (id) loadDetail(id);
  }, [id]);

  async function loadDetail(notificationId: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsService.getDetail(notificationId);
      if (!data) throw new Error('التنبيه غير موجود');
      setDetail(data);
    } catch (e: any) {
      setError(e?.message ?? 'فشل تحميل التفاصيل');
    } finally {
      setLoading(false);
    }
  }

  // ── تصفية المستلمين ──
  const filteredRecipients = useMemo(() => {
    if (!detail) return [];
    return detail.recipients.filter((r) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          r.full_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.username.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (readFilter === 'read' && !r.is_read) return false;
      if (readFilter === 'unread' && r.is_read) return false;
      return true;
    });
  }, [detail, search, readFilter]);

  // ── الإحصاءات ──
  const stats = useMemo(() => {
    if (!detail) return { total: 0, read: 0, unread: 0, failed: 0 };
    const total = detail.recipients.length;
    const read = detail.recipients.filter((r) => r.is_read).length;
    const failed = detail.recipients.filter(
      (r) => r.delivery_status === 'failed'
    ).length;
    return { total, read, unread: total - read, failed };
  }, [detail]);

  // ════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12 gap-2 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          جاري التحميل...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="flex items-start gap-3 text-danger">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">خطأ</div>
            <div className="text-sm mt-1">{error}</div>
            <Button
              variant="secondary"
              onClick={() => id && loadDetail(id)}
              className="mt-3"
            >
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!detail) return null;

  const n = detail.notification;
  const priorityInfo = n.priority ? PRIORITY_INFO[n.priority] : null;
  const channelInfo = CHANNEL_INFO[n.channel] ?? {
    label: n.channel,
    cls: 'bg-bg-secondary text-text-muted',
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/settings/notifications/log"
            className="
              p-2 rounded-lg border border-border
              hover:bg-bg-secondary transition-colors
            "
            aria-label="عودة"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text">
              تفاصيل التنبيه
            </h1>
            <p className="text-sm text-text-muted mt-0.5 font-mono text-xs">
              {n.id.slice(0, 8)}...{n.id.slice(-8)}
            </p>
          </div>
        </div>
      </div>

      {/* ── بطاقة التنبيه الرئيسية ── */}
      <Card>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-text break-words">
              {n.is_important && (
                <span
                  className="inline-block w-2 h-2 rounded-full bg-danger ml-2 align-middle"
                  title="مهم"
                />
              )}
              {n.title}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {priorityInfo && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${priorityInfo.cls}`}
                >
                  {priorityInfo.label}
                </span>
              )}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${channelInfo.cls}`}
              >
                {channelInfo.label}
              </span>
              {n.source === 'manual' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-bold">
                  يدوي
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  آلي
                </span>
              )}
              {n.is_important && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/10 text-danger font-bold">
                  مهم — لا يُكتم
                </span>
              )}
              {n.category && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted font-mono">
                  {n.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* النص */}
        {n.body && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs font-bold text-text-muted mb-2">
              نص الرسالة:
            </div>
            <div className="bg-bg-secondary rounded-lg p-4 text-sm text-text whitespace-pre-wrap leading-relaxed">
              {n.body}
            </div>
          </div>
        )}

        {/* معلومات المرسل والتاريخ */}
        <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-text-muted mb-1">المرسل</div>
            <div className="flex items-center gap-1.5 text-text">
              {n.created_by_name ? (
                <>
                  <User className="w-3.5 h-3.5 text-text-muted" />
                  <span>{n.created_by_name}</span>
                </>
              ) : (
                <>
                  <UserX className="w-3.5 h-3.5 text-text-muted" />
                  <span>النظام (تلقائي)</span>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-text-muted mb-1">تاريخ الإنشاء</div>
            <div className="text-text">{formatDateTime(n.created_at)}</div>
          </div>

          <div>
            <div className="text-xs text-text-muted mb-1">تاريخ الإرسال</div>
            <div className="text-text">{formatDateTime(n.sent_at)}</div>
          </div>
        </div>

        {/* معرف منع التكرار */}
        {n.idempotency_key && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs font-bold text-text-muted mb-1.5">
              مفتاح منع التكرار (Idempotency)
            </div>
            <div className="font-mono text-xs text-text bg-bg-secondary rounded px-3 py-2 inline-block">
              {n.idempotency_key}
            </div>
          </div>
        )}
      </Card>

      {/* ── إحصاءات ── */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox
            label="إجمالي المستلمين"
            value={stats.total}
            icon={<Users className="w-4 h-4" />}
            variant="primary"
          />
          <StatBox
            label="قرأوا"
            value={stats.read}
            icon={<MailOpen className="w-4 h-4" />}
            variant="success"
          />
          <StatBox
            label="لم يقرأوا"
            value={stats.unread}
            icon={<Mail className="w-4 h-4" />}
            variant="info"
          />
          <StatBox
            label="فشل التسليم"
            value={stats.failed}
            icon={<XCircle className="w-4 h-4" />}
            variant={stats.failed > 0 ? 'danger' : 'default'}
          />
        </div>
      </Card>

      {/* ── النية (Intent) - إن كانت يدوية ── */}
      {n.source === 'manual' && n.intent && (
        <Card>
          <details>
            <summary className="cursor-pointer text-sm font-bold text-text flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              النية المخزّنة (Intent) — كيف اختير المستلمون؟
            </summary>
            <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-3 gap-4 text-xs">
              <IntentBlock
                title="الكيانات المستهدفة"
                icon={<Building2 className="w-3.5 h-3.5" />}
                items={n.intent.entity_ids ?? []}
                emptyLabel="لا توجد"
              />
              <IntentBlock
                title="الأدوار المستهدفة"
                icon={<Tag className="w-3.5 h-3.5" />}
                items={n.intent.role_ids ?? []}
                emptyLabel="لا توجد"
              />
              <IntentBlock
                title="الإضافات اليدوية"
                icon={<User className="w-3.5 h-3.5" />}
                items={n.intent.manual_user_ids ?? []}
                emptyLabel="لا توجد"
                variant="success"
              />
            </div>

            {n.intent.excluded_user_ids &&
              n.intent.excluded_user_ids.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs font-bold text-text-muted mb-2">
                    المستثنون ({n.intent.excluded_user_ids.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {n.intent.excluded_user_ids.map((uid) => (
                      <span
                        key={uid}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-danger/10 text-danger font-mono"
                      >
                        {uid.slice(0, 8)}...
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {n.intent.entity_exclusions &&
              Object.keys(n.intent.entity_exclusions).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs font-bold text-text-muted mb-2">
                    استثناءات داخل الكيانات:
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(n.intent.entity_exclusions).map(
                      ([entityId, userIds]) => (
                        <div key={entityId} className="text-xs">
                          <span className="font-mono text-text-muted">
                            {entityId.slice(0, 8)}...
                          </span>
                          <span className="mx-2">→</span>
                          <span className="text-danger">
                            {userIds.length} مستخدم مستثنى
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </details>
        </Card>
      )}

      {/* ── قائمة المستلمين ── */}
      <Card padding="none">
        <button
          type="button"
          onClick={() => setRecipientsOpen((s) => !s)}
          className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-base font-bold text-text">
              المستلمون ({filteredRecipients.length} من {stats.total})
            </span>
          </div>
          {recipientsOpen ? (
            <ChevronUp className="w-5 h-5 text-text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-muted" />
          )}
        </button>

        {recipientsOpen && (
          <>
            {/* فلاتر */}
            <div className="border-t border-border p-3 bg-bg-secondary/50 flex flex-wrap gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في المستلمين..."
                className="
                  flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-border
                  bg-surface text-text text-sm placeholder:text-text-muted
                  focus:outline-none focus:ring-2 focus:ring-primary/20
                "
              />
              <select
                value={readFilter}
                onChange={(e) => setReadFilter(e.target.value as any)}
                className="
                  px-3 py-2 rounded-lg border border-border
                  bg-surface text-text text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/20
                "
              >
                <option value="">الكل</option>
                <option value="read">قرأوا</option>
                <option value="unread">لم يقرأوا</option>
              </select>
            </div>

            {/* الجدول */}
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-right">
                <thead className="bg-bg-secondary border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      المستلم
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      البريد / الدخول
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      المصادر
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      الحالة
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      القراءة
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecipients.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-text-muted"
                      >
                        لا نتائج مطابقة
                      </td>
                    </tr>
                  ) : (
                    filteredRecipients.map((r) => (
                      <RecipientRow key={r.recipient_id} r={r} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* ── اللقطة الكاملة (Snapshot) ── */}
      {n.snapshot && n.snapshot.length > 0 && (
        <Card>
          <details>
            <summary className="cursor-pointer text-sm font-bold text-text flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              لقطة المستلمين بمصادرهم ({n.snapshot.length})
              <span className="text-xs font-normal text-text-muted">
                — للإجابة عن «لماذا وصل إلى فلان؟»
              </span>
            </summary>
            <div className="mt-4 pt-4 border-t border-border max-h-96 overflow-y-auto space-y-2">
              {n.snapshot.map((entry) => (
                <div
                  key={entry.user_id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-bg-secondary border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-text truncate">
                      {entry.name}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {entry.email}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                    {entry.sources.map((s: RecipientSource, i: number) => (
                      <span
                        key={i}
                        className={`
                          text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap
                          ${s.type === 'entity' ? 'bg-primary/10 text-primary' : ''}
                          ${s.type === 'role' ? 'bg-info/10 text-info' : ''}
                          ${s.type === 'manual' ? 'bg-purple-500/10 text-purple-600' : ''}
                        `}
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════

function StatBox({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'info' | 'warning' | 'danger';
}) {
  const variants = {
    default: 'bg-bg-secondary text-text',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
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

function IntentBlock({
  title,
  icon,
  items,
  emptyLabel,
  variant = 'default',
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  emptyLabel: string;
  variant?: 'default' | 'success';
}) {
  return (
    <div>
      <div className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-1.5">
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-text-muted">{emptyLabel}</div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((id) => (
            <span
              key={id}
              className={`
                text-[10px] px-2 py-0.5 rounded font-mono
                ${variant === 'success' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}
              `}
            >
              {id.slice(0, 8)}...
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipientRow({ r }: { r: NotificationDetailRecipient }) {
  const statusInfo = r.delivery_status
    ? STATUS_INFO[r.delivery_status] ?? {
        label: r.delivery_status,
        cls: 'text-text-muted',
        icon: Clock,
      }
    : null;
  const StatusIcon = statusInfo?.icon ?? Clock;

  return (
    <tr className="hover:bg-bg-secondary/50 transition-colors">
      {/* المستلم */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm text-text truncate">
              {r.full_name}
            </div>
            {!r.is_read && (
              <div className="text-[10px] text-text-muted">لم يقرأ بعد</div>
            )}
          </div>
        </div>
      </td>

      {/* البريد/الدخول */}
      <td className="px-4 py-3">
        <div className="text-xs text-text truncate">{r.email}</div>
        <div className="text-[10px] text-text-muted font-mono">
          {r.username}
        </div>
      </td>

      {/* المصادر */}
      <td className="px-4 py-3">
        <div className="text-[10px] text-text-muted">
          — عرض التفاصيل في اللقطة —
        </div>
      </td>

      {/* الحالة */}
      <td className="px-4 py-3">
        {statusInfo ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${statusInfo.cls}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>

      {/* القراءة */}
      <td className="px-4 py-3">
        {r.is_read ? (
          <div className="flex items-center gap-1 text-xs text-success">
            <MailOpen className="w-3.5 h-3.5" />
            <span>قرأ</span>
            {r.read_at && (
              <span className="text-text-muted mr-1">
                ({formatDateTime(r.read_at)})
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <EyeOff className="w-3.5 h-3.5" />
            <span>لم يقرأ</span>
          </div>
        )}
      </td>
    </tr>
  );
}