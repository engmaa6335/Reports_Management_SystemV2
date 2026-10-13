import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  FileText,
  BarChart3,
  Shield,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useNotificationsStore } from '../../stores/notifications-store';
import type { NotificationWithDetails } from '../../stores/notifications-store';

// ================================================
// Helpers
// ================================================

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
  return date.toLocaleDateString('ar-EG');
}

function getIconForCategory(category: string | null) {
  const icons: Record<string, React.ReactNode> = {
    report: <FileText className="w-4 h-4" />,
    aggregate: <BarChart3 className="w-4 h-4" />,
    admin: <Shield className="w-4 h-4" />,
    custom: <Bell className="w-4 h-4" />,
  };
  return icons[category || 'custom'] || <Bell className="w-4 h-4" />;
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

// ================================================
// Types
// ================================================

interface NotificationDropdownProps {
  onClose: () => void;
  onViewAll: () => void;
}

// ================================================
// Component
// ================================================

export function NotificationDropdown({
  onClose,
  onViewAll,
}: NotificationDropdownProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationsStore();

  const recentNotifications = notifications.slice(0, 5);

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

    onClose();
  };

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllAsRead(user.id);
    }
  };

  return (
    <div
      className="
        absolute top-full left-0 mt-2 w-96
        bg-surface border border-border rounded-xl
        shadow-hard z-50 overflow-hidden
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="font-semibold text-text">التنبيهات</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-danger text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            تحديد الكل
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {recentNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-bg-secondary rounded-full mb-3">
              <Bell className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">لا توجد تنبيهات</p>
          </div>
        ) : (
          recentNotifications.map((notif) => {
            const type = notif.notification_type;
            return (
              <button
                key={notif.recipient_id}
                onClick={() => handleNotificationClick(notif)}
                className={`
                  w-full text-right flex items-start gap-3 p-3
                  border-b border-border last:border-0
                  hover:bg-bg-secondary transition-colors
                  ${!notif.is_read ? 'bg-primary/5' : ''}
                `}
              >
                {/* Icon */}
                <div
                  className={`
                    w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                    ${getIconColor(type?.category || null)}
                  `}
                >
                  {getIconForCategory(type?.category || null)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`font-medium text-sm truncate ${
                        !notif.is_read ? 'text-primary' : 'text-text'
                      }`}
                    >
                      {notif.title}
                    </span>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>

                  {notif.body && (
                    <p className="text-xs text-text-secondary line-clamp-2 mb-1">
                      {notif.body}
                    </p>
                  )}

                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <Clock className="w-3 h-3" />
                    <span>{timeAgo(notif.created_at)}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-2 border-t border-border bg-bg-secondary">
          <button
            onClick={onViewAll}
            className="
              w-full py-2 text-sm text-primary hover:text-primary-dark
              font-medium rounded-lg hover:bg-surface transition-colors
            "
          >
            عرض كل التنبيهات ({notifications.length})
          </button>
        </div>
      )}
    </div>
  );
}