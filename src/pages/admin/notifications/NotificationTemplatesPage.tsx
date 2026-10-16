import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
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
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { supabase } from '../../../lib/supabase';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

interface TemplateRow {
  id: string;
  code: string;
  name_ar: string | null;
  subject_ar: string | null;
  body_text: string | null;
  body_html: string | null;
  variables: any;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════

function getVariablesList(variables: any): string[] {
  if (!variables) return [];
  if (Array.isArray(variables)) {
    return variables.filter((v) => typeof v === 'string');
  }
  if (typeof variables === 'object' && Array.isArray(variables.list)) {
    return variables.list.filter((v: any) => typeof v === 'string');
  }
  return [];
}

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export function NotificationTemplatesPage() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');

  const [deleteTarget, setDeleteTarget] = useState<TemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<TemplateRow | null>(null);

  // ── جلب القوالب ──
  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('email_templates')
        .select(
          'id, code, name_ar, subject_ar, body_text, body_html, variables, is_active, created_at, updated_at'
        )
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTemplates((data ?? []) as TemplateRow[]);
    } catch (e: any) {
      setError(e?.message ?? 'فشل تحميل القوالب');
    } finally {
      setLoading(false);
    }
  }

  // ── تصفية ──
  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          (t.name_ar ?? '').toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          (t.subject_ar ?? '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (statusFilter === 'active' && !t.is_active) return false;
      if (statusFilter === 'inactive' && t.is_active) return false;
      return true;
    });
  }, [templates, search, statusFilter]);

  // ── تفعيل/تعطيل ──
  async function toggleActive(t: TemplateRow) {
    setActionInProgress(t.id);
    try {
      const { error: updateError } = await supabase
        .from('email_templates')
        .update({
          is_active: !t.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', t.id);

      if (updateError) throw updateError;

      setTemplates((prev) =>
        prev.map((x) =>
          x.id === t.id ? { ...x, is_active: !x.is_active } : x
        )
      );
    } catch (e: any) {
      alert(e?.message ?? 'فشل التحديث');
    } finally {
      setActionInProgress(null);
    }
  }

  // ── نسخ ──
  async function duplicateTemplate(t: TemplateRow) {
    setActionInProgress(t.id);
    try {
      const { data: full, error: readErr } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', t.id)
        .single();

      if (readErr || !full) throw readErr ?? new Error('لم يُوجد القالب');

      const newCode = `${full.code}_copy_${Date.now().toString(36)}`;
      const newName = `${full.name_ar ?? full.code} (نسخة)`;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = full as any;

      const { error: insertErr } = await supabase
        .from('email_templates')
        .insert({
          ...rest,
          code: newCode,
          name_ar: newName,
          is_active: false,
        });

      if (insertErr) throw insertErr;

      await loadTemplates();
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
        .from('email_templates')
        .delete()
        .eq('id', deleteTarget.id);

      if (deleteErr) throw deleteErr;

      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
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
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">قوالب التنبيهات</h2>
              <p className="text-sm text-text-muted mt-0.5">
                قوالب داخلية وبريد إلكتروني مع متغيرات ديناميكية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadTemplates}
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
              إضافة قالب
            </Link>
          </div>
        </div>
      </Card>

      {/* الفلاتر */}
      <Card>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الرمز أو الموضوع..."
              className="
                w-full pr-10 pl-4 py-2.5 rounded-lg border border-border
                bg-surface text-text placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
              "
            />
          </div>

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
                onClick={loadTemplates}
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
            <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-bold text-text mb-2">
              {templates.length === 0 ? 'لا توجد قوالب بعد' : 'لا نتائج مطابقة'}
            </h3>
            <p className="text-sm text-text-muted">
              {templates.length === 0
                ? 'ابدأ بإضافة قالب جديد لاستخدامه في التنبيهات.'
                : 'جرّب تغيير معايير البحث.'}
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
                    القالب
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                    الموضوع
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-text-muted text-right">
                    المتغيرات
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
                {filtered.map((t) => {
                  const vars = getVariablesList(t.variables);
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-bg-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-sm text-text truncate">
                          {t.name_ar ?? '—'}
                        </div>
                        <div className="text-xs text-text-muted font-mono mt-0.5 truncate">
                          {t.code}
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-sm text-text truncate">
                          {t.subject_ar ?? '—'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {vars.length === 0 ? (
                          <span className="text-xs text-text-muted">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {vars.slice(0, 3).map((v) => (
                              <span
                                key={v}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info font-mono whitespace-nowrap"
                              >
                                {`{{${v}}}`}
                              </span>
                            ))}
                            {vars.length > 3 && (
                              <span className="text-[10px] text-text-muted">
                                +{vars.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {t.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            مفعّل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-text-muted whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                            معطّل
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewTarget(t)}
                            className="
                              p-2 rounded-lg text-text-muted
                              hover:bg-success/10 hover:text-success
                              transition-colors
                            "
                            title="معاينة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`${t.id}/edit`)}
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
                            onClick={() => toggleActive(t)}
                            disabled={actionInProgress === t.id}
                            className={`
                              p-2 rounded-lg transition-colors disabled:opacity-50
                              ${t.is_active
                                ? 'text-warning hover:bg-warning/10'
                                : 'text-success hover:bg-success/10'}
                            `}
                            title={t.is_active ? 'تعطيل' : 'تفعيل'}
                          >
                            {actionInProgress === t.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : t.is_active ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => duplicateTemplate(t)}
                            disabled={actionInProgress === t.id}
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
                            onClick={() => setDeleteTarget(t)}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-border text-xs text-text-muted text-center">
            عرض {filtered.length} من {templates.length} قالب
          </div>
        </Card>
      )}

      {/* مودال المعاينة */}
      {previewTarget && (
        <TemplatePreviewModal
          template={previewTarget}
          onClose={() => setPreviewTarget(null)}
        />
      )}

      {/* مودال الحذف */}
      <ConfirmModal
        open={!!deleteTarget}
        title="حذف القالب"
        message={
          <div className="space-y-3">
            <p>هل أنت متأكد من حذف القالب التالي؟</p>
            <p className="font-bold text-text bg-bg-secondary px-3 py-2 rounded-lg">
              {deleteTarget?.name_ar ?? deleteTarget?.code}
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
// TemplatePreviewModal
// ════════════════════════════════════════════════════════════

function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: TemplateRow;
  onClose: () => void;
}) {
  const sampleValues: Record<string, string> = {
    actor_name: 'محمد أمين',
    actor_email: 'm.amin@edu.ps',
    entity_name: 'الوحدة التربوية',
    event_date: new Date().toLocaleDateString('ar-EG'),
    deadline: '2026-10-20',
    report_title: 'التقرير الأسبوعي',
    report_url: 'https://example.org/reports/abc',
    details_url: 'https://example.org/details',
    template_name: template.name_ar ?? '',
  };

  const substitute = (text: string): string => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return sampleValues[key] ?? `[${key}]`;
    });
  };

  const bodyText = substitute(template.body_text ?? '');
  const subject = substitute(template.subject_ar ?? '');
  const html = substitute(template.body_html ?? '');

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border bg-bg-secondary">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-text">معاينة القالب</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-bg-secondary rounded-lg"
          >
            <EyeOff className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-text-muted">الاسم:</span>{' '}
              <span className="text-text font-medium">
                {template.name_ar ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-text-muted">الرمز:</span>{' '}
              <span className="text-text font-mono text-xs">
                {template.code}
              </span>
            </div>
          </div>

          {subject && (
            <div>
              <div className="text-xs font-bold text-text-muted mb-1.5">
                الموضوع:
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-text font-medium">
                {subject}
              </div>
            </div>
          )}

          {bodyText && (
            <div>
              <div className="text-xs font-bold text-text-muted mb-1.5">
                نص الرسالة:
              </div>
              <div className="bg-bg-secondary rounded-lg p-3 text-sm text-text whitespace-pre-wrap">
                {bodyText}
              </div>
            </div>
          )}

          {html && (
            <details>
              <summary className="text-xs font-bold text-text-muted mb-1.5 cursor-pointer">
                HTML الخام (اضغط للعرض)
              </summary>
              <pre className="bg-bg-secondary rounded-lg p-3 text-xs font-mono overflow-x-auto mt-2">
                {html}
              </pre>
            </details>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            💡 هذه معاينة بعيّنة من المتغيرات. عند الإرسال الفعلي، تُستبدل
            المتغيرات بقيمها الحقيقية.
          </div>
        </div>
      </div>
    </div>
  );
}