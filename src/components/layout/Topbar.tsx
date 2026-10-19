import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User as UserIcon,
  LogOut,
  Settings,
  RefreshCw,
  ChevronDown,
  Menu,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { NotificationBell } from '../notifications/NotificationBell';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { activeEntity, availableEntities } = useEntityStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // ⭐ تأمين المتغيرات
  const safeAvailableEntities = availableEntities ?? [];
  const safeRegionModes: ('rl' | 'tls')[] = activeEntity?.regionModes ?? [];

  const uniqueEntityIds = new Set(
    safeAvailableEntities.map((a) => a.entityId)
  );
  const safeEntityCount = uniqueEntityIds.size;

  const handleSwitchEntity = () => {
    navigate('/select-entity');
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {activeEntity && (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-bg-secondary">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs text-text-muted leading-none mb-0.5">
                {activeEntity.roleCode || ''}
              </div>
              <div className="text-sm font-medium text-text leading-none flex items-center gap-2 flex-wrap">
                {activeEntity.entityName}
                {safeRegionModes.includes('rl') && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-700">
                    R.L
                  </span>
                )}
                {safeRegionModes.includes('tls') && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-green-100 text-green-700">
                    TLS
                  </span>
                )}
              </div>
            </div>

            {safeEntityCount > 1 && (
              <button
                onClick={handleSwitchEntity}
                className="p-1.5 rounded-md hover:bg-surface text-text-secondary transition-colors"
                title={t('entity.switch_entity')}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
              {user?.fullName?.charAt(0) || '؟'}
            </div>
            <span className="hidden sm:block text-sm font-medium text-text max-w-[120px] truncate">
              {user?.fullName}
            </span>
            <ChevronDown className="w-4 h-4 text-text-muted hidden sm:block" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />

              <div className="absolute top-full left-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-hard z-50 overflow-hidden">
                <div className="p-4 border-b border-border bg-bg-secondary">
                  <div className="text-sm font-semibold text-text truncate">
                    {user?.fullName}
                  </div>
                  <div
                    className="text-xs text-text-muted truncate mt-0.5"
                    dir="ltr"
                  >
                    {user?.email}
                  </div>
                </div>

                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-secondary text-text text-sm transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-text-secondary" />
                    <span>{t('settings.profile')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-secondary text-text text-sm transition-colors"
                  >
                    <Settings className="w-4 h-4 text-text-secondary" />
                    <span>{t('settings.title')}</span>
                  </button>
                </div>

                <div className="p-1.5 border-t border-border">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-danger/10 text-danger text-sm transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('auth.logout')}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}