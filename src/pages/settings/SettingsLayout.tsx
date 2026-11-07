// src/pages/settings/SettingsLayout.tsx
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
  Lock,
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { Button } from '../../components/ui';

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
  const location = useLocation();
  const navigate = useNavigate();

  // ⭐ فحص صلاحية الإعدادات العامة (يعتمد كلياً على RPC + overrides)
  const { allowed: canAccessSettings, loading: checkingSettings } =
    usePermission('settings.view');

  const currentItem = SETTINGS_ITEMS.find(
    (item) =>
      location.pathname === item.path ||
      location.pathname.startsWith(item.path + '/')
  );

  // ⭐ Loading
  if (checkingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // ⭐ منع الوصول كلياً — لا bypass لأي دور
  if (!canAccessSettings) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger/10 text-danger mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-text mb-2">
            لا تملك صلاحية الوصول
          </h2>
          <p className="text-text-secondary text-sm mb-1">
            هذه الصفحة تتطلب الصلاحية:
          </p>
          <code className="inline-block px-3 py-1 rounded bg-bg-secondary text-primary font-mono text-sm mb-4">
            settings.view
          </code>
          <p className="text-text-muted text-xs mb-6">
            تواصل مع الدعم الفني لمنحك الصلاحية (فردياً عبر الصلاحيات الفردية،
            أو عبر دورك).
          </p>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            العودة للوحة التحكم
          </Button>
        </div>
      </div>
    );
  }

  const title = currentItem ? t(currentItem.titleKey) : t('sidebar.settings');
  const subtitle = currentItem
    ? t(currentItem.subtitleKey)
    : t('settings.subtitle');
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
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
              <span>{t('sidebar.settings')}</span>
              {currentItem && (
                <>
                  <ChevronLeft className="w-3 h-3" />
                  <span className="text-primary font-medium">{title}</span>
                </>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-text">{title}</h1>
            <p className="text-text-secondary text-xs sm:text-sm mt-1">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

export default SettingsLayout;