import { useEffect, useState } from 'react';
import { AlertCircle, Info, Mail, Bell } from 'lucide-react';
import { Card } from '../ui/Card';
import { useNotificationComposerStore } from '../../stores/notification-composer-store';
import type { NotificationChannel } from '../../types/notifications.types';

const TITLE_MAX = 100;

const CHANNELS: Array<{
  value: NotificationChannel;
  label: string;
  icon: typeof Bell;
  available: boolean;
  hint?: string;
}> = [
  { value: 'internal', label: 'داخل النظام', icon: Bell, available: true },
  { value: 'email', label: 'البريد الإلكتروني', icon: Mail, available: false, hint: 'غير مهيأ بعد' },
  { value: 'both', label: 'كلاهما', icon: Mail, available: false, hint: 'يتطلب تهيئة البريد' },
];

const TEMPLATES = [
  {
    code: 'welcome',
    label: 'ترحيب بمستخدم جديد',
    title: 'مرحبًا بك في نظام التقارير التربوية',
    body: 'نرحب بانضمامك إلى نظام التقارير التربوية. نتمنى لك تجربة موفقة.\n\nمع تحيات فريق الدعم الفني.',
  },
  {
    code: 'reminder',
    label: 'تذكير بتسليم تقرير',
    title: 'تذكير بتسليم التقرير',
    body: 'عزيزي {{actor_name}}،\nنذكركم بضرورة تسليم تقرير {{report_title}} قبل {{deadline}}.\nشكرًا لتعاونكم.',
  },
];

export function MessageComposer() {
  const {
    title, setTitle,
    body, setBody,
    channel, setChannel,
    priority, setPriority,
    isImportant, setIsImportant,
  } = useNotificationComposerStore();

  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});

  useEffect(() => {
    const next: typeof errors = {};
    if (title.length > 0 && title.trim().length < 3) {
      next.title = 'العنوان قصير جدًا';
    }
    if (body.length > 0 && body.trim().length < 5) {
      next.body = 'النص قصير جدًا';
    }
    setErrors(next);
  }, [title, body]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-5">
          <div>
            <label htmlFor="title" className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text">
                عنوان التنبيه <span className="text-danger">*</span>
              </span>
              <span className={`text-xs ${title.length > TITLE_MAX * 0.9 ? 'text-warning' : 'text-text-muted'}`}>
                {title.length} / {TITLE_MAX}
              </span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="مثال: تذكير بتسليم التقرير الأسبوعي"
              className={`
                w-full px-4 py-2.5 rounded-lg border transition-all
                bg-surface text-text placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                ${errors.title ? 'border-danger' : 'border-border'}
              `}
            />
            {errors.title && (
              <p className="text-xs text-danger mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="body" className="block text-sm font-medium text-text mb-2">
              نص الرسالة <span className="text-danger">*</span>
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="اكتب تفاصيل التنبيه هنا..."
              rows={6}
              className={`
                w-full px-4 py-3 rounded-lg border transition-all resize-y
                bg-surface text-text placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                ${errors.body ? 'border-danger' : 'border-border'}
              `}
            />
            {errors.body ? (
              <p className="text-xs text-danger mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.body}
              </p>
            ) : (
              <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1">
                <Info className="w-3 h-3" />
                المتغيرات المسموحة: {'{{actor_name}}'}، {'{{entity_name}}'}،{' '}
                {'{{event_date}}'}، {'{{deadline}}'}، {'{{report_title}}'}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              قناة الإرسال
            </label>
            <div className="flex gap-2">
              {CHANNELS.map((c) => {
                const Icon = c.icon;
                const isActive = channel === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    disabled={!c.available}
                    onClick={() => c.available && setChannel(c.value)}
                    title={c.hint}
                    className={`
                      flex-1 flex items-center justify-center gap-2
                      px-3 py-2.5 rounded-lg border text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-primary text-white border-primary shadow-soft'
                        : c.available
                        ? 'bg-surface text-text border-border hover:border-primary'
                        : 'bg-bg-secondary text-text-muted border-border cursor-not-allowed opacity-60'}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {c.label}
                    {!c.available && <span className="text-xs">🔒</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-text-muted mt-2">
              القناة الداخلية متاحة. البريد غير مهيأ حاليًا.
            </p>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-text mb-2">
              الأولوية
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="
                w-full px-4 py-2.5 rounded-lg border border-border
                bg-surface text-text
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              "
            >
              <option value="low">منخفضة</option>
              <option value="normal">عادية</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </select>

            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm text-text">
                مهم — لا يمكن كتمه من المستخدم
              </span>
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <label className="block text-sm font-medium text-text mb-2">
          قالب جاهز (اختياري)
        </label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => {
                setTitle(t.title);
                setBody(t.body);
              }}
              className="
                px-4 py-2 rounded-lg border border-border
                bg-surface text-text text-sm
                hover:border-primary hover:bg-primary/5 transition-colors
              "
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setTitle('');
              setBody('');
            }}
            className="
              px-4 py-2 rounded-lg border border-border
              bg-surface text-text-muted text-sm
              hover:border-danger hover:text-danger transition-colors
            "
          >
            تفريغ
          </button>
        </div>
      </Card>
    </div>
  );
}