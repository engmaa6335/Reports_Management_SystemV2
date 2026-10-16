import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScrollText,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  Eye,
  User,
  UserX,
  Mail,
  MailOpen,
  Users,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { notificationsService } from '../../../services/notifications.service';
import type { NotificationLogEntry } from '../../../types/notifications.types';

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return date.toLocaleString('ar-EG', {
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

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return formatDateTime(iso);
}

const PRIORITY_INFO: Record<string, { label: string; cls: string }> = {
  low: { label: 'منخفضة', cls: 'bg-bg-secondary text-text-muted' },
  normal: { label: 'عادية', cls: 'bg-info/10 text-info' },
  high: { label: 'عالية', cls: 'bg-warning/10 text-warning' },
  urgent: { label: 'عاجلة', cls: 'bg-danger/10 text-danger' },
};

const SOURCE_INFO: Record<string, { label: string; cls: string }> = {
  manual: { label: 'يدوي', cls: 'bg-purple-500/10 text-purple-600' },
  automatic: { label: 'آلي', cls: 'bg-primary/10 text-primary' },
};

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export function NotificationLogPage() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // الفلاتر
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'' | 'manual' | 'automatic'>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // التصفح
  const [offset, setOffset] = useState(0);
  const LIMIT = 30;
  const [totalCount, setTotalCount] = useState(0);

  // ── جلب البيانات ──
  useEffect(() => {
    loadLog();
  }, [sourceFilter, fromDate, toDate, offset]);

  async function loadLog() {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsService.listLog({
        source: sourceFilter || undefined,
        search: search.trim() || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate + 'T23:59:59').toISOString() : undefined,
        limit: LIMIT,
        offset,
      });

      setEntries(data);

      // استخراج total_count من أول صف
      if (data.length > 0) {
        setTotalCount(Number((data[0] as any).total_count ?? data.length));
      } else {
        setTotalCount(0);
      }
    } catch (e: any) {
      setError(e?.message ?? 'فشل تحميل السجل');
    } finally {
      setLoading(false);
    }
  }

  // ── إعادة الجلب عند تغيير البحث (debounce) ──
  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0);
      loadLog();
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── مسح الفلاتر ──
  function clearFilters() {
    setSearch('');
    setSourceFilter('');
    setFromDate('');
    setToDate('');
    setOffset(0);
  }

  const hasFilters = !!(search || sourceFilter || fromDate || toDate);

  // ════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* رأس */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">سجل التنبيهات</h2>
              <p className="text-sm text-text-muted mt-0.5">
                سجل تدقيق كامل لكل التنبيهات المُرسلة (يدوية وآلية)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className={`
                inline-flex items-center gap-2 px-3 py-2.5 rounded-lg
                border text-sm font-medium transition-colors
                ${showFilters
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text border-border hover:bg-bg-secondary'}
              `}
            >
              <Filter className="w-4 h-4" />
              فلترة
            </button>

            <button
              type="button"
              onClick={loadLog}
              disabled={loading}
              className="
                p-2.5 rounded-lg border border-border
                text-text-muted hover:bg-bg-secondary
                transition-colors disabled:opacity-50
              "
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* الفلاتر المتقدمة */}
      {showFilters && (
        <Card>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-text-muted mb-1.5">
                بحث
              </label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="عنوان، نص..."
                  className="
                    w-full pr-10 pl-4 py-2.5 rounded-lg border border-border
                    bg-surface text-text placeholder:text-text-muted
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                  "
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5">
                المصدر
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value as any);
                  setOffset(0);
                }}
                className="
                  w-full px-3 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20
                "
              >
                <option value="">الكل</option>
                <option value="manual">يدوي</option>
                <option value="automatic">آلي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5">
                من تاريخ
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setOffset(0);
                }}
                className="
                  w-full px-3 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20
                "
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setOffset(0);
                }}
                className="
                  w-full px-3 py-2.5 rounded-lg border border-border
                  bg-surface text-text
                  focus:outline-none focus:ring-2 focus:ring-primary/20
                "
              />
            </div>
          </div>

          {hasFilters && (
            <div className="mt-3 pt-3 border-t border-border flex justify-end">
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-sm"
              >
                مسح كل الفلاتر
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* حالات */}
      {loading && entries.length === 0 && (
        <Card>
          <div className="flex items-center justify-center py-12 gap-2 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري التحميل...
          </div>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <div className="flex items-start gap-3 text-danger">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">خطأ في التحميل</div>
              <div className="text-sm mt-1">{error}</div>
              <Button
                variant="secondary"
                onClick={loadLog}
                className="mt-3"
                icon={<RefreshCw className="w-4 h-4" />}
              >
                إعادة المحاولة
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!loading && !error && entries.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <ScrollText className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text mb-2">
              {hasFilters ? 'لا نتائج مطابقة' : 'السجل فارغ'}
            </h3>
            <p className="text-sm text-text-muted">
              {hasFilters
                ? 'جرّب تغيير معايير الفلترة.'
                : 'لم تُرسل أي تنبيهات بعد.'}
            </p>
          </div>
        </Card>
      )}

      {/* الجدول */}
      {!loading && !error && entries.length > 0 && (
        <>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-bg-secondary border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      التنبيه
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      المصدر
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      المرسل
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      المستلمون
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      الأولوية
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      التاريخ
                    </th>
                    <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                      إجراء
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => {
                    const sourceInfo = SOURCE_INFO[entry.source] ?? {
                      label: entry.source,
                      cls: 'bg-bg-secondary text-text-muted',
                    };
                    const priorityInfo = entry.priority
                      ? PRIORITY_INFO[entry.priority]
                      : null;

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() =>
                          navigate(`/settings/notifications/log/${entry.id}`)
                        }
                      >
                        {/* التنبيه */}
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-medium text-sm text-text truncate">
                            {entry.is_important && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger ml-2" />
                            )}
                            {entry.title}
                          </div>
                          {entry.body && (
                            <div className="text-xs text-text-muted mt-0.5 line-clamp-1">
                              {entry.body}
                            </div>
                          )}
                          {entry.notification_type_name && (
                            <div className="text-[10px] text-text-muted mt-1">
                              {entry.notification_type_name}
                            </div>
                          )}
                        </td>

                        {/* المصدر */}
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap ${sourceInfo.cls}`}
                          >
                            {sourceInfo.label}
                          </span>
                        </td>

                        {/* المرسل */}
                        <td className="px-4 py-3">
                          {entry.created_by_name ? (
                            <div className="flex items-center gap-1 text-sm text-text">
                              <User className="w-3.5 h-3.5 text-text-muted" />
                              <span className="truncate">
                                {entry.created_by_name}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-text-muted">
                              <UserX className="w-3.5 h-3.5" />
                              <span>النظام</span>
                            </div>
                          )}
                        </td>

                        {/* المستلمون */}
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-sm text-text">
                              <Users className="w-3.5 h-3.5 text-text-muted" />
                              <span className="font-bold">
                                {entry.recipient_count}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-text-muted">
                              <MailOpen className="w-3 h-3" />
                              <span>
                                {entry.read_count} / {entry.recipient_count}{' '}
                                قرأوا
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* الأولوية */}
                        <td className="px-4 py-3">
                          {priorityInfo ? (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${priorityInfo.cls}`}
                            >
                              {priorityInfo.label}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </td>

                        {/* التاريخ */}
                        <td className="px-4 py-3">
                          <div className="text-xs text-text">
                            {formatRelative(entry.created_at)}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {formatDateTime(entry.created_at)}
                          </div>
                        </td>

                        {/* إجراء */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/settings/notifications/log/${entry.id}`
                              );
                            }}
                            className="
                              p-2 rounded-lg text-text-muted
                              hover:bg-primary/10 hover:text-primary
                              transition-colors
                            "
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* التصفح */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-text-muted">
                عرض {offset + 1} - {Math.min(offset + LIMIT, totalCount)} من{' '}
                {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  disabled={offset === 0 || loading}
                  className="text-sm"
                >
                  السابق
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setOffset(offset + LIMIT)}
                  disabled={offset + LIMIT >= totalCount || loading}
                  className="text-sm"
                >
                  التالي
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}