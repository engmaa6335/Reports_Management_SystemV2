import { Navigate } from 'react-router-dom';
import { useEntityStore } from '../../stores/entity-store';
import { usePermission } from '../../hooks/usePermission';

export function SettingsPage() {
  const { activeEntity } = useEntityStore();
  const isTechSupport = activeEntity?.roleCode === 'tech_support';

  // ⭐ فحص الصلاحيات لمعرفة أين نوجه المستخدم
  const { allowed: canTemplates } = usePermission('templates.view');
  const { allowed: canUsers } = usePermission('users.view');
  const { allowed: canEntities } = usePermission('entities.view');
  const { allowed: canRoles } = usePermission('roles.view');
  const { allowed: canThemes } = usePermission('themes.view');
  const { allowed: canNotifications } = usePermission('notifications.manage');

  // tech_support → إعدادات القوالب
  if (isTechSupport && canTemplates) {
    return <Navigate to="/settings/templates" replace />;
  }

  // ⭐ توجيه ديناميكي بناءً على الصلاحيات المتاحة
  if (canTemplates) return <Navigate to="/settings/templates" replace />;
  if (canUsers) return <Navigate to="/settings/users" replace />;
  if (canEntities) return <Navigate to="/settings/entities" replace />;
  if (canRoles) return <Navigate to="/settings/roles" replace />;
  if (canThemes) return <Navigate to="/settings/themes" replace />;
  if (canNotifications) return <Navigate to="/settings/notifications" replace />;

  // لا يوجد صلاحيات → لا تعرض شيئاً (سيتم توجيهه من App.tsx)
  return null;
}

export default SettingsPage;