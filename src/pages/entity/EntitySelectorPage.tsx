import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, MapPin, School, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';

export function EntitySelectorPage() {
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

  // 1. تحميل الكيانات
  useEffect(() => {
    if (user && !initialized) {
      loadUserEntities(user.id);
    }
  }, [user, initialized, loadUserEntities]);

  // 2. التوجيه التلقائي
  useEffect(() => {
    if (initialized && safeEntities.length === 0) {
      navigate('/dashboard', { replace: true });
    }
  }, [initialized, safeEntities.length, navigate]);

  const handleSelect = (entity: (typeof safeEntities)[0]) => {
    setActiveEntity(entity);
    navigate('/dashboard', { replace: true });
  };

  if (!initialized) {
    return <Loading message="جاري تحميل الكيانات..." />;
  }

  if (safeEntities.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-text mb-2">
            لا توجد كيانات مرتبطة بحسابك
          </h1>
          <p className="text-text-secondary mb-6">
            تواصل مع الدعم الفني لإسناد كيان لك
          </p>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            العودة للوحة التحكم
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">
            {t('entity.select_entity')}
          </h1>
          <p className="text-text-secondary mt-2">
            اختر الكيان الذي تريد العمل عليه
          </p>
        </div>

        {/* Entity List */}
        <Card padding="md">
          <div className="space-y-2">
            {safeEntities.map((entity) => {
              const isActive = entity.assignmentId === activeEntity?.assignmentId;

              return (
                <button
                  key={entity.assignmentId}
                  onClick={() => handleSelect(entity)}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-lg
                    border transition-all text-right
                    ${
                      isActive
                        ? 'bg-primary/5 border-primary/30 ring-2 ring-primary/20'
                        : 'bg-surface border-border hover:border-primary/50 hover:bg-bg-secondary'
                    }
                  `}
                >
                  {/* Icon */}
                  <div
                    className={`
                      flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                      ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'bg-primary/10 text-primary'
                      }
                    `}
                  >
                    {entity.entityTypeCode === 'region' ? (
                      <MapPin className="w-6 h-6" />
                    ) : entity.entityTypeCode === 'school' ? (
                      <School className="w-6 h-6" />
                    ) : entity.entityTypeCode === 'tls_center' ? (
                      <Building2 className="w-6 h-6" />
                    ) : (
                      <Home className="w-6 h-6" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text flex items-center gap-2">
                      {entity.entityName}
                      {entity.regionMode && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            entity.regionMode === 'rl'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {entity.regionMode === 'rl' ? 'R.L' : 'TLS'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-text-secondary mt-0.5">
                      {entity.roleCode}
                    </div>
                  </div>

                  {/* Check */}
                  {isActive && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-text-muted">
          مسجل الدخول باسم: {user?.fullName}
        </div>
      </div>
    </div>
  );
}