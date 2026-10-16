import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Power,
  PowerOff,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/auth-store';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

interface RuleRow {
  id: string;
  code: string;
  name_ar: string;
  description: string | null;
  trigger_event: string;
  recipient_type: string | null;
  channels: string[] | null;
  priority: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  category: string | null;
  notification_type_id: string | null;
  notification_types: { name_ar: string; category: string | null } | null;
}

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'داخلي',
  internal: 'داخلي',
  email: 'بريد',
  sms: 'رسالة SMS',
  push: 'إشعار فوري',
};

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  low: { label: 'منخفضة', cls: 'bg-bg-secondary text-text-muted' },
  normal: { label: 'عادية', cls: 'bg-info/10 text-info' },
  high: { label: 'عالية', cls: 'bg-warning/10 text-warning' },
  urgent: { label: 'عاجلة', cls: 'bg-danger/10 text-danger' },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export function NotificationRulesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // فلاتر
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');

  // عمليات
  const [deleteTarget, setDeleteTarget] = useState<RuleRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // ── جلب القواعد ──
  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('notification_rules')
        .select(`
          id,
          code,
          name_ar,
          description,
          trigger_event,
          recipient_type,
          channels,
          priority,
          is_active,
          created_at,
          updated_at,
          category,
          notification_type_id,
          notification_types (name_ar, category)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRules((data ?? []) as unknown as RuleRow[]);
    } catch (e: any) {
      setError(e?.message ?? 'فشل تحميل القواعد');
    } finally {
      setLoading(false);
    }
  }

  // ── تصفية ──
  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          r.name_ar.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (eventFilter && r.trigger_event !== eventFilter) return false;
      if (statusFilter === 'active' && !r.is_active) return false;
      if (statusFilter === 'inactive' && r.is_active) return false;
      return true;
    });
  }, [rules, search, eventFilter, statusFilter]);

  // ── الأحداث المتاحة ──
  const events = useMemo(() => {
    const set = new Set(rules.map((r) => r.trigger_event));
    return Array.from(set).sort();
  }, [rules]);

  // ── تفعيل/تعطيل ──
  async function toggleActive(rule: RuleRow) {
    setActionInProgress(rule.id);
    try {
      const { error: updateError } = await supabase
        .from('notification_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);

      if (updateError) throw updateError;

      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, is_active: !r.is_active } : r
        )
      );
    } catch (e: any) {
      alert(e?.message ?? 'فشل التحديث');
    } finally {
      setActionInProgress(null);
    }
  }

  // ── نسخ القاعدة ──
  async function duplicateRule(rule: RuleRow) {
    setActionInProgress(rule.id);
    try {
      const { data: full, error: readErr } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('id', rule.id)
        .single();

      if (readErr || !full) throw readErr ?? new Error('لم تُوجد القاعدة');

      const newCode = `${full.code}_copy_${Date.now().toString(36)}`;
      const newName = `${full.name_ar} (نسخة)`;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = full as any;

      const { error: insertErr } = await supabase
        .from('notification_rules')
        .insert({
          ...rest,
          code: newCode,
          name_ar: newName,
          is_active: false,
          created_by: user?.id,
        });

      if (insertErr) throw insertErr;

      await loadRules();
    } catch (e: any) {
      alert(e?.message ?? 'فشل النسخ');
    } finally {
      setActionInProgress(null);
    }
  }

  // ── حذف ──
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error: deleteErr } = await supabase
        .from('notification_rules')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteErr) throw deleteErr;

      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      alert(e?.message ?? 'فشل الحذف');
    } finally {
      setDeleting(false);
    }
  }

  // ════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* رأس */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                قواعد التنبيهات الآلية
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                تُشغَّل تلقائيًا عند وقوع أحداث النظام
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadRules}
              disabled={loading}
              className="
                p-2.5 rounded-lg border border-border
                text-text-muted hover:bg-bg-secondary
                transition-colors disabled:opacity-50
              "
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              to="new"
              className="
                inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                bg-primary text-white font-medium shadow-soft
                hover:bg-primary-dark transition-colors
              "
            >
              <Plus className="w-4 h-4" />
              إضافة قاعدة
            </Link>
          </div>
        </div>
      </Card>

      {/* الفلاتر */}
      <Card>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الرمز..."
              className="
                w-full pr-10 pl-4 py-2.5 rounded-lg border border-border
                bg-surface text-text placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              "
            />
          </div>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="
              w-full px-4 py-2.5 rounded-lg border border-border
              bg-surface text-text
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            "
          >
            <option value="">كل الأحداث</option>
            {events.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="
              w-full px-4 py-2.5 rounded-lg border border-border
              bg-surface text-text
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            "
          >
            <option value="">كل الحالات</option>
            <option value="active">مفعّلة</option>
            <option value="inactive">معطّلة</option>
          </select>
        </div>
      </Card>

      {/* الحالات */}
      {loading && (
        <Card>
          <div className="flex items-center justify-center py-12 gap-2 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري التحميل...
          </div>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <div className="flex items-start gap-3 text-danger">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">خطأ في التحميل</div>
              <div className="text-sm mt-1">{error}</div>
              <Button
                variant="secondary"
                onClick={loadRules}
                className="mt-3"
                icon={<RefreshCw className="w-4 h-4" />}
              >
                إعادة المحاولة
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text mb-2">
              {rules.length === 0 ? 'لا توجد قواعد بعد' : 'لا نتائج مطابقة'}
            </h3>
            <p className="text-sm text-text-muted">
              {rules.length === 0
                ? 'ابدأ بإضافة قاعدة جديدة لتنبيه المستخدمين تلقائيًا.'
                : 'جرّب تغيير معايير البحث أو الفلترة.'}
            </p>
          </div>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                    القاعدة
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                    الحدث
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                    القنوات
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                    الأولوية
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((rule) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-bg-secondary/50 transition-colors"
                  >
                    {/* القاعدة */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-sm text-text truncate">
                        {rule.name_ar}
                      </div>
                      <div className="text-xs text-text-muted font-mono mt-0.5 truncate">
                        {rule.code}
                      </div>
                      {rule.description && (
                        <div className="text-xs text-text-muted mt-1 line-clamp-1">
                          {rule.description}
                        </div>
                      )}
                    </td>

                    {/* الحدث */}
                    <td className="px-4 py-3">
                      <span className="inline-block text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-mono whitespace-nowrap">
                        {rule.trigger_event}
                      </span>
                    </td>

                    {/* القنوات */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(rule.channels ?? []).map((c) => (
                          <span
                            key={c}
                            className="
                              text-[10px] px-2 py-0.5 rounded-full
                              bg-info/10 text-info font-medium whitespace-nowrap
                            "
                          >
                            {CHANNEL_LABELS[c] ?? c}
                          </span>
                        ))}
                        {(!rule.channels || rule.channels.length === 0) && (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </div>
                    </td>

                    {/* الأولوية */}
                    <td className="px-4 py-3">
                      <PriorityBadge priority={rule.priority} />
                    </td>

                    {/* الحالة */}
                    <td className="px-4 py-3">
                      {rule.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" />
                          مفعّلة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-text-muted whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                          معطّلة
                        </span>
                      )}
                    </td>

                    {/* الإجراءات */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`${rule.id}/edit`)}
                          className="
                            p-2 rounded-lg text-text-muted
                            hover:bg-primary/10 hover:text-primary
                            transition-colors
                          "
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleActive(rule)}
                          disabled={actionInProgress === rule.id}
                          className={`
                            p-2 rounded-lg transition-colors disabled:opacity-50
                            ${
                              rule.is_active
                                ? 'text-warning hover:bg-warning/10'
                                : 'text-success hover:bg-success/10'
                            }
                          `}
                          title={rule.is_active ? 'تعطيل' : 'تفعيل'}
                        >
                          {actionInProgress === rule.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : rule.is_active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => duplicateRule(rule)}
                          disabled={actionInProgress === rule.id}
                          className="
                            p-2 rounded-lg text-text-muted
                            hover:bg-info/10 hover:text-info
                            transition-colors disabled:opacity-50
                          "
                          title="نسخ"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rule)}
                          className="
                            p-2 rounded-lg text-text-muted
                            hover:bg-danger/10 hover:text-danger
                            transition-colors
                          "
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* عدّاد النتائج */}
          <div className="px-4 py-3 border-t border-border text-xs text-text-muted text-center">
            عرض {filtered.length} من {rules.length} قاعدة
          </div>
        </Card>
      )}

      {/* مودال الحذف */}
      <ConfirmModal
        open={!!deleteTarget}
        title="حذف القاعدة"
        message={
          <div className="space-y-3">
            <p>هل أنت متأكد من حذف القاعدة التالية؟</p>
            <p className="font-bold text-text bg-bg-secondary px-3 py-2 rounded-lg">
              {deleteTarget?.name_ar}
            </p>
            <p className="text-xs text-text-muted font-mono">
              {deleteTarget?.code}
            </p>
            <p className="text-sm text-danger">
              ⚠️ لا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
        }
        confirmText="حذف نهائي"
        cancelText="إلغاء"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Priority Badge
// ════════════════════════════════════════════════════════════

function PriorityBadge({ priority }: { priority: string | null }) {
  const info = priority ? PRIORITY_LABELS[priority] : null;
  if (!info) {
    return <span className="text-xs text-text-muted">—</span>;
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${info.cls}`}>
      {info.label}
    </span>
  );
}