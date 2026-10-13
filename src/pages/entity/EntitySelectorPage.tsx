import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, MapPin, Target, BookOpen, Landmark, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore, type UserEntity } from '../../stores/entity-store';
import { Button, Card } from '../../components/ui';

// خريطة الأيقونات
const entityIcons: Record<string, React.ReactNode> = {
  region: <MapPin className="w-8 h-8" />,
  school: <Building2 className="w-8 h-8" />,
  tls_center: <Building2 className="w-8 h-8" />,
  qa_unit: <Target className="w-8 h-8" />,
  edu_unit: <BookOpen className="w-8 h-8" />,
  edc: <Landmark className="w-8 h-8" />,
};

// خريطة الألوان
const entityColors: Record<string, string> = {
  region: 'bg-info/10 text-info',
  school: 'bg-primary/10 text-primary',
  tls_center: 'bg-secondary/10 text-secondary',
  qa_unit: 'bg-warning/10 text-warning',
  edu_unit: 'bg-success/10 text-success',
  edc: 'bg-primary/10 text-primary',
};

export function EntitySelectorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { entities, loading, initialized, loadUserEntities, setActiveEntity } =
    useEntityStore();

  // تحميل الكيانات
  useEffect(() => {
    if (user && !initialized) {
      loadUserEntities(user.id);
    }
  }, [user, initialized, loadUserEntities]);

  // إذا كان هناك كيان واحد فقط → دخول مباشر
  useEffect(() => {
    if (initialized && entities.length === 1) {
      setActiveEntity(entities[0]);
      navigate('/dashboard', { replace: true });
    }
  }, [initialized, entities, setActiveEntity, navigate]);

  // إذا لم يكن هناك كيانات
  if (initialized && entities.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary p-4">
        <Card padding="lg" className="max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-text mb-2">
            {t('entity.no_entities')}
          </h1>
          <p className="text-text-secondary mb-6">
            {t('entity.contact_support')}
          </p>
          <Button onClick={() => useAuthStore.getState().signOut()} fullWidth>
            {t('auth.logout')}
          </Button>
        </Card>
      </div>
    );
  }

  const handleSelect = (entity: UserEntity) => {
    setActiveEntity(entity);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-bg-secondary p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-text mb-3">
            مرحباً {user?.fullName} 👋
          </h1>
          <p className="text-text-secondary text-lg">
            {t('entity.select_entity_desc')}
          </p>
          <p className="text-text-muted text-sm mt-2">
            لديك {entities.length} كيان مرتبط بحسابك
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary mt-4">جاري تحميل الكيانات...</p>
          </div>
        )}

        {/* Grid of Entities */}
        {!loading && entities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entities.map((entity) => (
              <button
                key={entity.id}
                onClick={() => handleSelect(entity)}
                className="group text-right transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
              >
                <Card
                  padding="lg"
                  className="h-full hover:shadow-hard transition-shadow cursor-pointer"
                >
                  {/* Icon */}
                  <div
                    className={`
                      inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4
                      ${entityColors[entity.entityTypeCode] || 'bg-primary/10 text-primary'}
                    `}
                  >
                    {entityIcons[entity.entityTypeCode] || <Building2 className="w-8 h-8" />}
                  </div>

                  {/* Type */}
                  <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">
                    {entity.entityTypeName}
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-bold text-text mb-2">
                    {entity.entityName}
                  </h3>

                  {/* Role */}
                  <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                    <span className="inline-block w-2 h-2 rounded-full bg-success" />
                    {entity.roleName}
                  </div>

                  {/* Enter Button */}
                  <div className="flex items-center justify-end gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                    <span>{t('entity.enter')}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}

        {/* Logout */}
        <div className="text-center mt-10">
          <Button
            variant="ghost"
            onClick={() => useAuthStore.getState().signOut()}
          >
            {t('auth.logout')}
          </Button>
        </div>
      </div>
    </div>
  );
}