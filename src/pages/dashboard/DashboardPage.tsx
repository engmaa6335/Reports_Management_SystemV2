import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    activeEntity,
    availableEntities,
    initialized,
    loadUserEntities,
    setActiveEntity,
  } = useEntityStore();

  // ⭐ تأمين المتغيرات
  const safeEntities = availableEntities ?? [];

  // 🔑 1. تحميل الكيانات
  useEffect(() => {
    if (user && !initialized) {
      loadUserEntities(user.id);
    }
  }, [user, initialized, loadUserEntities]);

  // 🔑 2. تحديد الكيان النشط أو التوجيه
  useEffect(() => {
    if (!initialized) return;
    if (safeEntities.length === 0) return;

    if (safeEntities.length === 1 && !activeEntity) {
      setActiveEntity(safeEntities[0]);
      return;
    }

    if (safeEntities.length > 1 && !activeEntity) {
      navigate('/select-entity', { replace: true });
    }
  }, [initialized, safeEntities, activeEntity, setActiveEntity, navigate]);

  // 🔑 3. شاشة التحميل
  if (!initialized) {
    return <Loading message="جاري تحميل البيانات..." />;
  }

  // 🔑 4. لا كيانات
  if (safeEntities.length === 0) {
    return (
      <Card padding="lg" className="max-w-md mx-auto text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-text mb-2">
          {t('entity.no_entities')}
        </h1>
        <p className="text-text-secondary mb-6">
          {t('entity.contact_support')}
        </p>
      </Card>
    );
  }

  // 🔑 5. انتظار الكيان النشط
  if (!activeEntity) {
    return <Loading message="جاري التحضير..." />;
  }

  // 🔑 6. العرض الرئيسي
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">
            {t('auth.welcome')}، {user?.fullName} 👋
          </h1>
          <p className="text-text-secondary mt-1">
            أنت الآن في: <strong>{activeEntity.entityName}</strong>
            {activeEntity.regionMode && (
              <span
                className={`mr-2 text-xs px-2 py-1 rounded font-bold ${
                  activeEntity.regionMode === 'rl'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {activeEntity.regionMode === 'rl' ? 'R.L' : 'TLS'}
              </span>
            )}
          </p>
        </div>

        {safeEntities.length > 1 && (
          <Button
            variant="secondary"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => navigate('/select-entity')}
          >
            {t('entity.switch_entity')}
          </Button>
        )}
      </div>

      {/* Placeholder */}
      <Card padding="lg">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4">
            <UserIcon className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">
            🎉 الـ Layout جاهز!
          </h2>
          <p className="text-text-secondary">
            Topbar و Sidebar يعملان بشكل صحيح
          </p>
          <p className="text-text-muted text-sm mt-2">
            الدور الحالي: <strong>{activeEntity.roleCode}</strong>
          </p>
        </div>
      </Card>
    </div>
  );
}