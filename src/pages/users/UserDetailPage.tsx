import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Shield,
  Plus,
  X,
  Edit2,
  Save,
  Activity,
  Key,
  Hash,
  Lock,
} from 'lucide-react';
import { useUsersStore } from '../../stores/users-store';
import { usePermission } from '../../hooks/usePermission';
import { listEntitiesByType } from '../../lib/users-api';
import { getAllowedEntityTypes } from '../../lib/role-entity-types';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import type { Entity } from '../../types/users';

// ================================================
// Confirm State Type
// ================================================

interface ConfirmState {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText: string;
  variant: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void | Promise<void>;
}

// ================================================
// Component
// ================================================

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ⭐ فحص الصلاحيات
  const { allowed: canView, loading: checkingView } = usePermission('users.view');
  const { allowed: canEdit } = usePermission('users.edit');
  const { allowed: canManage } = usePermission('users.manage');
  const { allowed: canDeactivate } = usePermission('users.deactivate');

  const hasEditPermission = canManage || canEdit;
  const hasDeactivatePermission = canManage || canDeactivate;

  const {
    selectedUser: user,
    roles,
    activity,
    loadingUser,
    loadingActivity,
    saving,
    error,
    loadUserById,
    loadRoles,
    loadActivity,
    toggleActive,
    endRole,
    addRole,
    updateProfile,
    clearSelectedUser,
    clearError,
  } = useUsersStore();

  const [activeTab, setActiveTab] = useState<'info' | 'roles' | 'permissions' | 'activity'>(
    'info'
  );

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    employee_number: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Add Role Modal
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleId, setNewRoleId] = useState('');
  const [newEntityId, setNewEntityId] = useState('');
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [availableEntities, setAvailableEntities] = useState<Entity[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Confirm Modal
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'warning',
    onConfirm: () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ================================================
  // Effects
  // ================================================

  useEffect(() => {
    if (id && canView) {
      loadUserById(id);
      loadRoles();
      loadActivity(id);
    }
    return () => {
      clearSelectedUser();
    };
  }, [id, loadUserById, loadRoles, loadActivity, clearSelectedUser, canView]);

  // Load entities when role changes
  useEffect(() => {
    if (!newRoleId) {
      setAvailableEntities([]);
      return;
    }

    const role = roles.find((r) => r.id === newRoleId);
    if (!role) return;

    const allowedTypes = getAllowedEntityTypes(role.code);
    if (allowedTypes.length === 0) {
      setAvailableEntities([]);
      return;
    }

    const fetchEntities = async () => {
      setLoadingEntities(true);
      try {
        const all: Entity[] = [];
        for (const typeCode of allowedTypes) {
          const list = await listEntitiesByType(typeCode);
          all.push(...list);
        }
        setAvailableEntities(all);
      } catch (err) {
        console.error('Failed to load entities:', err);
      } finally {
        setLoadingEntities(false);
      }
    };

    fetchEntities();
  }, [newRoleId, roles]);

  // Entity options for SearchableSelect
  const entityOptions = useMemo(
    () =>
      availableEntities.map((e) => ({
        value: e.id,
        label: e.name_ar,
        sublabel:
          e.entity_type_name && e.entity_type_name !== 'منطقة'
            ? e.entity_type_name
            : undefined,
        icon: getEntityIcon(e.entity_type_code),
      })),
    [availableEntities]
  );

  // ================================================
  // Confirm Helper
  // ================================================

  const showConfirm = (config: Omit<ConfirmState, 'open'>) => {
    setConfirmState({ ...config, open: true });
  };

  const closeConfirm = () => {
    if (confirmLoading) return;
    setConfirmState((s) => ({ ...s, open: false }));
  };

  const handleConfirm = async () => {
    setConfirmLoading(true);
    try {
      await confirmState.onConfirm();
      setConfirmState((s) => ({ ...s, open: false }));
    } catch (err) {
      console.error('Confirm action error:', err);
    } finally {
      setConfirmLoading(false);
    }
  };

  // ================================================
  // Handlers
  // ================================================

  const handleToggleActive = () => {
    if (!user || !hasDeactivatePermission) return;
    const isActive = user.is_active;

    showConfirm({
      title: isActive ? 'تعطيل المستخدم' : 'تفعيل المستخدم',
      message: isActive
        ? `هل أنت متأكد من تعطيل "${user.full_name}"؟ لن يستطيع الدخول إلى النظام.`
        : `هل أنت متأكد من تفعيل "${user.full_name}"؟ سيستطيع الدخول إلى النظام.`,
      confirmText: isActive ? 'نعم، عطّل' : 'نعم، فعّل',
      variant: isActive ? 'danger' : 'success',
      onConfirm: async () => {
        await toggleActive(user.id, !isActive);
      },
    });
  };

  const handleOpenEdit = () => {
    if (!user || !hasEditPermission) return;
    setEditForm({
      full_name: user.full_name,
      phone: user.phone || '',
      employee_number: user.employee_number || '',
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!user || !hasEditPermission) return;

    const errors: Record<string, string> = {};
    if (!editForm.full_name.trim()) {
      errors.full_name = 'الاسم الكامل مطلوب';
    }
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    try {
      await updateProfile(user.id, {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || null,
        employee_number: editForm.employee_number.trim() || null,
      } as any);
      setShowEditModal(false);
      loadActivity(user.id);
    } catch {
      showConfirm({
        title: 'خطأ',
        message: 'فشل التحديث',
        confirmText: 'حسناً',
        variant: 'danger',
        onConfirm: () => {},
      });
    }
  };

  const handleEndRole = (assignmentId: string, roleName: string) => {
    if (!user || !hasEditPermission) return;

    showConfirm({
      title: 'إنهاء الدور',
      message: (
        <>
          هل أنت متأكد من إنهاء دور{' '}
          <span className="font-semibold text-text">"{roleName}"</span>{' '}
          للمستخدم{' '}
          <span className="font-semibold text-text">"{user.full_name}"</span>؟
          <br />
          <span className="text-xs text-warning mt-2 block">
            ⚠️ سيُسجَّل تاريخ الانتهاء، ولن يفقد المستخدم تاريخه.
          </span>
        </>
      ),
      confirmText: 'نعم، أنهِ الدور',
      variant: 'danger',
      onConfirm: async () => {
        await endRole(assignmentId, user.id);
      },
    });
  };

  const handleAddRole = async () => {
    if (!user || !newRoleId || !newEntityId || !hasEditPermission) {
      return;
    }

    try {
      await addRole(user.id, newRoleId, newEntityId, newIsPrimary);
      setShowAddRole(false);
      setNewRoleId('');
      setNewEntityId('');
      setNewIsPrimary(false);
      setAvailableEntities([]);
      loadActivity(user.id);
    } catch {
      showConfirm({
        title: 'خطأ',
        message: 'فشل إضافة الدور',
        confirmText: 'حسناً',
        variant: 'danger',
        onConfirm: () => {},
      });
    }
  };

  const handleCloseAddRole = () => {
    setShowAddRole(false);
    setNewRoleId('');
    setNewEntityId('');
    setNewIsPrimary(false);
    setAvailableEntities([]);
  };

  // ================================================
  // Render Guards
  // ================================================

  if (checkingView) {
    return <Loading message="جاري التحقق من الصلاحيات..." />;
  }

  if (!canView) {
    return (
      <div className="p-6 text-center text-danger">
        <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">لا تملك صلاحية الوصول</h2>
        <p>ليس لديك صلاحية لعرض بيانات هذا المستخدم.</p>
      </div>
    );
  }

  if (loadingUser) {
    return <Loading message="جاري تحميل المستخدم..." />;
  }

  if (!user) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-lg font-bold text-text mb-2">
            المستخدم غير موجود
          </h3>
          <Button variant="ghost" onClick={() => navigate('/settings/users')}>
            العودة للمستخدمين
          </Button>
        </div>
      </Card>
    );
  }

  const selectedRole = roles.find((r) => r.id === newRoleId);
  const allowedTypeNames = selectedRole
    ? getAllowedEntityTypes(selectedRole.code)
        .map(getEntityTypeName)
        .join('، ')
    : '';

  // ================================================
  // Render — Main
  // ================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings/users')}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-primary" />
              {user.full_name}
            </h1>
            <p className="text-text-secondary text-sm mt-1">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Key className="w-4 h-4" />}
            onClick={() =>
              navigate(`/settings/permissions/users/${user.id}`)
            }
          >
            الصلاحيات
          </Button>

          {/* ⭐ زر التفعيل/التعطيل يظهر فقط لمن يملك الصلاحية */}
          {hasDeactivatePermission && (
            <Button
              variant={user.is_active ? 'ghost' : 'primary'}
              onClick={handleToggleActive}
              disabled={saving}
            >
              {user.is_active ? 'تعطيل' : 'تفعيل'}
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto">
        {[
          { id: 'info', label: 'معلومات', icon: <UserIcon className="w-4 h-4" /> },
          { id: 'roles', label: 'الأدوار', icon: <Shield className="w-4 h-4" /> },
          {
            id: 'permissions',
            label: 'الصلاحيات الفردية',
            icon: <Key className="w-4 h-4" />,
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
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text">
              📋 المعلومات الأساسية
            </h3>
            {/* ⭐ زر التعديل يظهر فقط لمن يملك الصلاحية */}
            {hasEditPermission && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Edit2 className="w-4 h-4" />}
                onClick={handleOpenEdit}
              >
                تعديل
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow
              icon={<Mail className="w-5 h-5" />}
              label="البريد"
              value={user.email}
            />
            <InfoRow
              icon={<UserIcon className="w-5 h-5" />}
              label="اسم المستخدم"
              value={user.username}
            />
            <InfoRow
              icon={<Hash className="w-5 h-5" />}
              label="الرقم الوظيفي"
              value={user.employee_number || '—'}
            />
            <InfoRow
              icon={<UserIcon className="w-5 h-5" />}
              label="الاسم الكامل"
              value={user.full_name}
            />
            <InfoRow
              icon={<Phone className="w-5 h-5" />}
              label="الهاتف"
              value={user.phone || '—'}
            />
            <InfoRow
              icon={<Calendar className="w-5 h-5" />}
              label="تاريخ الإنشاء"
              value={new Date(user.created_at).toLocaleDateString('ar-EG')}
            />
            <InfoRow
              icon={<Calendar className="w-5 h-5" />}
              label="آخر دخول"
              value={
                user.last_login_at
                  ? new Date(user.last_login_at).toLocaleString('ar-EG')
                  : 'لم يدخل بعد'
              }
            />
            <InfoRow
              icon={<Shield className="w-5 h-5" />}
              label="الحالة"
              value={user.is_active ? 'نشط' : 'معطّل'}
              valueClass={user.is_active ? 'text-success' : 'text-danger'}
            />
          </div>
        </Card>
      )}

      {/* Tab: Roles */}
      {activeTab === 'roles' && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text">
              🎭 الأدوار والكيانات
            </h3>
            {/* ⭐ زر إضافة دور يظهر فقط لمن يملك الصلاحية */}
            {hasEditPermission && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowAddRole(true)}
              >
                إضافة دور
              </Button>
            )}
          </div>

          {user.roles.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              لا توجد أدوار نشطة
            </div>
          ) : (
            <div className="space-y-3">
              {user.roles.map((r) => (
                <div
                  key={r.assignment_id}
                  className="p-4 rounded-lg border border-border bg-surface hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-text">
                          {r.role_name}
                        </span>
                        {r.is_primary && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                            أساسي
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-text-secondary mt-1">
                        {r.entity_name && (
                          <>
                            🏢 {r.entity_name}
                            {r.region_name && ` — 🗺️ ${r.region_name}`}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-text-muted mt-1">
                        بدأ: {new Date(r.started_at).toLocaleDateString('ar-EG')}
                      </div>
                    </div>

                    {/* ⭐ زر الإنهاء يظهر فقط لمن يملك الصلاحية */}
                    {hasEditPermission && (
                      <button
                        onClick={() =>
                          handleEndRole(r.assignment_id, r.role_name)
                        }
                        disabled={saving}
                        className="text-xs text-danger hover:bg-danger/10 px-3 py-1.5 rounded-md transition-colors"
                      >
                        إنهاء
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab: Permissions */}
      {activeTab === 'permissions' && (
        <Card padding="lg" className="text-center">
          <Key className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">
            الصلاحيات الفردية (Overrides)
          </h3>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            لإدارة الصلاحيات الفردية لهذا المستخدم (إضافة allow/deny،
            تحديد النطاق، توثيق الموافقة الخارجية)، انتقل إلى صفحة الصلاحيات
            المخصصة.
          </p>
          <Button
            variant="primary"
            icon={<Key className="w-4 h-4" />}
            onClick={() =>
              navigate(`/settings/permissions/users/${user.id}`)
            }
          >
            إدارة الصلاحيات
          </Button>
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
              جاري تحميل النشاط...
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-text-muted">لا يوجد نشاط مسجل بعد</p>
              <p className="text-xs text-text-muted mt-2">
                سيظهر هنا أي تعديل على المستخدم أو أدواره
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border border-border bg-surface flex items-start gap-3 hover:border-primary/30 transition-colors"
                >
                  <div className="text-2xl flex-shrink-0">
                    {getActionIcon(a.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text text-sm">
                      {getActionLabel(a.action)}
                    </div>
                    {a.changes && Object.keys(a.changes).length > 0 && (
                      <div className="text-xs text-text-secondary mt-1 leading-relaxed">
                        {formatChanges(a.changes)}
                      </div>
                    )}
                    <div className="text-xs text-text-muted mt-1">
                      🕐 {new Date(a.created_at).toLocaleString('ar-EG')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <Card padding="lg" className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" />
                تعديل المعلومات
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-bg-secondary rounded-md"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  الاسم الكامل <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                  className={`w-full px-4 py-2.5 rounded-lg border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    editErrors.full_name ? 'border-danger' : 'border-border'
                  }`}
                />
                {editErrors.full_name && (
                  <p className="text-sm text-danger mt-1">
                    ⚠️ {editErrors.full_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  الرقم الوظيفي
                </label>
                <input
                  type="text"
                  value={editForm.employee_number}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, employee_number: e.target.value }))
                  }
                  placeholder="مثال: EMP-2026-001"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  الهاتف
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+970..."
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                />
              </div>

              <div className="p-3 rounded-lg bg-bg-secondary text-xs text-text-muted">
                💡 البريد الإلكتروني واسم المستخدم لا يمكن تعديلهما
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowEditModal(false)}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                icon={<Save className="w-4 h-4" />}
                onClick={handleSaveEdit}
                disabled={saving}
                loading={saving}
              >
                حفظ
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <Card padding="lg" className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                إضافة دور
              </h3>
              <button
                onClick={handleCloseAddRole}
                className="p-1 hover:bg-bg-secondary rounded-md"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  الدور
                </label>
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— اختر دور —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  الكيان
                </label>
                {!newRoleId ? (
                  <div className="px-4 py-3 rounded-lg border border-border bg-bg-secondary text-text-muted text-sm">
                    اختر الدور أولاً ليتم عرض الكيانات المتاحة
                  </div>
                ) : loadingEntities ? (
                  <div className="px-4 py-3 rounded-lg border border-border bg-bg-secondary text-text-muted text-sm">
                    جاري تحميل الكيانات...
                  </div>
                ) : entityOptions.length === 0 ? (
                  <div className="px-4 py-3 rounded-lg border border-warning bg-warning/5 text-warning text-sm">
                    ⚠️ لا توجد كيانات متاحة لهذا الدور
                  </div>
                ) : (
                  <SearchableSelect
                    options={entityOptions}
                    value={newEntityId}
                    onChange={setNewEntityId}
                    placeholder={`ابحث في ${allowedTypeNames}...`}
                    emptyMessage="لا توجد نتائج مطابقة"
                  />
                )}
                {allowedTypeNames && (
                  <p className="text-xs text-text-muted mt-1">
                    💡 نوع الكيان المتاح: {allowedTypeNames}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsPrimary}
                  onChange={(e) => setNewIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-text">تعيين كدور أساسي</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={handleCloseAddRole}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={handleAddRole}
                disabled={saving || !newRoleId || !newEntityId}
                loading={saving}
              >
                إضافة
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}

// ================================================
// InfoRow Component
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
    <div className="flex items-center gap-3">
      <span className="text-text-muted">{icon}</span>
      <div>
        <div className="text-xs text-text-muted">{label}</div>
        <div className={`text-text ${valueClass}`}>{value}</div>
      </div>
    </div>
  );
}

// ================================================
// Helpers
// ================================================

function getEntityIcon(entityTypeCode: string | null): string {
  switch (entityTypeCode) {
    case 'region': return '🗺️';
    case 'school': return '🏫';
    case 'tls_center': return '🏢';
    case 'edu_unit': return '📚';
    case 'edc': return '🏛️';
    case 'qa_unit': return '✅';
    default: return '📍';
  }
}

function getEntityTypeName(typeCode: string): string {
  const names: Record<string, string> = {
    region: 'منطقة',
    school: 'مدرسة',
    tls_center: 'مركز تطوير',
    edu_unit: 'وحدة تربوية',
    edc: 'مركز التطوير',
    qa_unit: 'وحدة ضمان الجودة',
  };
  return names[typeCode] || typeCode;
}

function getActionIcon(action: string): string {
  switch (action) {
    case 'user_created': return '🆕';
    case 'user_updated': return '✏️';
    case 'user_activated': return '✅';
    case 'user_deactivated': return '⛔';
    case 'user_hard_deleted': return '🗑️';
    case 'role_assigned': return '🎭';
    case 'role_ended': return '🚫';
    case 'create': return '➕';
    case 'update': return '✏️';
    case 'delete': return '🗑️';
    default: return '📌';
  }
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    user_created: 'إنشاء مستخدم',
    user_updated: 'تعديل معلومات',
    user_activated: 'تفعيل المستخدم',
    user_deactivated: 'تعطيل المستخدم',
    user_hard_deleted: 'حذف المستخدم',
    role_assigned: 'إسناد دور',
    role_ended: 'إنهاء دور',
    create: 'إنشاء',
    update: 'تعديل',
    delete: 'حذف',
  };
  return labels[action] || action;
}

function formatChanges(changes: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(changes)) {
    const v = value as { old?: unknown; new?: unknown };
    if (v && typeof v === 'object' && 'old' in v && 'new' in v) {
      parts.push(
        `${getFieldLabel(key)}: ${formatValue(v.old)} → ${formatValue(v.new)}`
      );
    }
  }
  return parts.join(' • ');
}

function getFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    full_name: 'الاسم',
    phone: 'الهاتف',
    employee_number: 'الرقم الوظيفي',
    is_active: 'الحالة',
    email: 'البريد',
  };
  return labels[key] || key;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'نشط' : 'معطّل';
  return String(value);
}

export default UserDetailPage;