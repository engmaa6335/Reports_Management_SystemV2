// ═══════════════════════════════════════════════════════════
// RolesPage — Dynamic permissions by page (with fixed header)
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Search,
  Save,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Lock,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermission } from '../../hooks/usePermission';
import { Card, Button } from '../../components/ui';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  getActiveRoles,
  getPagesWithPermissions,
  getOrphanPermissions,
  type PageWithPermissions,
  type OrphanPermission,
} from '../../lib/permissions-api';
import { supabase } from '../../lib/supabase';
import { DynamicIcon } from '../../components/layout/IconMapper';
import { pickLocalizedName } from '../../lib/i18n-helpers';

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

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function RolesPage() {
  const { i18n } = useTranslation();
  const language = i18n.language;

  const { allowed: canView, loading: checkingView } = usePermission('roles.view');
  const { allowed: canManageRoles } = usePermission('roles.manage');
  const { allowed: canManagePermissions } = usePermission('permissions.manage');
  const canEdit = canManageRoles || canManagePermissions;

  const [roles, setRoles] = useState<Role[]>([]);
  const [pages, setPages] = useState<PageWithPermissions[]>([]);
  const [orphans, setOrphans] = useState<OrphanPermission[]>([]);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [originalRolePermissions, setOriginalRolePermissions] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

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

  // ═══════════════════════════════════════════
  // Load Data
  // ═══════════════════════════════════════════

  useEffect(() => {
    async function load() {
      if (!canView) return;
      try {
        setLoading(true);

        const [rolesData, pagesData] = await Promise.all([
          getActiveRoles(),
          getPagesWithPermissions(),
        ]);

        // ⭐ Use permission_resource (not code) for orphan detection
        const linkedResources = pagesData
          .map((p) => p.permission_resource)
          .filter((r): r is string => !!r);

        const orphanData = await getOrphanPermissions(linkedResources);

        setRoles(rolesData);
        setPages(pagesData);
        setOrphans(orphanData);

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

  // Load role permissions
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

  // ═══════════════════════════════════════════
  // Computed
  // ═══════════════════════════════════════════

  const filteredPages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pages;
    return pages
      .map((page) => ({
        ...page,
        permissions: page.permissions.filter(
          (p) =>
            p.code.toLowerCase().includes(q) ||
            p.name_ar.toLowerCase().includes(q) ||
            p.action.toLowerCase().includes(q)
        ),
      }))
      .filter(
        (page) =>
          page.code.toLowerCase().includes(q) ||
          page.name_ar.toLowerCase().includes(q) ||
          (page.name_en || '').toLowerCase().includes(q) ||
          page.permissions.length > 0
      );
  }, [pages, search]);

  const filteredOrphans = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orphans;
    return orphans.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name_ar.toLowerCase().includes(q) ||
        p.action.toLowerCase().includes(q)
    );
  }, [orphans, search]);

  const hasChanges = useMemo(() => {
    if (rolePermissions.length !== originalRolePermissions.length) return true;
    const set = new Set(rolePermissions);
    return originalRolePermissions.some((id) => !set.has(id));
  }, [rolePermissions, originalRolePermissions]);

  // ═══════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════

  const togglePermission = (permissionId: string) => {
    if (!canEdit) return;
    setRolePermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const togglePage = (pageCode: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageCode)) {
        next.delete(pageCode);
      } else {
        next.add(pageCode);
      }
      return next;
    });
  };

  const toggleAllInPage = (page: PageWithPermissions, checked: boolean) => {
    if (!canEdit) return;
    const ids = page.permissions.map((p) => p.id);
    setRolePermissions((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...ids]));
      }
      return prev.filter((id) => !ids.includes(id));
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

  // ═══════════════════════════════════════════
  // Render Guards
  // ═══════════════════════════════════════════

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

  // ═══════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════

  return (
    <div
      className="max-w-7xl mx-auto flex flex-col gap-4"
      style={{ height: 'calc(100vh - 8rem)' }}
    >
      {/* ═══ Fixed Header ═══ */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          إدارة الأدوار والصلاحيات
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          عرض وتعديل صلاحيات الأدوار — مجمّعة حسب الصفحات
        </p>
      </div>

      {error && (
        <Card padding="md" className="border-danger bg-danger/5 flex-shrink-0">
          <div className="text-danger text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        </Card>
      )}

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        {/* LEFT: Roles Sidebar */}
        <div className="lg:col-span-1 flex flex-col min-h-0">
          <Card padding="md" className="flex flex-col min-h-0 h-full">
            <h3 className="text-sm font-bold text-text-muted mb-3 uppercase flex-shrink-0">
              الأدوار ({roles.length})
            </h3>
            <div className="space-y-1 overflow-y-auto flex-1 min-h-0 -mx-2 px-2">
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
                  <div
                    className={`text-xs ${
                      selectedRole?.id === role.id
                        ? 'text-white/70'
                        : 'text-text-muted'
                    }`}
                  >
                    {role.code}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT: Permissions */}
        <div className="lg:col-span-3 flex flex-col min-h-0 gap-3">
          {selectedRole && (
            <>
              {/* Fixed Role Header */}
              <Card
                padding="md"
                className="flex-shrink-0 flex items-center justify-between flex-wrap gap-3"
              >
                <div>
                  <h2 className="text-lg font-bold text-text">
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

              {/* Fixed Search Bar */}
              <Card padding="md" className="flex-shrink-0">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث في الصفحات والصلاحيات..."
                    className="w-full pr-10 pl-3 py-2 rounded-lg border border-border bg-surface text-sm"
                  />
                </div>
              </Card>

              {/* Scrollable Permissions List */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                {filteredPages.map((page) => {
                  const expanded = expandedPages.has(page.code);
                  const pagePermCount = page.permissions.filter((p) =>
                    rolePermissions.includes(p.id)
                  ).length;
                  const allChecked =
                    page.permissions.length > 0 &&
                    page.permissions.every((p) => rolePermissions.includes(p.id));

                  return (
                    <Card key={page.code} padding="none" className="overflow-hidden">
                      <button
                        onClick={() => togglePage(page.code)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary/50 transition-colors text-right"
                      >
                        <ChevronDown
                          className={`w-4 h-4 text-text-muted transition-transform flex-shrink-0 ${
                            expanded ? '' : '-rotate-90'
                          }`}
                        />
                        <span className="flex-shrink-0 text-primary">
                          <DynamicIcon name={page.icon} className="w-5 h-5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-text text-sm">
                            {pickLocalizedName(page, language)}
                          </div>
                          <div className="text-xs text-text-muted font-mono">
                            {page.code}
                            {page.permission_resource &&
                              page.permission_resource !== page.code && (
                                <span className="ml-2 text-info">
                                  → {page.permission_resource}
                                </span>
                              )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-text-muted">
                            {pagePermCount} / {page.permissions.length}
                          </span>
                          {canEdit && page.permissions.length > 0 && (
                            <label
                              className="flex items-center gap-1 text-xs cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={allChecked}
                                onChange={(e) =>
                                  toggleAllInPage(page, e.target.checked)
                                }
                                className="w-3.5 h-3.5"
                              />
                              الكل
                            </label>
                          )}
                        </div>
                      </button>

                      {expanded && page.permissions.length > 0 && (
                        <div className="px-4 pb-3 pt-1 border-t border-border bg-bg-secondary/20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {page.permissions.map((perm) => {
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
                                      {perm.action}
                                      {perm.qualifier && (
                                        <span className="ml-1 text-warning">
                                          ({perm.qualifier})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {checked && (
                                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {expanded && page.permissions.length === 0 && (
                        <div className="px-4 pb-3 pt-2 border-t border-border text-xs text-text-muted text-center">
                          لا توجد صلاحيات معرّفة لهذه الصفحة
                        </div>
                      )}
                    </Card>
                  );
                })}

                {filteredOrphans.length > 0 && (
                  <Card padding="none" className="overflow-hidden border-warning/30">
                    <div className="flex items-center gap-3 px-4 py-3 bg-warning/5">
                      <FileText className="w-5 h-5 text-warning" />
                      <div className="flex-1">
                        <div className="font-medium text-text text-sm">
                          صلاحيات فرعية (غير مرتبطة بصفحة)
                        </div>
                        <div className="text-xs text-text-muted">
                          {filteredOrphans.length} صلاحية — مثل التقارير المتخصصة
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-3 pt-1 bg-bg-secondary/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {filteredOrphans.map((perm) => {
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
                                  {perm.qualifier && (
                                    <span className="ml-1 text-warning">
                                      ({perm.qualifier})
                                    </span>
                                  )}
                                </div>
                              </div>
                              {checked && (
                                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}

                {filteredPages.length === 0 && filteredOrphans.length === 0 && (
                  <Card padding="lg" className="text-center">
                    <p className="text-text-muted">لا توجد نتائج مطابقة</p>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </div>

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

export default RolesPage;