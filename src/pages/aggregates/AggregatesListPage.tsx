import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Plus,
  Calendar,
  User as UserIcon,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { useAggregatesStore } from '../../stores/aggregates-store';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';

// ================================================
// Helpers
// ================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
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

export function AggregatesListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeEntity } = useEntityStore();
  const { aggregates, loading, error, loadAggregates } = useAggregatesStore();

  useEffect(() => {
    if (user && activeEntity) {
      loadAggregates(user.id, activeEntity.entityId);
    }
  }, [user, activeEntity, loadAggregates]);

  if (loading) {
    return <Loading message="جاري تحميل التقارير التجميعية..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">
            📊 التقارير التجميعية
          </h1>
          <p className="text-text-secondary mt-1">
            تجميع وتحليل التقارير في {activeEntity?.entityName}
          </p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/aggregates/new')}
        >
          إنشاء تقرير تجميعي
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm">⚠️ {error}</div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && aggregates.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-light rounded-full mb-4">
              <BarChart3 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-text mb-2">
              لا توجد تقارير تجميعية بعد
            </h2>
            <p className="text-text-secondary mb-6">
              أنشئ أول تقرير تجميعي لتحليل بيانات التقارير
            </p>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/aggregates/new')}
            >
              إنشاء تقرير تجميعي
            </Button>
          </div>
        </Card>
      )}

      {/* Aggregates Grid */}
      {aggregates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aggregates.map((aggregate) => {
            const template = aggregate.aggregate_template;

            return (
              <button
                key={aggregate.id}
                onClick={() => navigate(`/aggregates/${aggregate.id}`)}
                className="text-right transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary rounded-xl"
              >
                <Card
                  padding="lg"
                  className="h-full hover:shadow-hard transition-shadow"
                >
                  {/* Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
                      🟢 نشط
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-text mb-2 line-clamp-2">
                    {template?.name_ar || aggregate.aggregate_type}
                  </h3>

                  {/* Period */}
                  <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                    <Calendar className="w-4 h-4 text-text-muted" />
                    <span>
                      {formatDate(aggregate.period_start)} →{' '}
                      {formatDate(aggregate.period_end)}
                    </span>
                  </div>

                  {/* Type */}
                  <div className="text-xs text-text-muted mb-4">
                    {getPeriodLabel(aggregate.period_type)}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-info" />
                      <div>
                        <div className="text-lg font-bold text-text">
                          {aggregate.source_count}
                        </div>
                        <div className="text-xs text-text-muted">
                          تقرير مصدر
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-success" />
                      <div>
                        <div className="text-lg font-bold text-text">
                          {typeof aggregate.data?.avg_rating === 'number'
                            ? (aggregate.data.avg_rating as number).toFixed(1)
                            : '—'}
                        </div>
                        <div className="text-xs text-text-muted">
                          متوسط التقييم
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Creator */}
                  <div className="flex items-center gap-2 text-xs text-text-muted mt-4">
                    <UserIcon className="w-3 h-3" />
                    <span>{aggregate.creator?.full_name || '—'}</span>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}