import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  MapPin,
  Hash,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Power,
  PowerOff,
  Edit2,
  Trash2,
  Users,
  FileText,
  ChevronLeft,
  Activity,
  GitBranch,
} from 'lucide-react';
import { useEntitiesStore } from '../../../stores/entities-store';
import { useEntityStore } from '../../../stores/entity-store';
import { usePermission } from '../../../hooks/usePermission'; // ⭐ إضافة
import { Button, Card } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

// ================================================
// Helpers
// ================================================

function getEntityIcon(typeCode: string | null | undefined): string {
  switch (typeCode) {
    case 'region': return '🗺️';
    case 'school': return '🏫';
    case 'tls_center': return '🏢';
    case 'edu_unit': return '📚';
    case 'edc': return '🏛️';
    case 'qa_unit': return '✅';
    default: return '📍';
  }
}

function getTypeColor(typeCode: string | null | undefined): string {
  switch (typeCode) {
    case 'region': return '#3b82f6';
    case 'school': return '#10b981';
    case 'tls_center': return '#f59e0b';
    case 'edu_unit': return '#8b5cf6';
    case 'edc': return '#ef4444';
    case 'qa_unit': return '#06b6d4';
    default: return '#6b7280';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// ================================================
// Confirm State Type
// ================================================

interface ConfirmState {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText: string;
  variant: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void | Promise<void>;
}

// ================================================
// Component
// ================================================

export function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeEntity } = useEntityStore();

  // ⭐ فحص الصلاحيات
  const { allowed: canView } = usePermission('entities.view');
  const { allowed: canEdit } = usePermission('entities.edit');
  const { allowed: canDelete } = usePermission('entities.delete');
  const { allowed: canManage } = usePermission('entities.manage');

  const hasEditPermission = canManage || canEdit;
  const hasDeletePermission = canManage || canDelete;

  const {
    selectedEntity: entity,
    loadingDetail,
    children,
    linkedUsers,
    linkedReports,
    loadingRelations,
    activity,
    loadingActivity,
    error,
    deleting,
    loadEntityById,
    loadRelations,
    loadActivity,
    softDelete,
    activate,
    hardDelete,
    clearSelectedEntity,
    clearError,
  } = useEntitiesStore();

  const [activeTab, setActiveTab] = useState<
    'info' | 'children' | 'users' | 'reports' | 'activity'
  >('info');

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'warning',
    onConfirm: () => {},
  });

  const isTechSupport = activeEntity?.roleCode === 'tech_support';

  // ================================================
  // Effects
  // ================================================

  useEffect(() => {
    if (!id || id === 'undefined' || id === 'null' || id.length < 10) {
      console.warn('⚠️ EntityDetailPage: invalid id:', id);
      return;
    }

    loadEntityById(id);
    loadActivity(id);
    loadRelations(id);

    return () => {
      clearSelectedEntity();
    };
  }, [
    id,
    loadEntityById,
    loadActivity,
    loadRelations,
    clearSelectedEntity,
  ]);

  // ================================================
  // Handlers
  // ================================================

  const showConfirm = (config: Omit<ConfirmState, 'open'>) => {
    setConfirmState({ ...config, open: true });
  };

  const handleToggleActive = () => {
    if (!entity || !hasEditPermission) return;
    const isActive = entity.is_active;

    showConfirm({
      title: isActive ? 'تعطيل الكيان' : 'تفعيل الكيان',
      message: isActive
        ? `هل أنت متأكد من تعطيل "${entity.name_ar}"؟ لن يظهر في القوائم النشطة.`
        : `هل أنت متأكد من تفعيل "${entity.name_ar}"؟`,
      confirmText: isActive ? 'نعم، عطّل' : 'نعم، فعّل',
      variant: isActive ? 'warning' : 'success',
      onConfirm: async () => {
        if (isActive) {
          await softDelete(entity.id);
        } else {
          await activate(entity.id);
        }
        await loadEntityById(entity.id);
      },
    });
  };

  const handleHardDelete = () => {
    if (!entity || !hasDeletePermission) return;

    showConfirm({
      title: '⚠️ حذف نهائي',
      message: (
        <>
          هل أنت متأكد من{' '}
          <strong className="text-danger">الحذف النهائي</strong> للكيان{' '}
          <strong className="text-text">"{entity.name_ar}"</strong>؟
          <br />
          <span className="text-xs text-danger mt-2 block">
            ⚠️ هذا الإجراء لا يمكن التراجع عنه! سيتم فحص العلاقات أولاً.
          </span>
        </>
      ),
      confirmText: 'نعم، احذف نهائياً',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await hardDelete(entity.id);
          navigate('/settings/entities', { replace: true });
        } catch (err) {
          // الخطأ سيظهر في error banner
        }
      },
    });
  };

  // ================================================
  // Render — Guards
  // ================================================

  if (!canView) {
    return (
      <div className="p-6 text-center text-danger">
        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">لا تملك صلاحية الوصول</h2>
        <p>ليس لديك صلاحية لعرض هذا الكيان.</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => navigate('/settings/entities')}
        >
          العودة للكيانات
        </Button>
      </div>
    );
  }

  if (!id || id === 'undefined' || id === 'null') {
    return (
      <div className="space-y-6">
        <Card padding="lg">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-text mb-2">
              معرّف الكيان غير صالح
            </h2>
            <Button
              variant="primary"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/settings/entities')}
            >
              العودة للكيانات
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loadingDetail) {
    return <Loading message="جاري تحميل الكيان..." />;
  }

  if (!entity) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings/entities')}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-2xl font-bold text-text">الكيان</h1>
        </div>

        <Card padding="lg">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h2 className="text-xl font-bold text-text mb-2">
              الكيان غير موجود
            </h2>
            <Button
              variant="primary"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/settings/entities')}
            >
              العودة للكيانات
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const typeCode = entity.entity_type?.code || null;
  const typeColor = getTypeColor(typeCode);
  const isActive = entity.is_active ?? false;

  // ================================================
  // Render — Main
  // ================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings/entities')}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>

          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${typeColor}20` }}
          >
            {getEntityIcon(typeCode)}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-text">{entity.name_ar}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {entity.entity_type && (
                <span
                  className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{
                    backgroundColor: `${typeColor}15`,
                    color: typeColor,
                  }}
                >
                  {entity.entity_type.name_ar}
                </span>
              )}
              {entity.code && (
                <span className="inline-block px-2 py-0.5 rounded-md text-xs font-mono bg-bg-secondary text-text-secondary">
                  {entity.code}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                  isActive
                    ? 'bg-success/10 text-success'
                    : 'bg-danger/10 text-danger'
                }`}
              >
                {isActive ? '✅ نشط' : '⛔ معطّل'}
              </span>
            </div>
          </div>
        </div>

        {/* ⭐ أزرار التحكم تعتمد على الصلاحيات */}
        <div className="flex items-center gap-2">
          {hasEditPermission && (
            <Button
              variant="ghost"
              icon={
                isActive ? (
                  <PowerOff className="w-4 h-4" />
                ) : (
                  <Power className="w-4 h-4" />
                )
              }
              onClick={handleToggleActive}
              disabled={deleting}
            >
              {isActive ? 'تعطيل' : 'تفعيل'}
            </Button>
          )}

          {hasEditPermission && (
            <Button
              variant="primary"
              icon={<Edit2 className="w-4 h-4" />}
              onClick={() => navigate(`/settings/entities/${entity.id}/edit`)}
            >
              تعديل
            </Button>
          )}

          {hasDeletePermission && (
            <Button
              variant="danger"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleHardDelete}
              disabled={deleting}
            >
              حذف نهائي
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span className="flex-1">{error}</span>
            <button
              onClick={clearError}
              className="text-danger hover:underline text-xs"
            >
              إغلاق
            </button>
          </div>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md" className="text-center">
          <div className="text-3xl font-bold text-info">
            {entity.children_count ?? 0}
          </div>
          <div className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
            <GitBranch className="w-3 h-3" /> كيانات فرعية
          </div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-3xl font-bold text-primary">
            {entity.users_count ?? 0}
          </div>
          <div className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
            <Users className="w-3 h-3" /> مستخدمون
          </div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-3xl font-bold text-warning">
            {entity.reports_count ?? 0}
          </div>
          <div className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
            <FileText className="w-3 h-3" /> تقارير
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto">
        {[
          { id: 'info', label: 'معلومات', icon: <Building2 className="w-4 h-4" /> },
          {
            id: 'children',
            label: 'الأبناء',
            icon: <GitBranch className="w-4 h-4" />,
            count: entity.children_count,
          },
          {
            id: 'users',
            label: 'المستخدمون',
            icon: <Users className="w-4 h-4" />,
            count: entity.users_count,
          },
          {
            id: 'reports',
            label: 'التقارير',
            icon: <FileText className="w-4 h-4" />,
            count: entity.reports_count,
          },
          {
            id: 'activity',
            label: 'النشاط',
            icon: <Activity className="w-4 h-4" />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-bg-secondary">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-text mb-4">
            📋 المعلومات الأساسية
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoRow
              icon={<Building2 className="w-5 h-5" />}
              label="الاسم (عربي)"
              value={entity.name_ar}
            />
            <InfoRow
              icon={<Building2 className="w-5 h-5" />}
              label="الاسم (إنجليزي)"
              value={entity.name_en || '—'}
            />
            <InfoRow
              icon={<Hash className="w-5 h-5" />}
              label="الكود"
              value={entity.code || '—'}
            />
            <InfoRow
              icon={<Building2 className="w-5 h-5" />}
              label="النوع"
              value={entity.entity_type?.name_ar || '—'}
            />

            {entity.parent && (
              <InfoRow
                icon={<GitBranch className="w-5 h-5" />}
                label="تابع لـ"
                value={entity.parent.name_ar}
              />
            )}

            <InfoRow
              icon={<MapPin className="w-5 h-5" />}
              label="العنوان"
              value={entity.address || '—'}
            />

            <InfoRow
              icon={<Power className="w-5 h-5" />}
              label="الحالة"
              value={isActive ? 'نشط' : 'معطّل'}
              valueClass={isActive ? 'text-success' : 'text-danger'}
            />

            <InfoRow
              icon={<UserIcon className="w-5 h-5" />}
              label="مدير الكيان"
              value={
                entity.contact_info?.manager_name
                  ? String(entity.contact_info.manager_name)
                  : '—'
              }
            />

            <InfoRow
              icon={<Phone className="w-5 h-5" />}
              label="هاتف التواصل"
              value={
                entity.contact_info?.phone
                  ? String(entity.contact_info.phone)
                  : '—'
              }
            />

            <InfoRow
              icon={<Mail className="w-5 h-5" />}
              label="البريد"
              value={
                entity.contact_info?.email
                  ? String(entity.contact_info.email)
                  : '—'
              }
            />

            <InfoRow
              icon={<Calendar className="w-5 h-5" />}
              label="تاريخ الإنشاء"
              value={formatDate(entity.created_at)}
            />

            <InfoRow
              icon={<Calendar className="w-5 h-5" />}
              label="آخر تحديث"
              value={formatDate(entity.updated_at)}
            />
          </div>
        </Card>
      )}

      {/* Tab: Children */}
      {activeTab === 'children' && (
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-text mb-4">
            🔗 الكيانات الفرعية ({children.length})
          </h3>

          {loadingRelations ? (
            <div className="text-center py-8 text-text-muted">
              جاري التحميل...
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🌿</div>
              <p className="text-text-muted">لا توجد كيانات فرعية</p>
            </div>
          ) : (
            <div className="space-y-2">
              {children.map((child) => {
                const childColor = getTypeColor(child.entity_type?.code);
                return (
                  <button
                    key={child.id}
                    onClick={() => navigate(`/admin/entities/${child.id}`)}
                    className="w-full text-right p-3 rounded-lg border border-border bg-surface hover:border-primary/30 transition-colors flex items-center gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: `${childColor}20` }}
                    >
                      {getEntityIcon(child.entity_type?.code)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text truncate">
                        {child.name_ar}
                      </div>
                      <div className="text-xs text-text-muted">
                        {child.entity_type?.name_ar}
                        {child.code && ` • ${child.code}`}
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-text-muted" />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-text mb-4">
            👥 المستخدمون المرتبطون ({linkedUsers.length})
          </h3>

          {loadingRelations ? (
            <div className="text-center py-8 text-text-muted">
              جاري التحميل...
            </div>
          ) : linkedUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">👤</div>
              <p className="text-text-muted">لا يوجد مستخدمون مرتبطون</p>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedUsers.map((u) => (
                <button
                  key={u.assignment_id}
                  onClick={() => navigate(`/admin/users/${u.user_id}`)}
                  className="w-full text-right p-3 rounded-lg border border-border bg-surface hover:border-primary/30 transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                    {u.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text truncate flex items-center gap-2">
                      {u.full_name}
                      {u.is_primary && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          أساسي
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {u.role_name} • {u.email}
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-text-muted" />
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Reports */}
      {activeTab === 'reports' && (
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-text mb-4">
            📄 التقارير المرتبطة ({linkedReports.length})
          </h3>

          {loadingRelations ? (
            <div className="text-center py-8 text-text-muted">
              جاري التحميل...
            </div>
          ) : linkedReports.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-text-muted">لا توجد تقارير مرتبطة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedReports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/reports/${r.id}`)}
                  className="w-full text-right p-3 rounded-lg border border-border bg-surface hover:border-primary/30 transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text truncate">
                      {r.template_name}
                    </div>
                    <div className="text-xs text-text-muted">
                      {r.created_by_name} • {formatDate(r.created_at)}
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-text-muted" />
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Activity */}
      {activeTab === 'activity' && (
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-text mb-4">
            📊 سجل النشاط
          </h3>

          {loadingActivity ? (
            <div className="text-center py-8 text-text-muted">
              جاري التحميل...
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-text-muted">لا يوجد نشاط مسجل بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border border-border bg-surface flex items-start gap-3"
                >
                  <div className="text-2xl flex-shrink-0">
                    {getActionIcon(a.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text text-sm">
                      {getActionLabel(a.action)}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      🕐 {formatDateTime(a.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        loading={deleting}
        onConfirm={async () => {
          await confirmState.onConfirm();
          setConfirmState((s) => ({ ...s, open: false }));
        }}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}

// ================================================
// InfoRow
// ================================================

function InfoRow({
  icon,
  label,
  value,
  valueClass = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-text-muted mt-1">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-text-muted">{label}</div>
        <div className={`text-text break-words ${valueClass}`}>{value}</div>
      </div>
    </div>
  );
}

// ================================================
// Helpers
// ================================================

function getActionIcon(action: string): string {
  switch (action) {
    case 'create':
    case 'entity_created':
      return '🆕';
    case 'update':
    case 'entity_updated':
      return '✏️';
    case 'delete':
    case 'entity_deleted':
      return '🗑️';
    case 'activate':
    case 'entity_activated':
      return '✅';
    case 'deactivate':
    case 'entity_deactivated':
      return '⛔';
    default:
      return '📌';
  }
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: 'إنشاء كيان',
    entity_created: 'إنشاء كيان',
    update: 'تعديل كيان',
    entity_updated: 'تعديل كيان',
    delete: 'حذف كيان',
    entity_deleted: 'حذف كيان',
    activate: 'تفعيل كيان',
    entity_activated: 'تفعيل كيان',
    deactivate: 'تعطيل كيان',
    entity_deactivated: 'تعطيل كيان',
  };
  return labels[action] || action;
}