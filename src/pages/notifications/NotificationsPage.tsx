import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  FileText,
  BarChart3,
  Shield,
  Clock,
  Search,
  Check,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useNotificationsStore } from '../../stores/notifications-store';
import type { NotificationWithDetails } from '../../stores/notifications-store';
import { Button, Card, Input } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';

// ================================================
// Helpers
// ================================================

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  if (diffDay < 30) return `منذ ${Math.floor(diffDay / 7)} أسبوع`;
  return formatDateTime(dateStr);
}

function getIconForCategory(category: string | null) {
  const icons: Record<string, React.ReactNode> = {
    report: <FileText className="w-5 h-5" />,
    aggregate: <BarChart3 className="w-5 h-5" />,
    admin: <Shield className="w-5 h-5" />,
    custom: <Bell className="w-5 h-5" />,
  };
  return icons[category || 'custom'] || <Bell className="w-5 h-5" />;
}

function getIconColor(category: string | null): string {
  const colors: Record<string, string> = {
    report: 'bg-primary/10 text-primary',
    aggregate: 'bg-info/10 text-info',
    admin: 'bg-warning/10 text-warning',
    custom: 'bg-success/10 text-success',
  };
  return colors[category || 'custom'] || 'bg-primary/10 text-primary';
}

function getPriorityBadge(priority: string): {
  label: string;
  className: string;
} {
  const badges: Record<string, { label: string; className: string }> = {
    low: {
      label: 'منخفضة',
      className: 'bg-text-muted/10 text-text-muted',
    },
    normal: {
      label: 'عادية',
      className: 'bg-info/10 text-info',
    },
    high: {
      label: 'عالية',
      className: 'bg-warning/10 text-warning',
    },
    urgent: {
      label: 'عاجلة',
      className: 'bg-danger/10 text-danger',
    },
  };

  return badges[priority] || badges.normal;
}

// ================================================
// Types
// ================================================

type FilterTab = 'all' | 'unread' | 'report' | 'aggregate' | 'admin';

// ================================================
// Component
// ================================================

export function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    subscribeToRealtime,
    unsubscribe,
  } = useNotificationsStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ================================================
  // Load + Realtime
  // ================================================
  useEffect(() => {
    if (user) {
      loadNotifications(user.id);
      subscribeToRealtime(user.id);

      return () => {
        unsubscribe();
      };
    }
  }, [user, loadNotifications, subscribeToRealtime, unsubscribe]);

  // ================================================
  // Filtering
  // ================================================
  const filteredNotifications = useMemo(() => {
    let result = notifications;

    // Tab filter
    if (activeTab === 'unread') {
      result = result.filter((n) => !n.is_read);
    } else if (activeTab !== 'all') {
      result = result.filter(
        (n) => n.notification_type?.category === activeTab
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          (n.body && n.body.toLowerCase().includes(query))
      );
    }

    return result;
  }, [notifications, activeTab, searchQuery]);

  // ================================================
  // Tab Counts
  // ================================================
  const tabCounts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((n) => !n.is_read).length,
      report: notifications.filter(
        (n) => n.notification_type?.category === 'report'
      ).length,
      aggregate: notifications.filter(
        (n) => n.notification_type?.category === 'aggregate'
      ).length,
      admin: notifications.filter(
        (n) => n.notification_type?.category === 'admin'
      ).length,
    }),
    [notifications]
  );

  // ================================================
  // Handlers
  // ================================================
  const handleNotificationClick = async (
    notif: NotificationWithDetails
  ) => {
    if (!notif.is_read) {
      await markAsRead(notif.recipient_id);
    }

    const data = notif.data as {
      report_id?: string;
      aggregate_id?: string;
      url?: string;
    };

    if (data?.report_id) {
      navigate(`/reports/${data.report_id}`);
    } else if (data?.aggregate_id) {
      navigate(`/aggregates/${data.aggregate_id}`);
    } else if (data?.url) {
      navigate(data.url);
    }
  };

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllAsRead(user.id);
    }
  };

  const handleMarkSingleRead = async (
    e: React.MouseEvent,
    recipientId: string
  ) => {
    e.stopPropagation();
    await markAsRead(recipientId);
  };

  // ================================================
  // Render — Loading
  // ================================================
  if (loading && notifications.length === 0) {
    return <Loading message="جاري تحميل التنبيهات..." />;
  }

  // ================================================
  // Render — Page
  // ================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            🔔 التنبيهات
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-danger text-white text-sm font-bold rounded-full">
                {unreadCount} جديد
              </span>
            )}
          </h1>
          <p className="text-text-secondary mt-1">
            {unreadCount > 0
              ? `لديك ${unreadCount} تنبيه غير مقروء`
              : 'لا توجد تنبيهات غير مقروءة'}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            icon={<CheckCheck className="w-4 h-4" />}
            onClick={handleMarkAllRead}
          >
            تحديد الكل كمقروء
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card padding="none">
        {/* Tabs */}
        <div className="border-b border-border overflow-x-auto">
          <div className="flex items-center gap-1 px-2 min-w-max">
            <TabButton
              active={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              label="الكل"
              count={tabCounts.all}
            />
            <TabButton
              active={activeTab === 'unread'}
              onClick={() => setActiveTab('unread')}
              label="غير مقروءة"
              count={tabCounts.unread}
            />
            <TabButton
              active={activeTab === 'report'}
              onClick={() => setActiveTab('report')}
              label="📄 تقارير"
              count={tabCounts.report}
            />
            <TabButton
              active={activeTab === 'aggregate'}
              onClick={() => setActiveTab('aggregate')}
              label="📊 تجميعية"
              count={tabCounts.aggregate}
            />
            <TabButton
              active={activeTab === 'admin'}
              onClick={() => setActiveTab('admin')}
              label="🛡️ نظام"
              count={tabCounts.admin}
            />
          </div>
        </div>

        {/* Search */}
        <div className="p-4 flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="ابحث في التنبيهات..."
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery && (
            <Button
              variant="ghost"
              icon={<X className="w-4 h-4" />}
              onClick={() => setSearchQuery('')}
            >
              مسح
            </Button>
          )}
        </div>
      </Card>

      {/* Empty State */}
      {filteredNotifications.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-bg-secondary rounded-full mb-4">
              <Bell className="w-10 h-10 text-text-muted" />
            </div>
            <h2 className="text-xl font-semibold text-text mb-2">
              {notifications.length === 0
                ? 'لا توجد تنبيهات'
                : 'لا توجد نتائج مطابقة'}
            </h2>
            <p className="text-text-secondary">
              {notifications.length === 0
                ? 'ستظهر التنبيهات هنا عندما تحدث أحداث جديدة'
                : 'جرّب تغيير الفلاتر أو البحث'}
            </p>
          </div>
        </Card>
      )}

      {/* Notifications List */}
      {filteredNotifications.length > 0 && (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const type = notif.notification_type;
            const priorityBadge = getPriorityBadge(notif.priority);

            return (
              <Card
                key={notif.recipient_id}
                padding="md"
                className={`
                  transition-all cursor-pointer hover:shadow-md
                  ${!notif.is_read ? 'border-primary/30 bg-primary/5' : ''}
                `}
              >
                <div
                  onClick={() => handleNotificationClick(notif)}
                  className="flex items-start gap-4"
                >
                  {/* Icon */}
                  <div
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                      ${getIconColor(type?.category || null)}
                    `}
                  >
                    {getIconForCategory(type?.category || null)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`font-semibold ${
                            !notif.is_read ? 'text-primary' : 'text-text'
                          }`}
                        >
                          {notif.title}
                        </h3>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge.className}`}
                        >
                          {priorityBadge.label}
                        </span>
                      </div>

                      {/* Actions */}
                      {!notif.is_read && (
                        <button
                          onClick={(e) =>
                            handleMarkSingleRead(e, notif.recipient_id)
                          }
                          className="
                            p-1.5 rounded-lg hover:bg-primary/10 
                            text-primary transition-colors flex-shrink-0
                          "
                          title="تعليم كمقروء"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {notif.body && (
                      <p className="text-sm text-text-secondary mb-2">
                        {notif.body}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span title={formatDateTime(notif.created_at)}>
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                      {type && (
                        <span
                          className="inline-block px-2 py-0.5 rounded-md font-medium"
                          style={{
                            backgroundColor: `${type.color || '#2563eb'}15`,
                            color: type.color || '#2563eb',
                          }}
                        >
                          {type.name_ar}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ================================================
// Sub-Components
// ================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}

function TabButton({ active, onClick, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-3 text-sm font-medium
        border-b-2 transition-colors whitespace-nowrap
        ${
          active
            ? 'border-primary text-primary'
            : 'border-transparent text-text-secondary hover:text-text hover:border-border'
        }
      `}
    >
      <span>{label}</span>
      <span
        className={`
          inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold
          ${
            active
              ? 'bg-primary text-white'
              : 'bg-bg-secondary text-text-secondary'
          }
        `}
      >
        {count}
      </span>
    </button>
  );
}