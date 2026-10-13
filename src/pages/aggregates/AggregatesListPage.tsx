import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { useAggregatesStore } from '../../stores/aggregates-store';
import { DeleteAggregateModal } from '../../components/aggregates/DeleteAggregateModal';
import { Button, Card } from '../../components/ui';

// ═══════════════════════════════════════════════════════════
// Aggregates List Page
// ═══════════════════════════════════════════════════════════

export function AggregatesListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeEntity } = useEntityStore();

  const {
    aggregates,
    loadingList,
    deleting,
    error,
    loadUserAggregates,
    deleteAggregate,
    clearError,
  } = useAggregatesStore();

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    type: string;
    creatorName: string;
    sourceCount: number;
  } | null>(null);

  // ⭐ هل المستخدم من الدعم الفني؟
  const isTechSupport = activeEntity?.roleCode === 'tech_support';

  // ═══════════════════════════════════════════
  // Load on mount
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (user?.id && activeEntity?.entityId) {
      loadUserAggregates(user.id, activeEntity.entityId);
    }
  }, [user?.id, activeEntity?.entityId, loadUserAggregates]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // ═══════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════

  const getReportTypeLabel = (reportType: string | undefined) => {
    if (reportType === 'RL') return 'زيارات R.L';
    if (reportType === 'TLS') return 'زيارات TLS';
    return 'تقرير';
  };

  const getPeriodTypeLabel = (periodType: string | null) => {
    if (periodType === 'biweekly') return 'نصف شهري';
    if (periodType === 'monthly') return 'شهري';
    if (periodType === 'custom') return 'مخصص';
    return '—';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
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

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  return (
    <div className="space-y-6" dir="rtl">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">
            📊 التقارير التجميعية
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            عرض وإدارة التقارير التجميعية الخاصة بك
          </p>
        </div>

        <Button
          variant="primary"
          icon={<span className="text-lg leading-none">+</span>}
          onClick={() => navigate('/aggregates/new')}
        >
          إنشاء تقرير تجميعي
        </Button>
      </div>

      {/* ═══ Error ═══ */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="flex items-center justify-between text-danger">
            <span className="text-sm">⚠️ {error}</span>
            <button
              onClick={clearError}
              className="text-sm underline hover:no-underline"
            >
              إغلاق
            </button>
          </div>
        </Card>
      )}

      {/* ═══ Loading ═══ */}
      {loadingList && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-text-secondary">جاري التحميل...</p>
          </div>
        </div>
      )}

      {/* ═══ Empty ═══ */}
      {!loadingList && aggregates.length === 0 && (
        <Card padding="lg">
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
            <div className="mb-4 text-5xl">📋</div>
            <h3 className="mb-2 text-lg font-semibold text-text">
              لا توجد تقارير تجميعية بعد
            </h3>
            <p className="mb-6 text-sm text-text-secondary">
              ابدأ بإنشاء تقرير تجميعي جديد لعرض زياراتك
            </p>
            <Button
              variant="primary"
              size="lg"
              icon={<span className="text-lg leading-none">+</span>}
              onClick={() => navigate('/aggregates/new')}
            >
              إنشاء تقرير تجميعي
            </Button>
          </div>
        </Card>
      )}

      {/* ═══ List ═══ */}
      {!loadingList && aggregates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {aggregates.map((aggregate) => {
            const calcs = aggregate.aggregate_template?.calculations as any;
            const reportType = calcs?.report_type;

            return (
              <Card
                key={aggregate.id}
                padding="lg"
                className="transition-shadow hover:shadow-hard"
              >
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-text">
                      {aggregate.aggregate_template?.name_ar ||
                        'تقرير تجميعي'}
                    </h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {getReportTypeLabel(reportType)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      aggregate.status === 'active'
                        ? 'bg-success/10 text-success'
                        : 'bg-bg-secondary text-text-muted'
                    }`}
                  >
                    {aggregate.status === 'active' ? 'نشط' : 'مؤرشف'}
                  </span>
                </div>

                {/* Info */}
                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">الفترة:</span>
                    <span className="font-medium text-text">
                      {getPeriodTypeLabel(aggregate.period_type)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">من:</span>
                    <span className="font-medium text-text">
                      {formatDate(aggregate.period_start)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">إلى:</span>
                    <span className="font-medium text-text">
                      {formatDate(aggregate.period_end)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">عدد الزيارات:</span>
                    <span className="font-medium text-primary">
                      {aggregate.source_count}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/aggregates/${aggregate.id}`)}
                    className="flex-1"
                  >
                    عرض
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate(`/aggregates/${aggregate.id}/edit`)
                    }
                    className="flex-1"
                  >
                    تعديل
                  </Button>

                  {/* ⭐ زر الحذف — للدعم الفني فقط */}
                  {isTechSupport && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDeleteTarget({
                          id: aggregate.id,
                          title:
                            aggregate.aggregate_template?.name_ar ||
                            'تقرير تجميعي',
                          type:
                            reportType === 'RL'
                              ? 'زيارات R.L'
                              : reportType === 'TLS'
                              ? 'زيارات TLS'
                              : 'تقرير',
                          creatorName:
                            aggregate.creator?.full_name || '—',
                          sourceCount: aggregate.source_count || 0,
                        })
                      }
                      className="text-danger hover:bg-danger/10"
                    >
                      حذف
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ Delete Modal ═══ */}
      {deleteTarget && isTechSupport && (
        <DeleteAggregateModal
          isOpen={true}
          aggregateTitle={deleteTarget.title}
          aggregateType={deleteTarget.type}
          aggregateCreatorName={deleteTarget.creatorName}
          sourceCount={deleteTarget.sourceCount}
          isDeleting={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async (reason) => {
            await deleteAggregate(deleteTarget.id, reason);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

export default AggregatesListPage;