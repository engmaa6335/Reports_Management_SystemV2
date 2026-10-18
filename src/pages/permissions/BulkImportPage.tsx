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
} from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  ConfirmationModal,
  type ConfirmationItem,
} from '../../components/permissions/ConfirmationModal';
import {
  bulkReassignFromExcel,
  rollbackBulkImport,
  resolveEntityName,
  type BulkImportResult,
  type EntitySuggestion,
} from '../../lib/permissions-api';
import {
  downloadExcelTemplate,
  parseExcelFile,
  type ParsedExcelRow,
} from '../../lib/excel-template';
import { supabase } from '../../lib/supabase';

export function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedExcelRow[]>([]);
  const [previewResult, setPreviewResult] = useState<BulkImportResult | null>(null);
  const [executeResult, setExecuteResult] = useState<BulkImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationItems, setConfirmationItems] = useState<ConfirmationItem[]>([]);

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

  const handleDownloadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      await downloadExcelTemplate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل القالب');
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setError(null);
    setPreviewResult(null);
    setExecuteResult(null);
    setShowConfirmation(false);
    setConfirmationItems([]);

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

  const extractConfirmationItems = async (
    result: BulkImportResult
  ): Promise<ConfirmationItem[]> => {
    const items: ConfirmationItem[] = [];

    for (const err of result.errors) {
      if (err.type !== 'requires_confirmation') continue;

      const rowNumber = parseInt(String(err.row), 10);
      const row = rows.find((r) => r.row_number === rowNumber);
      if (!row) continue;

      const field: 'region_rl' | 'region_tls' = err.message.includes('R.L')
        ? 'region_rl'
        : 'region_tls';

      const rawValue = row[field];
      if (!rawValue) continue;

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'resolve_entity_name',
          { p_name: err.region }
        );

        if (rpcError || !rpcData || rpcData.length === 0) continue;

        const entityIds = rpcData.map((r: any) => r.entity_id);
        const { data: entitiesData, error: entitiesError } = await supabase
          .from('entities')
          .select('id, name_ar, name_en')
          .in('id', entityIds);

        if (entitiesError) continue;

        const entityMap = new Map(
          (entitiesData || []).map((e: any) => [e.id, e])
        );

        const suggestions: EntitySuggestion[] = rpcData.map((r: any) => {
          const e = entityMap.get(r.entity_id);
          return {
            entity_id: r.entity_id,
            name_ar: e?.name_ar || '',
            name_en: e?.name_en || null,
            match_type: r.match_type,
            requires_confirmation: r.requires_confirmation,
          };
        });

        items.push({
          rowNumber,
          rawValue: err.region,
          field,
          suggestions,
          selected: suggestions.map((s: EntitySuggestion) => s.entity_id),
        });
      } catch (e) {
        console.error(`❌ Exception for row ${rowNumber}:`, e);
      }
    }

    return items;
  };

  const handlePreview = async () => {
    if (!rows.length) return;
    setLoading(true);
    setError(null);
    setPreviewResult(null);
    setShowConfirmation(false);
    setConfirmationItems([]);

    try {
      const result = await bulkReassignFromExcel(
        rows,
        {
          job_type: 'reassign',
          file_name: file?.name || 'unknown.xlsx',
        },
        true
      );

      const confirmationErrors = result.errors.filter(
        (e) => e.type === 'requires_confirmation'
      );

      if (confirmationErrors.length > 0) {
        const items = await extractConfirmationItems(result);
        if (items.length > 0) {
          setConfirmationItems(items);
          setShowConfirmation(true);
          return;
        }
      }

      setPreviewResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل المعاينة');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationConfirm = async (confirmedItems: ConfirmationItem[]) => {
    setShowConfirmation(false);
    setLoading(true);

    try {
      const updatedRows = rows.map((row) => {
        const item = confirmedItems.find((i) => i.rowNumber === row.row_number);
        if (!item) return row;

        const selectedNames = item.selected
          .map((entityId) => {
            const suggestion = item.suggestions.find(
              (s) => s.entity_id === entityId
            );
            return suggestion?.name_ar || '';
          })
          .filter(Boolean);

        const field = item.field;
        const originalValue = row[field] as string;
        if (!originalValue) return row;

        const parts = originalValue.split('+').map((p) => p.trim());
        const newParts = parts.map((part) => {
          if (part.includes(item.rawValue)) {
            return selectedNames.join(' + ');
          }
          return part;
        });

        const newValue = newParts.join(' + ');

        return {
          ...row,
          [field]: newValue,
        };
      });

      setRows(updatedRows);

      const result = await bulkReassignFromExcel(
        updatedRows,
        {
          job_type: 'reassign',
          file_name: file?.name || 'unknown.xlsx',
        },
        true
      );

      setPreviewResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل المعاينة بعد التأكيد');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = () => {
    if (!rows.length) return;
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
    if (!executeResult?.job_id) return;
    showConfirm({
      title: 'تراجع عن الاستيراد',
      message: 'هل تريد التراجع عن هذا الاستيراد؟ سيتم حذف الإسنادات المُنشأة.',
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
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
                    <td className="px-3 py-2 text-text-muted">{r.row_number}</td>
                    <td className="px-3 py-2">{r.full_name}</td>
                    <td className="px-3 py-2 text-xs" dir="ltr">
                      {r.email}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.job_title}</td>
                    <td className="px-3 py-2 text-xs">{r.region_rl || '—'}</td>
                    <td className="px-3 py-2 text-xs">{r.region_tls || '—'}</td>
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

      {previewResult && (
        <Card padding="lg" className="border-primary/30">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">نتائج المعاينة (Dry Run)</h3>
          </div>
          <ResultSummary result={previewResult} />
        </Card>
      )}

      {executeResult && (
        <Card padding="lg" className="border-success/30">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <h3 className="text-lg font-semibold">نتائج التنفيذ</h3>
            </div>
            <Button
              variant="danger"
              size="sm"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={handleRollback}
              disabled={loading}
            >
              تراجع
            </Button>
          </div>
          <ResultSummary result={executeResult} />
        </Card>
      )}

      <ConfirmationModal
        open={showConfirmation}
        items={confirmationItems}
        onConfirm={handleConfirmationConfirm}
        onCancel={() => {
          setShowConfirmation(false);
          setConfirmationItems([]);
        }}
      />

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
          <StatCard label="إسنادات جديدة" value={result.created} color="success" />
          <StatCard label="إسنادات منتهية" value={result.ended} color="info" />
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