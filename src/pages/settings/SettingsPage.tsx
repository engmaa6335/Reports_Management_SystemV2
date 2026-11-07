// src/pages/settings/SettingsPage.tsx
import { Navigate } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';

export function SettingsPage() {
  // ⭐ فحص كل الصلاحيات المتاحة
  const { allowed: canTemplates, loading: l1 } = usePermission('templates.view');
  const { allowed: canUsers, loading: l2 } = usePermission('users.view');
  const { allowed: canEntities, loading: l3 } = usePermission('entities.view');
  const { allowed: canRoles, loading: l4 } = usePermission('roles.view');
  const { allowed: canThemes, loading: l5 } = usePermission('themes.view');
  const { allowed: canNotifications, loading: l6 } = usePermission('notifications.manage');

  // ⭐ إذا أي فحص لا يزال يحمّل → انتظر
  if (l1 || l2 || l3 || l4 || l5 || l6) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // ⭐ توجيه ديناميكي حسب أول صلاحية متاحة
  if (canTemplates) return <Navigate to="/settings/templates" replace />;
  if (canUsers) return <Navigate to="/settings/users" replace />;
  if (canEntities) return <Navigate to="/settings/entities" replace />;
  if (canRoles) return <Navigate to="/settings/roles" replace />;
  if (canThemes) return <Navigate to="/settings/themes" replace />;
  if (canNotifications) return <Navigate to="/settings/notifications" replace />;

  // لا صلاحيات فرعية → SettingsLayout سيظهر AccessDenied
  return null;
}

export default SettingsPage;