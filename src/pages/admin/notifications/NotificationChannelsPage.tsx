import { useEffect, useState } from 'react';
import {
  Settings,
  Bell,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Lock,
  Loader2,
  AlertCircle,
  Save,
  Info,
  BarChart3,
  Clock,
  Shield,
  RefreshCw,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/auth-store';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

interface ChannelInfo {
  id: string;
  label: string;
  description: string;
  icon: typeof Bell;
  status: 'active' | 'not_configured' | 'coming_soon';
  color: 'success' | 'warning' | 'muted';
  details?: string[];
}

interface SystemSettings {
  // البريد
  email_provider: string;
  email_from_name: string;
  email_from_address: string;
  email_reply_to: string;

  // السياسات
  throttle_window_minutes: number;
  ignore_trivial_edits_default: boolean;
  max_recipients_per_send: number;
  default_priority: string;
  retention_days: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  email_provider: '',
  email_from_name: 'نظام التقارير التربوية',
  email_from_address: '',
  email_reply_to: '',
  throttle_window_minutes: 5,
  ignore_trivial_edits_default: true,
  max_recipients_per_send: 1000,
  default_priority: 'normal',
  retention_days: 365,
};

const CHANNELS: ChannelInfo[] = [
  {
    id: 'in_app',
    label: 'الإشعار الداخلي',
    description: 'قناة داخلية مدمجة مع صندوق إشعارات المستخدم في النظام',
    icon: Bell,
    status: 'active',
    color: 'success',
    details: [
      'تُخزَّن في جدول notification_recipients',
      'تظهر فوريًا في جرس التنبيهات',
      'لا تحتاج مزودًا خارجيًا',
    ],
  },
  {
    id: 'email',
    label: 'البريد الإلكتروني',
    description: 'إرسال نسخة بريدية إلى المستلمين (يتطلب تهيئة مزود)',
    icon: Mail,
    status: 'not_configured',
    color: 'warning',
    details: [
      'يحتاج مزود بريد (SMTP / Resend / SendGrid)',
      'يستخدم قوالب email_templates',
      'يدعم المرفقات في المرحلة 3',
    ],
  },
  {
    id: 'sms',
    label: 'الرسائل النصية (SMS)',
    description: 'إرسال تنبيهات عاجلة عبر SMS',
    icon: MessageSquare,
    status: 'coming_soon',
    color: 'muted',
    details: ['يتطلب مزود SMS معتمد', 'يُنفَّذ في المرحلة 3'],
  },
  {
    id: 'push',
    label: 'الإشعارات الفورية (Push)',
    description: 'إشعارات المتصفح والجوال',
    icon: Send,
    status: 'coming_soon',
    color: 'muted',
    details: ['يتطلب Service Worker + FCM', 'يُنفَّذ في المرحلة 3'],
  },
];

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export function NotificationChannelsPage() {
  const { user } = useAuthStore();

  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // إحصاءات
  const [stats, setStats] = useState({
    totalNotifications: 0,
    thisMonth: 0,
    totalRecipients: 0,
    readRate: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // ── تحميل الإعدادات والإحصاءات ──
  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'notifications.email_provider',
          'notifications.email_from_name',
          'notifications.email_from_address',
          'notifications.email_reply_to',
          'notifications.throttle_window_minutes',
          'notifications.ignore_trivial_edits_default',
          'notifications.max_recipients_per_send',
          'notifications.default_priority',
          'notifications.retention_days',
        ]);

      if (fetchError) throw fetchError;

      const map = new Map<string, any>();
      for (const row of data ?? []) {
        const key = (row as any).key.replace('notifications.', '');
        map.set(key, (row as any).value);
      }

      setSettings({
        email_provider: map.get('email_provider') ?? DEFAULT_SETTINGS.email_provider,
        email_from_name:
          map.get('email_from_name') ?? DEFAULT_SETTINGS.email_from_name,
        email_from_address:
          map.get('email_from_address') ?? DEFAULT_SETTINGS.email_from_address,
        email_reply_to:
          map.get('email_reply_to') ?? DEFAULT_SETTINGS.email_reply_to,
        throttle_window_minutes:
          Number(map.get('throttle_window_minutes')) ||
          DEFAULT_SETTINGS.throttle_window_minutes,
        ignore_trivial_edits_default:
          map.get('ignore_trivial_edits_default') ??
          DEFAULT_SETTINGS.ignore_trivial_edits_default,
        max_recipients_per_send:
          Number(map.get('max_recipients_per_send')) ||
          DEFAULT_SETTINGS.max_recipients_per_send,
        default_priority:
          map.get('default_priority') ?? DEFAULT_SETTINGS.default_priority,
        retention_days:
          Number(map.get('retention_days')) || DEFAULT_SETTINGS.retention_days,
      });
    } catch (e: any) {
      setError(e?.message ?? 'فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      // إجمالي التنبيهات
      const { count: totalCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });

      // تنبيهات هذا الشهر
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { count: monthCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString());

      // إجمالي المستلمين
      const { count: recipientCount } = await supabase
        .from('notification_recipients')
        .select('*', { count: 'exact', head: true });

      // عدد من قرأوا
      const { count: readCount } = await supabase
        .from('notification_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', true);

      const readRate =
        recipientCount && recipientCount > 0
          ? Math.round(((readCount ?? 0) / recipientCount) * 100)
          : 0;

      setStats({
        totalNotifications: totalCount ?? 0,
        thisMonth: monthCount ?? 0,
        totalRecipients: recipientCount ?? 0,
        readRate,
      });
    } catch (e: any) {
      console.error('Failed to load stats:', e);
    } finally {
      setStatsLoading(false);
    }
  }

  // ── حفظ الإعدادات ──
  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updates = [
        { key: 'notifications.email_provider', value: settings.email_provider, category: 'notifications', value_type: 'string' },
        { key: 'notifications.email_from_name', value: settings.email_from_name, category: 'notifications', value_type: 'string' },
        { key: 'notifications.email_from_address', value: settings.email_from_address, category: 'notifications', value_type: 'string' },
        { key: 'notifications.email_reply_to', value: settings.email_reply_to, category: 'notifications', value_type: 'string' },
        { key: 'notifications.throttle_window_minutes', value: settings.throttle_window_minutes, category: 'notifications', value_type: 'number' },
        { key: 'notifications.ignore_trivial_edits_default', value: settings.ignore_trivial_edits_default, category: 'notifications', value_type: 'boolean' },
        { key: 'notifications.max_recipients_per_send', value: settings.max_recipients_per_send, category: 'notifications', value_type: 'number' },
        { key: 'notifications.default_priority', value: settings.default_priority, category: 'notifications', value_type: 'string' },
        { key: 'notifications.retention_days', value: settings.retention_days, category: 'notifications', value_type: 'number' },
      ];

      // upsert لكل مفتاح
      for (const item of updates) {
        const { error: upsertError } = await supabase
          .from('system_settings')
          .upsert(
            {
              key: item.key,
              value: item.value,
              category: item.category,
              value_type: item.value_type,
              updated_by: user?.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          );

        if (upsertError) throw upsertError;
      }

      setSuccessMsg('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setError(e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  // ── تحديث حقل ──
  const setField = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4" dir="rtl">
      {/* رأس */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">إعدادات الإرسال</h2>
              <p className="text-sm text-text-muted mt-0.5">
                إدارة القنوات، السياسات العامة، والإحصاءات
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* رسائل النجاح/الخطأ */}
      {successMsg && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div className="text-sm text-success font-medium">{successMsg}</div>
        </div>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-danger">خطأ</div>
            <div className="text-sm text-text-secondary mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* ─── الإحصاءات ─── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-text">
              إحصاءات سريعة
            </h2>
          </div>
          <button
            type="button"
            onClick={loadStats}
            disabled={statsLoading}
            className="p-2 rounded-lg text-text-muted hover:bg-bg-secondary transition-colors disabled:opacity-50"
            title="تحديث"
          >
            <RefreshCw
              className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox
            label="إجمالي التنبيهات"
            value={stats.totalNotifications}
            icon={<Bell className="w-4 h-4" />}
            variant="primary"
          />
          <StatBox
            label="هذا الشهر"
            value={stats.thisMonth}
            icon={<TrendingUp className="w-4 h-4" />}
            variant="info"
          />
          <StatBox
            label="إجمالي المستلمين"
            value={stats.totalRecipients}
            icon={<Send className="w-4 h-4" />}
            variant="warning"
          />
          <StatBox
            label="نسبة القراءة"
            value={stats.readRate}
            suffix="%"
            icon={<Eye className="w-4 h-4" />}
            variant="success"
          />
        </div>
      </Card>

      {/* ─── قنوات الإرسال ─── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text">قنوات الإرسال</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {CHANNELS.map((c) => (
            <ChannelCard key={c.id} channel={c} />
          ))}
        </div>
      </Card>

      {/* ─── إعدادات البريد (اختيارية) ─── */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text">إعدادات البريد</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-bold">
            اختياري — القناة غير مهيأة بعد
          </span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            هذه الإعدادات محفوظة في قاعدة البيانات، لكن لن تُنفَّذ إلا عند
            تهيئة مزود البريد على الخادم (Supabase Edge Function).
            تُخزَّن هنا للاستخدام المستقبلي.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري التحميل...
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                مزود البريد
              </label>
              <select
                value={settings.email_provider}
                onChange={(e) => setField('email_provider', e.target.value)}
                className="
                  w-full px-4 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20
                "
              >
                <option value="">— لم يُحدَّد بعد —</option>
                <option value="resend">Resend</option>
                <option value="sendgrid">SendGrid</option>
                <option value="smtp">SMTP مخصص</option>
                <option value="supabase">Supabase Auth Email</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                اسم المرسل
              </label>
              <input
                type="text"
                value={settings.email_from_name}
                onChange={(e) => setField('email_from_name', e.target.value)}
                placeholder="نظام التقارير التربوية"
                className="
                  w-full px-4 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20
                "
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                بريد المرسل
              </label>
              <input
                type="email"
                value={settings.email_from_address}
                onChange={(e) =>
                  setField('email_from_address', e.target.value)
                }
                placeholder="no-reply@edc.ps"
                className="
                  w-full px-4 py-2.5 rounded-lg border border-border
                  bg-surface text-text font-mono text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/20
                "
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                بريد الرد (Reply-To)
              </label>
              <input
                type="email"
                value={settings.email_reply_to}
                onChange={(e) => setField('email_reply_to', e.target.value)}
                placeholder="support@edc.ps"
                className="
                  w-full px-4 py-2.5 rounded-lg border border-border
                  bg-surface text-text font-mono text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/20
                "
              />
            </div>
          </div>
        )}
      </Card>

      {/* ─── السياسات العامة ─── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text">السياسات العامة</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              نافذة التهدئة الافتراضية (دقائق)
            </label>
            <input
              type="number"
              min={0}
              max={1440}
              value={settings.throttle_window_minutes}
              onChange={(e) =>
                setField(
                  'throttle_window_minutes',
                  parseInt(e.target.value) || 0
                )
              }
              className="
                w-full px-4 py-2.5 rounded-lg border border-border
                bg-surface text-text
                focus:outline-none focus:ring-2 focus:ring-primary/20
              "
            />
            <p className="text-xs text-text-muted mt-1">
              تُجمَّع الأحداث المتكررة خلال هذه النافذة في تنبيه واحد.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              الحد الأقصى للمستلمين في الإرسال الواحد
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              value={settings.max_recipients_per_send}
              onChange={(e) =>
                setField(
                  'max_recipients_per_send',
                  parseInt(e.target.value) || 1
                )
              }
              className="
                w-full px-4 py-2.5 rounded-lg border border-border
                bg-surface text-text
                focus:outline-none focus:ring-2 focus:ring-primary/20
              "
            />
            <p className="text-xs text-text-muted mt-1">
              حماية ضد الإرسال الجماعي غير المقصود.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              الأولوية الافتراضية
            </label>
            <select
              value={settings.default_priority}
              onChange={(e) => setField('default_priority', e.target.value)}
              className="
                w-full px-4 py-2.5 rounded-lg border border-border
                bg-surface text-text
                focus:outline-none focus:ring-2 focus:ring-primary/20
              "
            >
              <option value="low">منخفضة</option>
              <option value="normal">عادية</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              مدة الاحتفاظ بالسجل (أيام)
            </label>
            <input
              type="number"
              min={30}
              max={3650}
              value={settings.retention_days}
              onChange={(e) =>
                setField('retention_days', parseInt(e.target.value) || 365)
              }
              className="
                w-full px-4 py-2.5 rounded-lg border border-border
                bg-surface text-text
                focus:outline-none focus:ring-2 focus:ring-primary/20
              "
            />
            <p className="text-xs text-text-muted mt-1">
              التنبيهات الأقدم من هذه المدة قد تُحذف تلقائيًا.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-bg-secondary transition-colors">
              <input
                type="checkbox"
                checked={settings.ignore_trivial_edits_default}
                onChange={(e) =>
                  setField('ignore_trivial_edits_default', e.target.checked)
                }
                className="w-4 h-4 rounded accent-primary"
              />
              <div>
                <div className="text-sm font-medium text-text">
                  تجاهل التعديلات الطفيفة افتراضيًا
                </div>
                <div className="text-xs text-text-muted">
                  في القواعد الآلية، لا تُرسل تنبيهات للتعديلات الصغيرة على
                  التقارير.
                </div>
              </div>
            </label>
          </div>
        </div>
      </Card>

      {/* ─── زر الحفظ ─── */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Clock className="w-4 h-4" />
            <span>
              آخر تحديث:{' '}
              {new Date().toLocaleString('ar-EG', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={loadSettings}
              disabled={saving || loading}
            >
              إعادة تحميل
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={loading}
              icon={<Save className="w-4 h-4" />}
            >
              حفظ الإعدادات
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════

function ChannelCard({ channel }: { channel: ChannelInfo }) {
  const Icon = channel.icon;

  const statusConfig = {
    active: {
      label: 'مُفعَّل',
      badgeCls: 'bg-success/10 text-success',
      icon: CheckCircle2,
      cardCls: 'border-success/30',
      iconBg: 'bg-success/10 text-success',
    },
    not_configured: {
      label: 'غير مهيأ',
      badgeCls: 'bg-warning/10 text-warning',
      icon: Lock,
      cardCls: 'border-warning/30',
      iconBg: 'bg-warning/10 text-warning',
    },
    coming_soon: {
      label: 'قريبًا',
      badgeCls: 'bg-text-muted/10 text-text-muted',
      icon: Clock,
      cardCls: 'border-border opacity-70',
      iconBg: 'bg-bg-secondary text-text-muted',
    },
  }[channel.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`bg-surface border rounded-xl p-5 ${statusConfig.cardCls}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0
            ${statusConfig.iconBg}
          `}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-text">{channel.label}</h3>
            <span
              className={`
                inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold
                ${statusConfig.badgeCls}
              `}
            >
              <StatusIcon className="w-2.5 h-2.5" />
              {statusConfig.label}
            </span>
          </div>

          <p className="text-sm text-text-muted leading-relaxed">
            {channel.description}
          </p>

          {channel.details && channel.details.length > 0 && (
            <ul className="mt-3 space-y-1">
              {channel.details.map((d, i) => (
                <li
                  key={i}
                  className="text-xs text-text-muted flex items-start gap-1.5"
                >
                  <span className="text-primary mt-0.5">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  variant = 'default',
  suffix = '',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'info' | 'warning' | 'danger';
  suffix?: string;
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
      <div className="text-2xl font-bold">
        {value}
        {suffix && <span className="text-sm mr-1">{suffix}</span>}
      </div>
    </div>
  );
}