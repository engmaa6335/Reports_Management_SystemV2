import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  FileText,
  BarChart3,
  Bell,
  Settings,
  Users,
  Building2,
  Shield,
  Palette,
  LayoutTemplate,
  ChevronLeft,
  X,
  Upload,
  Grid,
  RotateCcw,
} from 'lucide-react';
import { useEntityStore } from '../../stores/entity-store';
import { usePermission } from '../../hooks/usePermission';
import type { RoleCode } from '../../types/app.types';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
  roles?: RoleCode[];
  isSettings?: boolean;
}

interface SettingsSubItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  permission?: string;
}

interface SidebarProps {
  open: boolean;
}

export function Sidebar({ open }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const { activeEntity } = useEntityStore();
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = activeEntity?.roleCode;
  const isRTL = i18n.dir() === 'rtl';

  const { allowed: canManageThemes } = usePermission('themes.manage');
  const { allowed: canManageUsers } = usePermission('users.manage');
  const { allowed: canManageTemplates } = usePermission('templates.manage');
  const { allowed: canManageSettings } = usePermission('settings.manage');

  const canAccessSettings =
    canManageThemes ||
    canManageUsers ||
    canManageTemplates ||
    canManageSettings;

  const [settingsPopupOpen, setSettingsPopupOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const MENU_ITEMS: SidebarItem[] = [
    {
      id: 'home',
      label: t('sidebar.home'),
      icon: <Home className="w-5 h-5" />,
      path: '/dashboard',
    },
    {
      id: 'reports',
      label: t('sidebar.reports'),
      icon: <FileText className="w-5 h-5" />,
      path: '/reports',
    },
    {
      id: 'aggregates',
      label: t('sidebar.aggregates'),
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/aggregates',
    },
    {
      id: 'notifications',
      label: t('sidebar.notifications'),
      icon: <Bell className="w-5 h-5" />,
      path: '/notifications',
    },
    {
      id: 'settings',
      label: t('sidebar.settings'),
      icon: <Settings className="w-5 h-5" />,
      path: '/settings',
      isSettings: true,
    },
  ];

  const SETTINGS_SUB_ITEMS: SettingsSubItem[] = [
    {
      id: 'templates',
      label: t('admin.templates'),
      icon: <LayoutTemplate className="w-4 h-4" />,
      path: '/settings/templates',
    },
    {
      id: 'notifications-admin',
      label: t('admin.notifications'),
      icon: <Bell className="w-4 h-4" />,
      path: '/settings/notifications',
    },
    {
      id: 'users',
      label: t('admin.users'),
      icon: <Users className="w-4 h-4" />,
      path: '/settings/users',
    },
    {
      id: 'entities',
      label: t('admin.entities'),
      icon: <Building2 className="w-4 h-4" />,
      path: '/settings/entities',
    },
    {
      id: 'permissions',
      label: t('admin.roles'),
      icon: <Shield className="w-4 h-4" />,
      path: '/settings/permissions',
    },
    {
      id: 'roles-matrix',
      label: t('settings.title'),
      icon: <Grid className="w-4 h-4" />,
      path: '/settings/roles',
    },
    {
      id: 'bulk-import',
      label: t('common.import'),
      icon: <Upload className="w-4 h-4" />,
      path: '/settings/permissions/bulk-import',
      badge: 'Excel',
    },
    {
      id: 'themes',
      label: t('admin.themes'),
      icon: <Palette className="w-4 h-4" />,
      path: '/settings/themes',
      permission: 'themes.manage',
    },
    {
      id: 'themes-reset',
      label: t('settings.reset_themes'),
      icon: <RotateCcw className="w-4 h-4" />,
      path: '/settings/themes/reset',
      permission: 'users.manage',
    },
  ];

  const isPermissionGranted = (permission?: string) => {
    if (!permission) return true;
    if (permission === 'themes.manage') return canManageThemes;
    if (permission === 'users.manage') return canManageUsers;
    if (permission === 'templates.manage') return canManageTemplates;
    if (permission === 'settings.manage') return canManageSettings;
    return true;
  };

  const visibleItems = MENU_ITEMS.filter((item) => {
    if (item.isSettings) return canAccessSettings;
    if (item.permission && !isPermissionGranted(item.permission)) return false;
    if (item.roles && item.roles.length > 0) {
      return userRole && item.roles.includes(userRole);
    }
    return true;
  });

  const visibleSubItems = SETTINGS_SUB_ITEMS.filter((sub) =>
    isPermissionGranted(sub.permission)
  );

  useEffect(() => {
    setSettingsPopupOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        settingsPopupOpen &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(e.target as Node)
      ) {
        setSettingsPopupOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsPopupOpen(false);
    };
    if (settingsPopupOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [settingsPopupOpen]);

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      
      // رفع القائمة قليلاً للأعلى (نطرح 8 بكسل من top)
      const top = rect.top - 8; 
      
      // حساب الموضع الأفقي مع التأكد من عدم تجاوز حدود الشاشة
      let left = isRTL ? rect.left - 260 : rect.right + 8;
      
      // منع القائمة من الخروج من الجانب الأيسر للشاشة
      if (left < 8) left = 8;
      
      // منع القائمة من الخروج من الجانب الأيمن للشاشة
      if (left + 260 > window.innerWidth - 8) {
        left = window.innerWidth - 260 - 8;
      }

      setPopupPosition({ top, left });
    }
    setSettingsPopupOpen((prev) => !prev);
  };

  const handleSubItemClick = (path: string) => {
    navigate(path);
    setSettingsPopupOpen(false);
  };

  return (
    <>
      {isMobile && open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20"
          onClick={() => {}}
        />
      )}

      <aside
        className={`
          fixed top-16 bottom-0 start-0 bg-surface border-e border-border
          transition-transform duration-300 ease-in-out z-30
          w-64
          ${
            open
              ? 'translate-x-0'
              : isRTL
              ? 'translate-x-full'
              : '-translate-x-full'
          }
        `}
      >
        <nav className="p-3 space-y-1 overflow-y-auto h-full pb-20">
          {visibleItems.map((item) => {
            if (item.isSettings) {
              const isActive = location.pathname.startsWith('/settings');
              return (
                <button
                  key={item.id}
                  ref={settingsButtonRef}
                  onClick={handleSettingsClick}
                  className={`
                    w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg
                    transition-colors text-sm font-medium text-right
                    ${
                      isActive || settingsPopupOpen
                        ? 'bg-primary text-white shadow-soft'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text'
                    }
                  `}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ChevronLeft
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                      settingsPopupOpen ? 'rotate-90' : '-rotate-90'
                    }`}
                  />
                </button>
              );
            }
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-colors text-sm font-medium
                    ${
                      isActive
                        ? 'bg-primary text-white shadow-soft'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text'
                    }
                  `
                }
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-bg-secondary">
          <div className="text-xs text-text-muted text-center">
            © 2026 EDC Platform
          </div>
        </div>
      </aside>

      {/* Desktop Popup — Fixed Positioning */}
      {!isMobile && settingsPopupOpen && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: popupPosition.top,
            left: popupPosition.left,
            width: '260px',
            // التأكد من أن القائمة لا تتجاوز ارتفاع الشاشة
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
          }}
          className="bg-surface border border-border rounded-xl shadow-2xl z-50"
        >
          <div className="px-4 py-3 border-b border-border bg-primary/5">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">
                {t('sidebar.settings')}
              </span>
            </div>
          </div>
          <div className="py-2">
            {visibleSubItems.map((subItem) => {
              const isActive =
                location.pathname === subItem.path ||
                location.pathname.startsWith(subItem.path + '/');
              return (
                <button
                  key={subItem.id}
                  onClick={() => handleSubItemClick(subItem.path)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-sm
                    transition-colors text-right border-r-4
                    ${
                      isActive
                        ? 'bg-primary/10 text-primary border-r-primary font-medium'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text border-r-transparent'
                    }
                  `}
                >
                  <span className="flex-shrink-0">{subItem.icon}</span>
                  <span className="flex-1 truncate text-right">
                    {subItem.label}
                  </span>
                  {subItem.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-medium flex-shrink-0">
                      {subItem.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {isMobile && settingsPopupOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setSettingsPopupOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl border-t border-border max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.2s ease-out' }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 rounded-full bg-border" />
            </div>
            <div className="px-4 pb-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <span className="text-base font-bold text-primary">
                  {t('sidebar.settings')}
                </span>
              </div>
              <button
                onClick={() => setSettingsPopupOpen(false)}
                className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              {visibleSubItems.map((subItem) => {
                const isActive =
                  location.pathname === subItem.path ||
                  location.pathname.startsWith(subItem.path + '/');
                return (
                  <button
                    key={subItem.id}
                    onClick={() => handleSubItemClick(subItem.path)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg
                      transition-colors text-right
                      ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-text-secondary hover:bg-bg-secondary'
                      }
                    `}
                  >
                    <span className="flex-shrink-0">{subItem.icon}</span>
                    <span className="flex-1 truncate text-right">
                      {subItem.label}
                    </span>
                    {subItem.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-medium">
                        {subItem.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}