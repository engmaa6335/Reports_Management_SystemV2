import { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Search,
  Save,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { Card, Button } from '../../components/ui';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { getActiveRoles, getAllPermissions } from '../../lib/permissions-api';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface Role {
  id: string;
  code: string;
  name_ar: string;
  description: string | null;
  is_active: boolean;
  hierarchy_level: number;
}

interface Permission {
  id: string;
  code: string;
  name_ar: string;
  category: string;
  resource: string;
  action: string;
  qualifier: string | null;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function RolesPage() {
  // ⭐ فحص الصلاحيات
  const { allowed: canView, loading: checkingView } = usePermission('roles.view');
  const { allowed: canManageRoles } = usePermission('roles.manage');
  const { allowed: canManagePermissions } = usePermission('permissions.manage');

  const canEdit = canManageRoles || canManagePermissions;

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [originalRolePermissions, setOriginalRolePermissions] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // ═══════════════════════════════════════════════════════════
  // Confirm Modal State
  // ═══════════════════════════════════════════════════════════
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'warning',
    onConfirm: () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const showConfirm = (config: Omit<typeof confirmState, 'open'>) => {
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

  // ═══════════════════════════════════════════════════════════
  // Load Data
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    async function load() {
      if (!canView) return;
      try {
        setLoading(true);
        const [rolesData, permsData] = await Promise.all([
          getActiveRoles(),
          getAllPermissions(),
        ]);
        setRoles(rolesData);
        setPermissions(permsData);
        if (rolesData.length > 0) {
          setSelectedRole(rolesData[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'فشل تحميل البيانات');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [canView]);

  // تحميل صلاحيات الدور المحدد
  useEffect(() => {
    async function loadRolePermissions() {
      if (!selectedRole) return;
      try {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', selectedRole.id);
        
        if (error) throw error;
        const ids = data.map((rp) => rp.permission_id);
        setRolePermissions(ids);
        setOriginalRolePermissions(ids);
      } catch (err) {
        console.error('Failed to load role permissions:', err);
      }
    }
    loadRolePermissions();
  }, [selectedRole]);

  // ═══════════════════════════════════════════════════════════
  // Computed
  // ═══════════════════════════════════════════════════════════

  const categories = useMemo(() => {
    const set = new Set(permissions.map((p) => p.category));
    return Array.from(set).sort();
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permissions.filter((p) => {
      const matchSearch =
        !q ||
        p.name_ar.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.qualifier && p.qualifier.toLowerCase().includes(q));
      
      const matchCategory =
        categoryFilter === 'all' || p.category === categoryFilter;
      
      return matchSearch && matchCategory;
    });
  }, [permissions, search, categoryFilter]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    filteredPermissions.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredPermissions]);

  const hasChanges = useMemo(() => {
    if (rolePermissions.length !== originalRolePermissions.length) return true;
    const set = new Set(rolePermissions);
    return originalRolePermissions.some((id) => !set.has(id));
  }, [rolePermissions, originalRolePermissions]);

  // ═══════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════

  const togglePermission = (permissionId: string) => {
    if (!canEdit) return;
    setRolePermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleAllInCategory = (category: string, checked: boolean) => {
    if (!canEdit) return;
    const categoryIds = filteredPermissions
      .filter((p) => p.category === category)
      .map((p) => p.id);

    setRolePermissions((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...categoryIds]));
      } else {
        return prev.filter((id) => !categoryIds.includes(id));
      }
    });
  };

  const handleSave = async () => {
    if (!selectedRole || !canEdit) return;
    try {
      setSaving(true);
      
      const toRemove = originalRolePermissions.filter(
        (id) => !rolePermissions.includes(id)
      );
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', selectedRole.id)
          .in('permission_id', toRemove);
        if (error) throw error;
      }

      const toAdd = rolePermissions.filter(
        (id) => !originalRolePermissions.includes(id)
      );
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .insert(
            toAdd.map((permId) => ({
              role_id: selectedRole.id,
              permission_id: permId,
              scope: 'own',
            }))
          );
        if (error) throw error;
      }

      setOriginalRolePermissions(rolePermissions);
      
      showConfirm({
        title: 'نجاح',
        message: 'تم حفظ التغييرات بنجاح',
        confirmText: 'حسناً',
        variant: 'success',
        onConfirm: () => {},
      });
    } catch (err: any) {
      showConfirm({
        title: 'خطأ',
        message: err.message || 'فشل الحفظ',
        confirmText: 'حسناً',
        variant: 'danger',
        onConfirm: () => {},
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setRolePermissions(originalRolePermissions);
  };

  // ═══════════════════════════════════════════════════════════
  // Render Guards
  // ═══════════════════════════════════════════════════════════

  if (checkingView) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6 text-center text-danger">
        <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">لا تملك صلاحية الوصول</h2>
        <p>ليس لديك صلاحية لإدارة الأدوار والصلاحيات.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          إدارة الأدوار والصلاحيات
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          عرض وتعديل صلاحيات الأدوار في النظام
        </p>
      </div>

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Roles List */}
        <div className="lg:col-span-1 space-y-4">
          <Card padding="md">
            <h3 className="text-sm font-bold text-text-muted mb-3 uppercase">
              الأدوار ({roles.length})
            </h3>
            <div className="space-y-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`
                    w-full text-right px-3 py-2 rounded-lg text-sm transition-colors
                    ${
                      selectedRole?.id === role.id
                        ? 'bg-primary text-white'
                        : 'text-text hover:bg-bg-secondary'
                    }
                  `}
                >
                  <div className="font-medium">{role.name_ar}</div>
                  <div className={`text-xs ${selectedRole?.id === role.id ? 'text-white/70' : 'text-text-muted'}`}>
                    {role.code}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Main: Permissions Matrix */}
        <div className="lg:col-span-3 space-y-4">
          {selectedRole && (
            <>
              {/* Role Header */}
              <Card padding="md" className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-text flex items-center gap-2">
                    صلاحيات: {selectedRole.name_ar}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {selectedRole.description || 'لا يوجد وصف'} · {selectedRole.code}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">
                    {rolePermissions.length} صلاحية مفعلة
                  </span>
                  {/* ⭐ أزرار الحفظ تظهر فقط لمن يملك الصلاحية */}
                  {canEdit && hasChanges && (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleCancel}>
                        إلغاء
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Save className="w-4 h-4" />}
                        onClick={handleSave}
                        loading={saving}
                      >
                        حفظ
                      </Button>
                    </>
                  )}
                </div>
              </Card>

              {/* Filters */}
              <Card padding="md">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو المفتاح..."
                      className="w-full pr-10 pl-3 py-2 rounded-lg border border-border bg-surface text-sm"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-border bg-surface text-sm"
                  >
                    <option value="all">كل الوحدات</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              {/* Permissions by Category */}
              {Object.keys(groupedPermissions).length === 0 ? (
                <Card padding="lg" className="text-center">
                  <p className="text-text-muted">لا توجد نتائج مطابقة</p>
                </Card>
              ) : (
                Object.entries(groupedPermissions).map(([category, perms]) => {
                  const allChecked = perms.every((p) =>
                    rolePermissions.includes(p.id)
                  );
                  return (
                    <Card key={category} padding="md">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                        <h3 className="text-sm font-bold text-text">
                          {getCategoryLabel(category)} ({perms.length})
                        </h3>
                        {/* ⭐ تحديد الكل يظهر فقط لمن يملك الصلاحية */}
                        {canEdit && (
                          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              onChange={(e) =>
                                toggleAllInCategory(category, e.target.checked)
                              }
                              className="w-3.5 h-3.5"
                            />
                            تحديد الكل
                          </label>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((perm) => {
                          const checked = rolePermissions.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`
                                flex items-start gap-2 p-2 rounded-lg transition-colors
                                ${canEdit ? 'cursor-pointer' : 'cursor-default'}
                                ${
                                  checked
                                    ? 'bg-success/5 border border-success/30'
                                    : 'bg-surface border border-border hover:bg-bg-secondary'
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(perm.id)}
                                className="mt-0.5 w-4 h-4"
                                disabled={!canEdit}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-text">
                                  {perm.name_ar}
                                </div>
                                <div className="text-xs text-text-muted font-mono truncate">
                                  {perm.code}
                                </div>
                              </div>
                              {checked && (
                                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

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

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    reports: 'التقارير',
    aggregates: 'التجميعيات',
    notifications: 'التنبيهات',
    themes: 'الثيمات',
    admin: 'الإدارة',
    entities: 'الكيانات',
    users: 'المستخدمين',
    roles: 'الأدوار',
    permissions: 'الصلاحيات',
    audit: 'التدقيق',
    settings: 'الإعدادات',
    templates: 'القوالب',
    subjects: 'المواد',
    regions: 'المناطق',
    bulk_import: 'الاستيراد الجماعي',
  };
  return labels[category] || category;
}

export default RolesPage;