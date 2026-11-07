import { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
  Loader2,
  Lock,
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  bulkReassignFromExcel,
  rollbackBulkImport,
  type BulkImportResult,
} from '../../lib/permissions-api';
import {
  downloadExcelTemplate,
  parseExcelFile,
  type ParsedExcelRow,
} from '../../lib/excel-template';

// ═══════════════════════════════════════════════════════════
// Type: تفاصيل الصفوف المطابقة (جديد)
// ═══════════════════════════════════════════════════════════

interface MatchedDetail {
  row: number;
  user_id: string;
  match_method: string;
  entity_ids: string[];
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function BulkImportPage() {
  // ⭐ فحص الصلاحيات (مزدوج: execute + rollback)
  const { allowed: canImport, loading: checkingImport } =
    usePermission('bulk_import.execute');
  const { allowed: canRollback, loading: checkingRollback } =
    usePermission('bulk_import.rollback');

  const checkingPermissions = checkingImport || checkingRollback;

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedExcelRow[]>([]);
  const [previewResult, setPreviewResult] = useState<BulkImportResult | null>(
    null
  );
  const [executeResult, setExecuteResult] = useState<BulkImportResult | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  // Handlers
  // ═══════════════════════════════════════════════════════════

  const handleDownloadTemplate = async () => {
    if (!canImport) return;
    setLoadingTemplate(true);
    try {
      await downloadExcelTemplate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل القالب');
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!canImport) return;
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setError(null);
    setPreviewResult(null);
    setExecuteResult(null);

    try {
      const parsed = await parseExcelFile(f);
      if (parsed.length === 0) {
        setError('الملف لا يحتوي على صفوف صالحة');
        setRows([]);
      } else {
        setRows(parsed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل قراءة الملف');
      setRows([]);
    }
  };

  const handlePreview = async () => {
    if (!rows.length || !canImport) return;
    setLoading(true);
    setError(null);
    setPreviewResult(null);

    try {
      const result = await bulkReassignFromExcel(
        rows,
        {
          job_type: 'reassign',
          file_name: file?.name || 'unknown.xlsx',
        },
        true
      );

      setPreviewResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل المعاينة');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = () => {
    if (!rows.length || !canImport) return;
    showConfirm({
      title: 'تنفيذ الاستيراد',
      message:
        'هل أنت متأكد من تنفيذ الاستيراد؟ سيتم إنشاء/إنهاء إسنادات في قاعدة البيانات وتحديث بيانات المستخدمين.',
      confirmText: 'نعم، نفّذ',
      variant: 'warning',
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await bulkReassignFromExcel(
            rows,
            {
              job_type: 'reassign',
              file_name: file?.name || 'unknown.xlsx',
            },
            false
          );
          setExecuteResult(result);
          setPreviewResult(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'فشل التنفيذ');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleRollback = () => {
    // ✅ فحص صلاحية rollback (وليس execute)
    if (!executeResult?.job_id || !canRollback) return;
    showConfirm({
      title: 'تراجع عن الاستيراد',
      message:
        'هل تريد التراجع عن هذا الاستيراد؟ سيتم حذف الإسنادات المُنشأة.',
      confirmText: 'نعم، تراجع',
      variant: 'danger',
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await rollbackBulkImport(executeResult.job_id!);

          showConfirm({
            title: 'نجاح',
            message: `تم التراجع عن ${result.rolled_back} إسناد`,
            confirmText: 'حسناً',
            variant: 'success',
            onConfirm: () => {
              setExecuteResult(null);
              setRows([]);
              setFile(null);
            },
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'فشل التراجع');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // ═══════════════════════════════════════════════════════════
  // Render Guards
  // ═══════════════════════════════════════════════════════════

  if (checkingPermissions) {
    return <Loading message="جاري التحقق من الصلاحيات..." />;
  }

  if (!canImport) {
    return (
      <div className="p-6 text-center text-danger">
        <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">لا تملك صلاحية الوصول</h2>
        <p>ليس لديك صلاحية لتنفيذ الاستيراد الجماعي.</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary" />
            استيراد جماعي من Excel
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            ارفع ملف Excel لإعادة تعيين إسنادات المختصين والمدراء
          </p>
        </div>
        <Button
          variant="secondary"
          icon={
            loadingTemplate ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )
          }
          onClick={handleDownloadTemplate}
          disabled={loadingTemplate}
        >
          {loadingTemplate ? 'جاري التحميل...' : 'تحميل القالب'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-danger hover:underline text-xs"
            >
              إغلاق
            </button>
          </div>
        </Card>
      )}

      {/* Upload Card */}
      <Card padding="lg">
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <FileSpreadsheet className="w-12 h-12 text-primary mx-auto mb-3" />
          <p className="text-text font-medium mb-1">اختر ملف Excel</p>
          <p className="text-text-muted text-sm mb-4">يدعم ملفات .xlsx فقط</p>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="hidden"
            id="excel-upload"
          />
          <label htmlFor="excel-upload">
            <span className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-white rounded-lg font-medium cursor-pointer hover:bg-primary-dark transition-colors">
              <Upload className="w-4 h-4 ml-2" />
              اختر ملف
            </span>
          </label>
          {file && (
            <div className="mt-4 text-sm">
              <p className="text-success font-medium">✅ {file.name}</p>
              <p className="text-text-muted">{rows.length} صف صالح</p>
            </div>
          )}
        </div>
      </Card>

      {/* File Preview Table */}
      {rows.length > 0 && (
        <Card padding="lg">
          <h3 className="text-lg font-semibold mb-4">📋 معاينة الملف</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-secondary">
                <tr>
                  <th className="px-3 py-2 text-right">#</th>
                  <th className="px-3 py-2 text-right">الاسم</th>
                  <th className="px-3 py-2 text-right">البريد</th>
                  <th className="px-3 py-2 text-right">المسمى</th>
                  <th className="px-3 py-2 text-right">R.L</th>
                  <th className="px-3 py-2 text-right">TLS</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 15).map((r) => (
                  <tr key={r.row_number} className="border-b border-border">
                    <td className="px-3 py-2 text-text-muted">
                      {r.row_number}
                    </td>
                    <td className="px-3 py-2">{r.full_name}</td>
                    <td className="px-3 py-2 text-xs" dir="ltr">
                      {r.email}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.job_title}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.region_rl || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.region_tls || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 15 && (
              <p className="text-text-muted text-xs mt-2 text-center">
                عرض 15 من {rows.length} صف
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <Button
              variant="primary"
              onClick={handlePreview}
              disabled={loading}
              loading={loading}
            >
              معاينة (Dry Run)
            </Button>
            <Button
              variant="warning"
              onClick={handleExecute}
              disabled={loading || !previewResult}
            >
              تنفيذ الاستيراد
            </Button>
          </div>
        </Card>
      )}

      {/* Preview Result */}
      {previewResult && (
        <Card padding="lg" className="border-primary/30">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">نتائج المعاينة (Dry Run)</h3>
          </div>
          <ResultSummary result={previewResult} />
          <MatchedDetailsPreview
            details={(previewResult as any).matched_details || []}
            rows={rows}
          />
        </Card>
      )}

      {/* Execute Result */}
      {executeResult && (
        <Card padding="lg" className="border-success/30">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <h3 className="text-lg font-semibold">نتائج التنفيذ</h3>
            </div>
            {/* ✅ زر التراجع يظهر فقط لمن يملك bulk_import.rollback */}
            {canRollback && (
              <Button
                variant="danger"
                size="sm"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={handleRollback}
                disabled={loading}
              >
                تراجع
              </Button>
            )}
          </div>
          <ResultSummary result={executeResult} />
        </Card>
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

// ═══════════════════════════════════════════════════════════
// ResultSummary
// ═══════════════════════════════════════════════════════════

function ResultSummary({ result }: { result: BulkImportResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="مطابق" value={result.matched} color="success" />
        <StatCard label="غير موجود" value={result.unmatched} color="danger" />
        <StatCard label="ملتبس" value={result.ambiguous} color="warning" />
        <StatCard label="أخطاء" value={result.errors.length} color="danger" />
      </div>

      {!result.dry_run && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="إسنادات جديدة"
            value={result.created}
            color="success"
          />
          <StatCard
            label="إسنادات منتهية"
            value={result.ended}
            color="info"
          />
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 text-warning" />
            تفاصيل ({result.errors.length}):
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {result.errors.map((err, i) => (
              <div
                key={i}
                className="text-xs p-2 rounded border border-warning/30 bg-warning/5"
              >
                <strong>صف {err.row}</strong> —{' '}
                <span className="text-warning font-medium">{err.type}</span>:{' '}
                {err.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MatchedDetailsPreview (جديد — عرض تفاصيل المطابقة)
// ═══════════════════════════════════════════════════════════

function MatchedDetailsPreview({
  details,
  rows,
}: {
  details: MatchedDetail[];
  rows: ParsedExcelRow[];
}) {
  if (!details || details.length === 0) return null;

  return (
    <div className="space-y-2 mt-4 pt-4 border-t border-border">
      <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
        <CheckCircle2 className="w-4 h-4" />
        تفاصيل الصفوف المطابقة ({details.length})
      </h4>
      <div className="max-h-96 overflow-y-auto space-y-1">
        {details.map((d) => {
          const row = rows.find((r) => r.row_number === d.row);
          return (
            <div
              key={d.row}
              className="text-xs p-2 rounded border border-primary/20 bg-primary/5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text">
                    صف {d.row}: {row?.full_name || '—'}
                  </div>
                  <div className="text-text-muted truncate">
                    {row?.email || '—'} · {row?.job_title || '—'}
                  </div>
                </div>
                <div className="flex-shrink-0 text-[10px] flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-info/10 text-info font-mono">
                    {d.match_method}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-success/10 text-success font-bold">
                    {d.entity_ids.length} كيان
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// StatCard
// ═══════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'success' | 'danger' | 'warning' | 'info';
}) {
  const colors = {
    success: 'bg-success/10 text-success border-success/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    info: 'bg-primary/10 text-primary border-primary/30',
  };
  return (
    <div className={`p-3 rounded-lg border ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-80 mt-1">{label}</div>
    </div>
  );
}

export default BulkImportPage;