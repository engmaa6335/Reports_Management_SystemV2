import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useEntityStore } from '../../stores/entity-store';
import type { RoleCode } from '../../types/app.types';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  roles?: RoleCode[];
  isSettings?: boolean;
}

interface SettingsSubItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface SidebarProps {
  open: boolean;
}

// ═══════════════════════════════════════════════════════════
// Menu Items
// ═══════════════════════════════════════════════════════════

const MENU_ITEMS: SidebarItem[] = [
  {
    id: 'home',
    label: 'الرئيسية',
    icon: <Home className="w-5 h-5" />,
    path: '/dashboard',
  },
  {
    id: 'reports',
    label: 'تقاريري',
    icon: <FileText className="w-5 h-5" />,
    path: '/reports',
  },
  {
    id: 'aggregates',
    label: 'التقارير المجمّعة',
    icon: <BarChart3 className="w-5 h-5" />,
    path: '/aggregates',
  },
  {
    id: 'notifications',
    label: 'التنبيهات',
    icon: <Bell className="w-5 h-5" />,
    path: '/notifications',
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: <Settings className="w-5 h-5" />,
    path: '/settings',
    roles: ['tech_support'],
    isSettings: true,
  },
];

const SETTINGS_SUB_ITEMS: SettingsSubItem[] = [
  {
    id: 'templates',
    label: 'إعدادات القوالب',
    icon: <LayoutTemplate className="w-4 h-4" />,
    path: '/settings/templates',
  },
  {
    id: 'notifications-admin',
    label: 'إدارة التنبيهات',
    icon: <Bell className="w-4 h-4" />,
    path: '/settings/notifications',
  },
  {
    id: 'users',
    label: 'إدارة المستخدمين',
    icon: <Users className="w-4 h-4" />,
    path: '/settings/users',
  },
  {
    id: 'entities',
    label: 'إدارة الكيانات',
    icon: <Building2 className="w-4 h-4" />,
    path: '/settings/entities',
  },
  {
    id: 'roles',
    label: 'إدارة الأدوار',
    icon: <Shield className="w-4 h-4" />,
    path: '/settings/roles',
  },
  {
    id: 'themes',
    label: 'إدارة الثيمات',
    icon: <Palette className="w-4 h-4" />,
    path: '/settings/themes',
  },
];

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function Sidebar({ open }: SidebarProps) {
  const { activeEntity } = useEntityStore();
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = activeEntity?.roleCode;

  // ⭐ Popup State
  const [settingsPopupOpen, setSettingsPopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // ⭐ هل الشاشة موبايل؟
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ⭐ فلترة العناصر حسب الدور
  const visibleItems = MENU_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    return userRole && item.roles.includes(userRole);
  });

  // ⭐ إغلاق Popup عند تغيير الصفحة
  useEffect(() => {
    setSettingsPopupOpen(false);
  }, [location.pathname]);

  // ⭐ إغلاق Popup عند الضغط خارج
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
      if (e.key === 'Escape') {
        setSettingsPopupOpen(false);
      }
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

  // ═══════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setSettingsPopupOpen((prev) => !prev);
  };

  const handleSubItemClick = (path: string) => {
    navigate(path);
    setSettingsPopupOpen(false);
  };

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  return (
    <>
      {/* ⭐ Mobile Overlay — يظهر عند فتح Sidebar على الموبايل */}
      {isMobile && open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20"
          onClick={() => {
            /* لا نُغلق — سيُغلق من MainLayout */
          }}
        />
      )}

      <aside
        className={`
          fixed top-16 bottom-0 right-0 bg-surface border-l border-border
          transition-transform duration-300 ease-in-out z-30
          w-64
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <nav className="p-3 space-y-1 overflow-y-auto h-full pb-20">
          {visibleItems.map((item) => {
            // ⭐ حالة خاصة للإعدادات
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

            // ⭐ العناصر العادية
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

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-bg-secondary">
          <div className="text-xs text-text-muted text-center">
            © 2026 EDC Platform
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ⭐ Desktop Popup — ينزلق بجانب Sidebar */}
        {/* ═══════════════════════════════════════════════════════ */}
        {!isMobile && (
          <div
            ref={popupRef}
            className={`
              absolute top-0 right-full mr-2 w-64
              bg-surface border border-border rounded-xl shadow-2xl
              overflow-hidden
              transition-all duration-200 ease-out
              ${
                settingsPopupOpen
                  ? 'opacity-100 translate-x-0 pointer-events-auto'
                  : 'opacity-0 translate-x-4 pointer-events-none'
              }
            `}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">
                  الإعدادات
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="py-2">
              {SETTINGS_SUB_ITEMS.map((subItem) => {
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
                    <span className="truncate">{subItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ⭐ Mobile Popup — Bottom Sheet */}
      {/* ═══════════════════════════════════════════════════════ */}
      {isMobile && settingsPopupOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSettingsPopupOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl border-t border-border max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.2s ease-out' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="px-4 pb-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <span className="text-base font-bold text-primary">
                  الإعدادات
                </span>
              </div>
              <button
                onClick={() => setSettingsPopupOpen(false)}
                className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="p-2">
              {SETTINGS_SUB_ITEMS.map((subItem) => {
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
                    <span className="truncate">{subItem.label}</span>
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