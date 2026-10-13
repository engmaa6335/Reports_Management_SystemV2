import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Save,
  FileText,
  Building2,
  User as UserIcon,
  AlertCircle,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useAggregatesStore } from '../../stores/aggregates-store';
import { Button, Card, Loading } from '../../components/ui';
import { VisitsTable } from '../../components/aggregates/VisitsTable';
import { ManualActivitiesTable } from '../../components/aggregates/ManualActivitiesTable';
import type {
  SpecialistReportData,
  VisitRow,
  ManualActivityRow,
} from '../../types/aggregates';

// ═══════════════════════════════════════════════════════════
// EditAggregatePage — تعديل تقرير تجميعي محفوظ
// ═══════════════════════════════════════════════════════════

export function EditAggregatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    currentAggregate,
    loadingDetail,
    saving,
    error,
    loadAggregateById,
    updateAggregate,
    clearError,
    clearCurrentAggregate,
  } = useAggregatesStore();

  // State محلي
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [manualActivities, setManualActivities] = useState<
    ManualActivityRow[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  // ═══════════════════════════════════════════
  // Load
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (id) {
      loadAggregateById(id);
    }
    return () => {
      clearError();
      clearCurrentAggregate();
    };
  }, [id, loadAggregateById, clearError, clearCurrentAggregate]);

  // ⭐ Populate local state
  useEffect(() => {
    if (currentAggregate && !loaded) {
      const reportData = currentAggregate.data as SpecialistReportData;

      setVisits(reportData?.visits || []);
      setManualActivities(reportData?.manual_activities || []);
      setLoaded(true);
    }
  }, [currentAggregate, loaded]);

  // ═══════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════

  const handleSave = async () => {
    if (!id) return;

    try {
      await updateAggregate({
        aggregateId: id,
        manualActivities,
      });

      navigate(`/aggregates/${id}`);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  // ═══════════════════════════════════════════
  // Render — Loading
  // ═══════════════════════════════════════════

  if (loadingDetail || !loaded) {
    return <Loading message="جاري تحميل التقرير..." />;
  }

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <Card padding="lg" className="border-danger bg-danger/5">
          <div className="flex items-start gap-3 text-danger">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="mb-1 font-bold">خطأ</h2>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
        <Button
          variant="ghost"
          icon={<ArrowRight className="h-4 w-4" />}
          onClick={() => navigate('/aggregates')}
        >
          عودة للتقارير
        </Button>
      </div>
    );
  }

  if (!currentAggregate) {
    return (
      <div className="space-y-6" dir="rtl">
        <Card padding="lg">
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl">📄</div>
            <h2 className="mb-2 text-xl font-bold text-text">
              التقرير غير موجود
            </h2>
            <p className="mb-6 text-text-secondary">
              قد يكون التقرير محذوفاً أو غير متاح
            </p>
            <Button variant="primary" onClick={() => navigate('/aggregates')}>
              عودة للتقارير
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Data
  // ═══════════════════════════════════════════

  const reportData = currentAggregate.data as SpecialistReportData;
  const calcs = currentAggregate.aggregate_template?.calculations;
  const reportType = calcs?.report_type || reportData?.report_type || 'RL';
  const entityLabel = calcs?.entity_label || 'الجهة';

  const specialistName = reportData?.specialist_name || '—';
  const regionName = reportData?.region_name || '—';
  const periodStart =
    reportData?.period_start || currentAggregate.period_start || '—';
  const periodEnd =
    reportData?.period_end || currentAggregate.period_end || '—';
  const periodType =
    reportData?.period_type || currentAggregate.period_type || '—';

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === '—') return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const periodTypeLabel = (() => {
    if (periodType === 'biweekly') return 'نصف شهري';
    if (periodType === 'monthly') return 'شهري';
    if (periodType === 'custom') return 'مخصص';
    return '—';
  })();

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  return (
    <div className="space-y-6" dir="rtl">
      {/* ═══ Header ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/aggregates/${id}`)}
            className="rounded-lg p-2 transition-colors hover:bg-bg-secondary"
          >
            <ArrowRight className="h-5 w-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              ✏️ تعديل التقرير التجميعي
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {currentAggregate.aggregate_template?.name_ar || 'تقرير تجميعي'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => navigate(`/aggregates/${id}`)}
          >
            إلغاء
          </Button>
          <Button
            variant="primary"
            icon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            disabled={saving}
            loading={saving}
          >
            حفظ التعديلات
          </Button>
        </div>
      </div>

      {/* ═══ Info Banner ═══ */}
      <Card padding="md" className="border-info/30 bg-info/5">
        <div className="flex items-start gap-2 text-sm text-info">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            يمكنك تعديل الأنشطة الإشرافية فقط. الزيارات مرتبطة بتقارير
            المنشأ ولا يمكن تعديلها من هنا.
          </span>
        </div>
      </Card>

      {/* ═══ Error ═══ */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="flex items-start gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* ═══ Metadata (قراءة فقط) ═══ */}
      <Card padding="lg" className="bg-bg-secondary">
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-text-muted" />
            <span className="text-text-secondary">المختص:</span>
            <span className="font-medium text-text">{specialistName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-text-muted" />
            <span className="text-text-secondary">المنطقة:</span>
            <span className="font-medium text-text">{regionName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-text-muted" />
            <span className="text-text-secondary">
              الفترة ({periodTypeLabel}):
            </span>
            <span className="font-medium text-text">
              {formatDate(periodStart)} → {formatDate(periodEnd)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-text-muted" />
            <span className="text-text-secondary">النوع:</span>
            <span className="font-medium text-text">
              {reportType === 'RL' ? 'زيارات R.L' : 'زيارات TLS'}
            </span>
          </div>
        </div>
      </Card>

      {/* ═══ Visits Table (قراءة فقط) ═══ */}
      <Card padding="lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text">
            <FileText className="h-5 w-5 text-info" />
            أولاً: الزيارات
          </h3>
          <span className="rounded-full bg-bg-secondary px-3 py-1 text-xs text-text-muted">
            للعرض فقط
          </span>
        </div>

        <VisitsTable visits={visits} entityLabel={entityLabel} />
      </Card>

      {/* ═══ Manual Activities (قابل للتعديل) ═══ */}
      <Card padding="lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text">
            <Sparkles className="h-5 w-5 text-warning" />
            ثانياً: أنشطة إشرافية أخرى
          </h3>
          <span className="rounded-full bg-warning/10 px-3 py-1 text-xs text-warning">
            قابل للتعديل
          </span>
        </div>

        <ManualActivitiesTable
          activities={manualActivities}
          onChange={setManualActivities}
        />
      </Card>

      {/* ═══ Bottom Actions ═══ */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={() => navigate(`/aggregates/${id}`)}
        >
          إلغاء
        </Button>
        <Button
          variant="primary"
          size="lg"
          icon={<Save className="h-5 w-5" />}
          onClick={handleSave}
          disabled={saving}
          loading={saving}
        >
          حفظ التعديلات
        </Button>
      </div>
    </div>
  );
}

export default EditAggregatePage;