import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Clock,
  User as UserIcon,
  FileText,
  TrendingUp,
  Star,
  Trash2,
  Edit,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAggregatesStore } from '../../stores/aggregates-store';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { DeleteAggregateModal } from '../../components/aggregates/DeleteAggregateModal';

// ================================================
// Helpers
// ================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getPeriodLabel(periodType: string | null): string {
  const labels: Record<string, string> = {
    weekly: 'أسبوعي',
    biweekly: 'كل أسبوعين',
    monthly: 'شهري',
    custom: 'مخصص',
  };
  return periodType ? labels[periodType] || periodType : '—';
}

// ================================================
// Component
// ================================================

export function ViewAggregatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { activeEntity } = useEntityStore();
  const {
    currentAggregate,
    loading,
    saving,
    error,
    loadAggregateById,
    deleteAggregate,
    clearCurrentAggregate,
  } = useAggregatesStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadAggregateById(id);
    }

    return () => {
      clearCurrentAggregate();
    };
  }, [id, loadAggregateById, clearCurrentAggregate]);

  // Permissions
  const isTechSupport = activeEntity?.roleCode === 'tech_support';
  const isOwner = currentAggregate?.created_by === user?.id;
  const canEdit = isOwner || isTechSupport;
  const canDelete = isTechSupport;

  const handleDelete = async (reason: string) => {
    if (!id) return;

    try {
      await deleteAggregate(id, reason);
      setShowDeleteModal(false);
      navigate('/aggregates', { replace: true });
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Render — Loading
  if (loading) {
    return <Loading message="جاري تحميل التقرير التجميعي..." />;
  }

  // Render — Error
  if (error || !currentAggregate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/aggregates')}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-2xl font-bold text-text">التقرير التجميعي</h1>
        </div>

        <Card padding="lg" className="border-danger bg-danger/5">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-danger mb-2">
              لم يتم العثور على التقرير
            </h2>
            <p className="text-text-secondary mb-6">
              {error || 'التقرير التجميعي غير موجود'}
            </p>
            <Button
              variant="primary"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/aggregates')}
            >
              العودة إلى التجميعية
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const aggregate = currentAggregate;
  const data = aggregate.data || {};
  const charts = aggregate.charts || {};
  const template = aggregate.aggregate_template;

  const ratingDistribution =
    (
      charts as {
        rating_distribution?: { rating: number; count: number }[];
      }
    ).rating_distribution || [];

  const totalCount = (data.count as number) || 0;
  const avgRating = (data.avg_rating as number) || 0;
  const notes = (data.notes as string[]) || [];
  const recommendations = (data.recommendations as string[]) || [];

  const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e'];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/aggregates')}
              className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-text-secondary" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text">
                {template?.name_ar || 'تقرير تجميعي'}
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                {formatDate(aggregate.period_start)} →{' '}
                {formatDate(aggregate.period_end)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="primary"
                icon={<Edit className="w-4 h-4" />}
                onClick={() => navigate(`/aggregates/${id}/edit`)}
              >
                تعديل
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowDeleteModal(true)}
              >
                حذف نهائي
              </Button>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <Card padding="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-xs font-medium text-text-muted uppercase mb-2">
                النوع
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="font-medium text-text">
                  {template?.name_ar || '—'}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-text-muted uppercase mb-2">
                المُنشئ
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-info" />
                <span className="font-medium text-text">
                  {aggregate.creator?.full_name || '—'}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-text-muted uppercase mb-2">
                نوع الفترة
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-secondary" />
                <span className="text-text">
                  {getPeriodLabel(aggregate.period_type)}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-text-muted uppercase mb-2">
                التاريخ
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-secondary" />
                <span className="text-text">
                  {formatDate(aggregate.created_at)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card padding="md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text">
                  {aggregate.source_count}
                </div>
                <div className="text-sm text-text-secondary">
                  تقرير مصدر
                </div>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text">
                  {totalCount}
                </div>
                <div className="text-sm text-text-secondary">
                  إجمالي التقارير
                </div>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text">
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                </div>
                <div className="text-sm text-text-secondary">
                  متوسط التقييم
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Chart */}
        {ratingDistribution.length > 0 && (
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
              📊 توزيع التقييمات
            </h3>

            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="rating" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0)
                        return null;
                      const item = payload[0].payload as {
                        rating: number;
                        count: number;
                      };
                      return (
                        <div
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          }}
                        >
                          <p
                            style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              marginBottom: '4px',
                              color: '#111827',
                            }}
                          >
                            ⭐ التقييم: {item.rating}
                          </p>
                          <p
                            style={{
                              fontSize: '12px',
                              color: '#4b5563',
                            }}
                          >
                            📄 العدد: {item.count} تقرير
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {ratingDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.rating - 1] || '#2563eb'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Notes & Recommendations */}
        {(notes.length > 0 || recommendations.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {notes.length > 0 && (
              <Card padding="lg">
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                  📝 الملاحظات المُجمَّعة
                  <span className="text-sm font-normal text-text-muted">
                    ({notes.length})
                  </span>
                </h3>
                <ul className="space-y-2">
                  {notes.map((note, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg"
                    >
                      <span className="text-primary flex-shrink-0">•</span>
                      <span className="text-text">{note}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {recommendations.length > 0 && (
              <Card padding="lg">
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                  💡 التوصيات المُجمَّعة
                  <span className="text-sm font-normal text-text-muted">
                    ({recommendations.length})
                  </span>
                </h3>
                <ul className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg"
                    >
                      <span className="text-success flex-shrink-0">✓</span>
                      <span className="text-text">{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {/* Summary */}
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-text mb-4">📝 ملخص</h3>
          <div className="space-y-3 text-text">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-text-secondary">
                عدد التقارير المُجمّعة
              </span>
              <span className="font-bold">{aggregate.source_count}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-text-secondary">
                إجمالي التقارير المُجمّعة
              </span>
              <span className="font-bold">{totalCount}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-text-secondary">متوسط التقييم</span>
              <span className="font-bold">
                {avgRating > 0 ? `${avgRating.toFixed(2)} / 5` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-text-secondary">الحالة</span>
              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                🟢 نشط
              </span>
            </div>
          </div>
        </Card>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/aggregates')}
          >
            العودة إلى التجميعية
          </Button>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteAggregateModal
        isOpen={showDeleteModal}
        aggregateTitle={template?.name_ar || 'تقرير تجميعي'}
        aggregateType={aggregate.aggregate_type}
        aggregateCreatorName={aggregate.creator?.full_name || '—'}
        sourceCount={aggregate.source_count}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={saving}
      />
    </>
  );
}