import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, FileText, ScrollText, Settings, Send, Lock, Loader2 } from 'lucide-react';
import { usePermission } from '../../../hooks/usePermission';

const TABS = [
  { to: 'rules', label: 'قواعد التنبيهات', icon: Bell },
  { to: 'templates', label: 'القوالب', icon: FileText },
  { to: 'log', label: 'سجل التنبيهات', icon: ScrollText },
  { to: 'channels', label: 'إعدادات الإرسال', icon: Settings },
];

export function NotificationsAdminPage() {
  // ⭐ فحص صلاحية إدارة التنبيهات
  const { allowed: canManage, loading: checkingManage } = usePermission('notifications.manage');

  if (checkingManage) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // ⭐ منع الوصول
  if (!canManage) {
    return (
      <div className="p-6 text-center text-danger">
        <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">لا تملك صلاحية الوصول</h2>
        <p>ليس لديك صلاحية لإدارة التنبيهات.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">إدارة التنبيهات</h1>
          <p className="text-sm text-text-secondary mt-1">
            قواعد آلية، قوالب، إرسال مخصص، وسجل تدقيق كامل
          </p>
        </div>

        <NavLink
          to="send-manual"
          className="
            inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
            bg-primary text-white font-medium shadow-soft
            hover:bg-primary-dark transition-colors
          "
        >
          <Send className="w-4 h-4" />
          إرسال تنبيه مخصص
        </NavLink>
      </div>

      {/* التبويبات */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                 border-b-2 transition-colors
                 ${
                   isActive
                     ? 'border-primary text-primary'
                     : 'border-transparent text-text-secondary hover:text-text hover:border-border'
                 }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* محتوى القسم */}
      <Outlet />
    </div>
  );
}

export default NotificationsAdminPage;