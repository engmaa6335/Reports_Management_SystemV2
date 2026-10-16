import { NavLink, Outlet } from 'react-router-dom';
import { Bell, FileText, ScrollText, Settings, Send } from 'lucide-react';

const TABS = [
  { to: 'rules', label: 'قواعد التنبيهات', icon: Bell },
  { to: 'templates', label: 'القوالب', icon: FileText },
  { to: 'log', label: 'سجل التنبيهات', icon: ScrollText },
  { to: 'channels', label: 'إعدادات الإرسال', icon: Settings },
];

export function NotificationsAdminPage() {
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