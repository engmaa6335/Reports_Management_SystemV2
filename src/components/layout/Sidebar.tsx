// ═══════════════════════════════════════════════════════════
// Sidebar — dynamic (reads from pages-store)
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, ChevronLeft, X } from 'lucide-react';
import { usePagesStore } from '../../stores/pages-store';
import { useAuthStore } from '../../stores/auth-store';
import { DynamicIcon } from './IconMapper';
import { pickLocalizedName } from '../../lib/i18n-helpers';
import type { UserAccessiblePage } from '../../types/pages';

interface SidebarProps {
  open: boolean;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function Sidebar({ open }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === 'rtl';
  const language = i18n.language;

  const { pages, loading, initialized, loadPages } = usePagesStore();

  const [settingsPopupOpen, setSettingsPopupOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ bottom: 0, left: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // ═══════════════════════════════════════════
  // Load pages on mount
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (user?.id && !initialized) {
      loadPages();
    }
  }, [user?.id, initialized, loadPages]);

  // ═══════════════════════════════════════════
  // Mobile detection
  // ═══════════════════════════════════════════

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ═══════════════════════════════════════════
  // Close popup on route change
  // ═══════════════════════════════════════════

  useEffect(() => {
    setSettingsPopupOpen(false);
  }, [location.pathname]);

  // ═══════════════════════════════════════════
  // Close popup on outside click / escape
  // ═══════════════════════════════════════════

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

  // ═══════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();

      // ⭐ popup ينمو للأعلى من زر الإعدادات
      const bottom = window.innerHeight - rect.bottom + 8;

      let left = isRTL ? rect.left - 260 : rect.right + 8;
      if (left < 8) left = 8;
      if (left + 260 > window.innerWidth - 8) {
        left = window.innerWidth - 260 - 8;
      }

      setPopupPosition({ bottom, left });
    }
    setSettingsPopupOpen((prev) => !prev);
  };

  const handleSubItemClick = (path: string) => {
    navigate(path);
    setSettingsPopupOpen(false);
  };

  // ═══════════════════════════════════════════
  // Derived data
  // ═══════════════════════════════════════════

  // ⭐ Dashboard is always visible (hardcoded exception)
  const dashboardPage: UserAccessiblePage | null =
    pages.find((p) => p.page_code === 'dashboard') || {
      page_code: 'dashboard',
      name_ar: 'الرئيسية',
      name_en: 'Dashboard',
      module: 'main',
      route_path: '/dashboard',
      icon: 'Home',
      order_index: 10,
      permissions: ['view'],
    };

  // ⭐ All main pages except dashboard + settings parent
  const mainPages = pages
    .filter((p) => p.module === 'main' && p.page_code !== 'dashboard')
    .filter((p) => p.page_code !== 'settings')
    .sort((a, b) => a.order_index - b.order_index);

  // ⭐ Settings sub-pages
  const settingsPages = pages
    .filter((p) => p.module === 'settings' && p.page_code !== 'settings')
    .sort((a, b) => a.order_index - b.order_index);

  const showSettings = settingsPages.length > 0;
  const settingsIsActive = location.pathname.startsWith('/settings');

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

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
          ${open ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
        `}
      >
        <nav className="p-3 space-y-1 overflow-y-auto h-full pb-20">
          {/* Loading skeleton */}
          {loading && !initialized && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 rounded-lg bg-bg-secondary animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Dashboard (always visible) */}
          {!loading && (
            <NavLink
              to={dashboardPage.route_path}
              end
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-colors text-sm font-medium
                ${isActive ? 'bg-primary text-white shadow-soft' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'}
              `}
            >
              <span className="flex-shrink-0">
                <DynamicIcon name={dashboardPage.icon} />
              </span>
              <span className="truncate">
                {pickLocalizedName(dashboardPage, language) || t('sidebar.home')}
              </span>
            </NavLink>
          )}

          {/* Main pages (dynamic) */}
          {!loading &&
            mainPages.map((page) => (
              <NavLink
                key={page.page_code}
                to={page.route_path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-colors text-sm font-medium
                  ${isActive ? 'bg-primary text-white shadow-soft' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'}
                `}
              >
                <span className="flex-shrink-0">
                  <DynamicIcon name={page.icon} />
                </span>
                <span className="truncate">
                  {pickLocalizedName(page, language)}
                </span>
              </NavLink>
            ))}

          {/* Settings button (dynamic) */}
          {!loading && showSettings && (
            <button
              ref={settingsButtonRef}
              onClick={handleSettingsClick}
              className={`
                w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg
                transition-colors text-sm font-medium text-right
                ${settingsIsActive || settingsPopupOpen ? 'bg-primary text-white shadow-soft' : 'text-text-secondary hover:bg-bg-secondary hover:text-text'}
              `}
            >
              <span className="flex items-center gap-3">
                <span className="flex-shrink-0">
                  <Settings className="w-5 h-5" />
                </span>
                <span className="truncate">{t('sidebar.settings')}</span>
              </span>
              <ChevronLeft
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${settingsPopupOpen ? 'rotate-90' : '-rotate-90'}`}
              />
            </button>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-bg-secondary">
          <div className="text-xs text-text-muted text-center">
            © 2026 EDC Platform
          </div>
        </div>
      </aside>

      {/* ═══ Desktop Popup (grows upward) ═══ */}
      {!isMobile && settingsPopupOpen && showSettings && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            bottom: popupPosition.bottom,
            left: popupPosition.left,
            width: '260px',
            maxHeight: `calc(100vh - ${popupPosition.bottom + 80}px)`,
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
            {settingsPages.map((page) => {
              const isActive =
                location.pathname === page.route_path ||
                location.pathname.startsWith(page.route_path + '/');
              return (
                <button
                  key={page.page_code}
                  onClick={() => handleSubItemClick(page.route_path)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-sm
                    transition-colors text-right border-r-4
                    ${isActive ? 'bg-primary/10 text-primary border-r-primary font-medium' : 'text-text-secondary hover:bg-bg-secondary hover:text-text border-r-transparent'}
                  `}
                >
                  <span className="flex-shrink-0">
                    <DynamicIcon name={page.icon} className="w-4 h-4" />
                  </span>
                  <span className="flex-1 truncate text-right">
                    {pickLocalizedName(page, language)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Mobile Bottom Sheet ═══ */}
      {isMobile && settingsPopupOpen && showSettings && (
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
              {settingsPages.map((page) => {
                const isActive =
                  location.pathname === page.route_path ||
                  location.pathname.startsWith(page.route_path + '/');
                return (
                  <button
                    key={page.page_code}
                    onClick={() => handleSubItemClick(page.route_path)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg
                      transition-colors text-right
                      ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-bg-secondary'}
                    `}
                  >
                    <span className="flex-shrink-0">
                      <DynamicIcon name={page.icon} className="w-4 h-4" />
                    </span>
                    <span className="flex-1 truncate text-right">
                      {pickLocalizedName(page, language)}
                    </span>
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

export default Sidebar;