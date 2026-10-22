import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { usePermission } from '../../hooks/usePermission';

// ═══════════════════════════════════════════════════════════
// Item Info Map
// ═══════════════════════════════════════════════════════════

interface ItemInfo {
  path: string;
  titleKey: string;
  subtitleKey: string;
  icon: React.ReactNode;
  permission: string;
}

const SETTINGS_ITEMS: ItemInfo[] = [
  {
    path: '/settings/templates',
    titleKey: 'admin.templates',
    subtitleKey: 'settings.sub_templates',
    icon: <FileText className="w-6 h-6" />,
    permission: 'templates.view',
  },
  {
    path: '/settings/notifications',
    titleKey: 'admin.notifications',
    subtitleKey: 'settings.sub_notifications',
    icon: <Bell className="w-6 h-6" />,
    permission: 'notifications.manage',
  },
  {
    path: '/settings/users',
    titleKey: 'admin.users',
    subtitleKey: 'settings.sub_users',
    icon: <Users className="w-6 h-6" />,
    permission: 'users.view',
  },
  {
    path: '/settings/entities',
    titleKey: 'admin.entities',
    subtitleKey: 'settings.sub_entities',
    icon: <Building2 className="w-6 h-6" />,
    permission: 'entities.view',
  },
  {
    path: '/settings/roles',
    titleKey: 'admin.roles',
    subtitleKey: 'settings.sub_roles',
    icon: <Shield className="w-6 h-6" />,
    permission: 'roles.view',
  },
  {
    path: '/settings/themes',
    titleKey: 'admin.themes',
    subtitleKey: 'settings.sub_themes',
    icon: <Palette className="w-6 h-6" />,
    permission: 'themes.view',
  },
];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function SettingsLayout() {
  const { t } = useTranslation();
  const { activeEntity } = useEntityStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isTechSupport = activeEntity?.roleCode === 'tech_support';
  
  // ⭐ فحص الصلاحية العامة للإعدادات
  const { allowed: canAccessSettings, loading: checkingSettings } = usePermission('settings.view');

  // ⭐ احصل على معلومات الصفحة الحالية
  const currentItem = SETTINGS_ITEMS.find(
    (item) =>
      location.pathname === item.path ||
      location.pathname.startsWith(item.path + '/')
  );

  // ⭐ إذا لم يملك صلاحية الإعدادات، لا تعرض شيئاً (سيتم توجيهه من App.tsx)
  if (checkingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canAccessSettings && !isTechSupport) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-bg-secondary text-text-muted mb-4">
          <Settings className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-text mb-2">لا تملك صلاحية الوصول</h2>
        <p className="text-text-secondary text-sm">
          ليس لديك صلاحية للوصول إلى الإعدادات.
        </p>
      </div>
    );
  }

  const title = currentItem ? t(currentItem.titleKey) : t('sidebar.settings');
  const subtitle = currentItem ? t(currentItem.subtitleKey) : t('settings.subtitle');
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
              <span>{t('sidebar.settings')}</span>
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
        <Outlet />
      </div>
    </div>
  );
}

export default SettingsLayout;