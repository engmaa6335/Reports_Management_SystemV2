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

  // ⭐ تجميع الإسنادات حسب entityId
  const groupedEntities = (() => {
    const map = new Map<
      string,
      {
        entityId: string;
        entityName: string;
        entityTypeCode: string;
        roleCode: string;
        regionModes: ('rl' | 'tls')[];
      }
    >();

    (availableEntities ?? []).forEach((a) => {
      if (!map.has(a.entityId)) {
        map.set(a.entityId, {
          entityId: a.entityId,
          entityName: a.entityName,
          entityTypeCode: a.entityTypeCode,
          roleCode: a.roleCode,
          regionModes: [],
        });
      }
      if (a.regionMode) {
        const entry = map.get(a.entityId)!;
        if (!entry.regionModes.includes(a.regionMode)) {
          entry.regionModes.push(a.regionMode);
        }
      }
    });

    return Array.from(map.values());
  })();

  useEffect(() => {
    if (user && !initialized) {
      loadUserEntities(user.id);
    }
  }, [user, initialized, loadUserEntities]);

  useEffect(() => {
    if (initialized && groupedEntities.length === 0) {
      navigate('/dashboard', { replace: true });
    }
  }, [initialized, groupedEntities.length, navigate]);

  const handleSelect = (entityId: string) => {
    setActiveEntity(entityId);
    navigate('/dashboard', { replace: true });
  };

  if (!initialized) {
    return <Loading message="جاري تحميل الكيانات..." />;
  }

  if (groupedEntities.length === 0) {
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

        <Card padding="md">
          <div className="space-y-2">
            {groupedEntities.map((entity) => {
              const isActive = entity.entityId === activeEntity?.entityId;

              return (
                <button
                  key={entity.entityId}
                  onClick={() => handleSelect(entity.entityId)}
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

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text flex items-center gap-2 flex-wrap">
                      {entity.entityName}
                      {entity.regionModes.includes('rl') && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-100 text-blue-700">
                          R.L
                        </span>
                      )}
                      {entity.regionModes.includes('tls') && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-green-100 text-green-700">
                          TLS
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-text-secondary mt-0.5">
                      {entity.roleCode}
                    </div>
                  </div>

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

        <div className="text-center text-xs text-text-muted">
          مسجل الدخول باسم: {user?.fullName}
        </div>
      </div>
    </div>
  );
}