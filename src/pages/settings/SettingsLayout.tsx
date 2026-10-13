import { Outlet, useLocation } from 'react-router-dom';
import {
  Settings,
  FileText,
  Bell,
  Users,
  Building2,
  Shield,
  Palette,
  ChevronLeft,
} from 'lucide-react';
import { useEntityStore } from '../../stores/entity-store';

// ═══════════════════════════════════════════════════════════
// Item Info Map
// ═══════════════════════════════════════════════════════════

interface ItemInfo {
  path: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const SETTINGS_ITEMS: ItemInfo[] = [
  {
    path: '/settings/templates',
    title: 'إعدادات القوالب',
    subtitle: 'إدارة القوالب والحقول والأقسام',
    icon: <FileText className="w-6 h-6" />,
  },
  {
    path: '/settings/notifications',
    title: 'إدارة التنبيهات',
    subtitle: 'إدارة قواعد التنبيهات والقوالب',
    icon: <Bell className="w-6 h-6" />,
  },
  {
    path: '/settings/users',
    title: 'إدارة المستخدمين',
    subtitle: 'إدارة الحسابات والأدوار',
    icon: <Users className="w-6 h-6" />,
  },
  {
    path: '/settings/entities',
    title: 'إدارة الكيانات',
    subtitle: 'إدارة المناطق والمدارس والمراكز',
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    path: '/settings/roles',
    title: 'إدارة الأدوار',
    subtitle: 'إدارة الأدوار والصلاحيات',
    icon: <Shield className="w-6 h-6" />,
  },
  {
    path: '/settings/themes',
    title: 'إدارة الثيمات',
    subtitle: 'إدارة الثيمات والمظهر',
    icon: <Palette className="w-6 h-6" />,
  },
];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function SettingsLayout() {
  const { activeEntity } = useEntityStore();
  const location = useLocation();
  const isTechSupport = activeEntity?.roleCode === 'tech_support';

  // ⭐ احصل على معلومات الصفحة الحالية
  const currentItem = SETTINGS_ITEMS.find(
    (item) =>
      location.pathname === item.path ||
      location.pathname.startsWith(item.path + '/')
  );

  const title = currentItem?.title || 'الإعدادات';
  const subtitle = currentItem?.subtitle || 'إدارة النظام والقوالب';
  const icon = currentItem?.icon || <Settings className="w-6 h-6" />;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-surface border border-border rounded-xl p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
              <span>الإعدادات</span>
              {currentItem && (
                <>
                  <ChevronLeft className="w-3 h-3" />
                  <span className="text-primary font-medium">{title}</span>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-text">
              {title}
            </h1>
            <p className="text-text-secondary text-xs sm:text-sm mt-1">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0">
        {isTechSupport ? (
          <Outlet />
        ) : (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-bg-secondary text-text-muted mb-4">
              <Settings className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">الإعدادات</h2>
            <p className="text-text-secondary text-sm">
              لا توجد إعدادات متاحة لدورك الحالي
            </p>
          </div>
        )}
      </div>
    </div>
  );
}