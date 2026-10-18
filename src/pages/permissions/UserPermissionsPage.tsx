import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  User as UserIcon,
  Shield,
  Key,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Card, Button } from '../../components/ui';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  getUserOverrides,
  getAllPermissions,
} from '../../lib/permissions-api';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface OverrideFormState {
  id?: string;
  permission_id: string;
  entity_id: string | null;
  effect: 'allow' | 'deny';
  scope_mode: 'entity_only' | 'subtree' | 'global';
  reason: string;
  requester_name: string;
  requester_email: string;
  approver_name: string;
  approver_email: string;
  approval_reference: string;
  expires_at: string;
  is_active: boolean;
}

const EMPTY_FORM: OverrideFormState = {
  permission_id: '',
  entity_id: null,
  effect: 'allow',
  scope_mode: 'entity_only',
  reason: '',
  requester_name: '',
  requester_email: '',
  approver_name: '',
  approver_email: '',
  approval_reference: '',
  expires_at: '',
  is_active: true,
};

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function UserPermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<OverrideFormState>(EMPTY_FORM);

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

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [userRes, overridesData, rolesRes, perms, entitiesRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', id).single(),
        getUserOverrides(id),
        supabase
          .from('user_entity_roles')
          .select(`
            *,
            role:roles(code, name_ar),
            entity:entities(name_ar)
          `)
          .eq('user_id', id)
          .is('ended_at', null),
        getAllPermissions(),
        supabase.from('entities').select('id, name_ar').eq('is_active', true).order('name_ar'),
      ]);

      setUser(userRes.data);
      setOverrides(overridesData);
      setRoles(rolesRes.data || []);
      setAllPermissions(perms);
      setEntities(entitiesRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // ═══════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const handleOpenEdit = (override: any) => {
    setForm({
      id: override.id,
      permission_id: override.permission_id,
      entity_id: override.entity_id,
      effect: override.effect,
      scope_mode: override.scope_mode || 'entity_only',
      reason: override.reason || '',
      requester_name: override.requester_name || '',
      requester_email: override.requester_email || '',
      approver_name: override.approver_name || '',
      approver_email: override.approver_email || '',
      approval_reference: override.approval_reference || '',
      expires_at: override.expires_at ? override.expires_at.split('T')[0] : '',
      is_active: override.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!id) return;
    if (!form.permission_id) {
      showConfirm({
        title: 'تنبيه',
        message: 'يرجى اختيار الصلاحية',
        confirmText: 'حسناً',
        variant: 'info',
        onConfirm: () => {},
      });
      return;
    }
    if (!form.reason || !form.requester_name || !form.approver_name || !form.approval_reference) {
      showConfirm({
        title: 'تنبيه',
        message: 'السبب، الجهة الطالبة، الجهة الموافقة، ومرجع الموافقة إلزامية',
        confirmText: 'حسناً',
        variant: 'info',
        onConfirm: () => {},
      });
      return;
    }
    if (form.scope_mode !== 'global' && !form.entity_id) {
      showConfirm({
        title: 'تنبيه',
        message: 'يرجى اختيار الكيان المستهدف',
        confirmText: 'حسناً',
        variant: 'info',
        onConfirm: () => {},
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        user_id: id,
        permission_id: form.permission_id,
        entity_id: form.scope_mode === 'global' ? null : form.entity_id,
        effect: form.effect,
        scope_mode: form.scope_mode,
        reason: form.reason,
        requester_name: form.requester_name,
        requester_email: form.requester_email || null,
        approver_name: form.approver_name,
        approver_email: form.approver_email || null,
        approval_reference: form.approval_reference,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active: form.is_active,
        granted_by: (await supabase.auth.getUser()).data.user?.id,
        executed_by: (await supabase.auth.getUser()).data.user?.id,
      };

      if (form.id) {
        const { error } = await supabase
          .from('permission_overrides')
          .update(payload)
          .eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('permission_overrides')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      await loadData();
      
      showConfirm({
        title: 'نجاح',
        message: 'تم حفظ الصلاحية الفردية بنجاح',
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

  const handleDelete = async (overrideId: string) => {
    showConfirm({
      title: 'حذف الصلاحية الفردية',
      message: 'هل أنت متأكد من حذف هذه الصلاحية الفردية؟',
      confirmText: 'نعم، احذف',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('permission_overrides')
            .delete()
            .eq('id', overrideId);
          if (error) throw error;
          await loadData();
        } catch (err: any) {
          showConfirm({
            title: 'خطأ',
            message: err.message || 'فشل الحذف',
            confirmText: 'حسناً',
            variant: 'danger',
            onConfirm: () => {},
          });
        }
      },
    });
  };

  // ═══════════════════════════════════════════════════════════
  // Render Helpers
  // ═══════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card padding="lg">
        <div className="text-center py-8">
          <p className="text-text-muted">المستخدم غير موجود</p>
          <Button variant="ghost" onClick={() => navigate('/settings/users')} className="mt-4">
            العودة
          </Button>
        </div>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings/users')}
            className="p-2 rounded-lg hover:bg-bg-secondary"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-primary" />
              {user.full_name}
            </h1>
            <p className="text-sm text-text-secondary">{user.email}</p>
          </div>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          إضافة صلاحية فردية
        </Button>
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

      {/* Roles */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          الأدوار الحالية ({roles.length})
        </h2>
        {roles.length === 0 ? (
          <p className="text-text-muted text-sm">لا توجد أدوار نشطة</p>
        ) : (
          <div className="space-y-2">
            {roles.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{r.role?.name_ar}</div>
                  <div className="text-xs text-text-muted">
                    {r.entity?.name_ar} · {r.scope_mode}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                  {r.assignment_type === 'original' ? 'أصلي' : 'إضافي'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Overrides */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          الصلاحيات الفردية ({overrides.length})
        </h2>
        {overrides.length === 0 ? (
          <p className="text-text-muted text-sm">
            لا توجد صلاحيات فردية. الأدوار وحدها تحدد الصلاحيات الحالية.
          </p>
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => (
              <div
                key={o.id}
                className={`p-3 rounded-lg border ${
                  o.effect === 'allow'
                    ? 'border-success/30 bg-success/5'
                    : 'border-danger/30 bg-danger/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {o.effect === 'allow' ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-danger" />
                      )}
                      {o.permission?.name_ar}
                      {o.permission?.qualifier && (
                        <span className="text-xs text-text-muted">
                          ({o.permission.qualifier})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      {o.entity?.name_ar || 'كل النظام'} · {o.scope_mode}
                    </div>
                    {o.reason && (
                      <div className="text-xs text-text-muted mt-1">
                        السبب: {o.reason}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        o.is_active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-bg-secondary text-text-muted'
                      }`}
                    >
                      {o.is_active ? 'نشط' : 'موقوف'}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(o)}
                      className="p-1.5 hover:bg-bg-secondary rounded text-text-secondary hover:text-primary"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(o.id)}
                      className="p-1.5 hover:bg-bg-secondary rounded text-text-secondary hover:text-danger"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Override Modal */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-2xl bg-surface rounded-xl shadow-2xl border border-border max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg-secondary">
              <h3 className="text-lg font-bold text-text">
                {form.id ? 'تعديل صلاحية فردية' : 'إضافة صلاحية فردية'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-border rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Type & Permission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">نوع القاعدة</label>
                  <select
                    value={form.effect}
                    onChange={(e) => setForm({ ...form, effect: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                  >
                    <option value="allow">سماح استثنائي (Allow)</option>
                    <option value="deny">منع صريح (Deny)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">الصلاحية</label>
                  <select
                    value={form.permission_id}
                    onChange={(e) => setForm({ ...form, permission_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                  >
                    <option value="">— اختر —</option>
                    {allPermissions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name_ar} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scope */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">نطاق التطبيق</label>
                  <select
                    value={form.scope_mode}
                    onChange={(e) => setForm({ ...form, scope_mode: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                  >
                    <option value="entity_only">الكيان المحدد فقط</option>
                    <option value="subtree">الكيان وأبناؤه</option>
                    <option value="global">كل النظام (Global)</option>
                  </select>
                </div>
                {form.scope_mode !== 'global' && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">الكيان المستهدف</label>
                    <select
                      value={form.entity_id || ''}
                      onChange={(e) => setForm({ ...form, entity_id: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                    >
                      <option value="">— اختر —</option>
                      {entities.map((e) => (
                        <option key={e.id} value={e.id}>{e.name_ar}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">تاريخ الانتهاء (اختياري)</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">سبب التكليف / المنع *</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm h-20"
                  placeholder="اذكر المهمة الإدارية والسبب المحدد..."
                />
              </div>

              {/* External Approval Info */}
              <div className="border-t border-border pt-4 mt-4">
                <h4 className="font-semibold text-sm mb-3 text-warning flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  توثيق الموافقة الخارجية (إلزامي)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">الجهة الطالبة</label>
                    <input
                      type="text"
                      value={form.requester_name}
                      onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      placeholder="مدير الكيان"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">بريد الجهة الطالبة</label>
                    <input
                      type="email"
                      value={form.requester_email}
                      onChange={(e) => setForm({ ...form, requester_email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      placeholder="name@example.org"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">الجهة الموافقة (EDC)</label>
                    <input
                      type="text"
                      value={form.approver_name}
                      onChange={(e) => setForm({ ...form, approver_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      placeholder="مدير EDC"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">مرجع الموافقة (البريد)</label>
                    <input
                      type="text"
                      value={form.approval_reference}
                      onChange={(e) => setForm({ ...form, approval_reference: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                      placeholder="موضوع البريد أو تاريخه"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-bg-secondary flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                icon={<Save className="w-4 h-4" />}
                onClick={handleSave}
                loading={saving}
              >
                حفظ
              </Button>
            </div>
          </div>
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