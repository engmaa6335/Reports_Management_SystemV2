import { Navigate } from 'react-router-dom';
import { useEntityStore } from '../../stores/entity-store';

export function SettingsPage() {
  const { activeEntity } = useEntityStore();
  const isTechSupport = activeEntity?.roleCode === 'tech_support';

  // tech_support → إعدادات القوالب
  if (isTechSupport) {
    return <Navigate to="/settings/templates" replace />;
  }

  return null;
}