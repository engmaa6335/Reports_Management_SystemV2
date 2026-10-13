import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useNotificationsStore } from '../../stores/notifications-store';
import { NotificationDropdown } from './NotificationDropdown';

// ================================================
// Component
// ================================================

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    unreadCount,
    loadNotifications,
    subscribeToRealtime,
    unsubscribe,
  } = useNotificationsStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // تحميل التنبيهات + Realtime
  useEffect(() => {
    if (user) {
      loadNotifications(user.id);
      subscribeToRealtime(user.id);

      return () => {
        unsubscribe();
      };
    }
  }, [user, loadNotifications, subscribeToRealtime, unsubscribe]);

  // إغلاق عند النقر خارج الـ dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            className="
              absolute -top-1 -left-1 min-w-[20px] h-5 px-1.5
              bg-danger text-white text-xs font-bold
              rounded-full flex items-center justify-center
              animate-pulse
            "
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          onViewAll={() => {
            setIsOpen(false);
            navigate('/notifications');
          }}
        />
      )}
    </div>
  );
}