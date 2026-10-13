import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  Calendar,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { useAggregatesStore } from '../../stores/aggregates-store';
import { DeleteAggregateModal } from '../../components/aggregates/DeleteAggregateModal';
import { Button, Card } from '../../components/ui';
import type { PeriodType, ReportType } from '../../types/aggregates';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type QuickTab = 'all' | 'RL' | 'TLS';

interface AdvancedFilters {
  periodType: PeriodType | null;
  periodStart: string;
  periodEnd: string;
  regionId: string | null;
}

const DEFAULT_ADVANCED: AdvancedFilters = {
  periodType: null,
  periodStart: '',
  periodEnd: '',
  regionId: null,
};

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

  // ═══════════════════════════════════════════
  // Filters State
  // ═══════════════════════════════════════════

  const [quickTab, setQuickTab] = useState<QuickTab>('all');
  const [search, setSearch] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedFilters>(DEFAULT_ADVANCED);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    type: string;
    creatorName: string;
    sourceCount: number;
  } | null>(null);

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
  // ⭐ Filtered Aggregates
  // ═══════════════════════════════════════════

  const filteredAggregates = useMemo(() => {
    let result = [...aggregates];

    // 1. الفلتر السريع (نوع التقرير)
    if (quickTab !== 'all') {
      result = result.filter((a) => {
        const calcs = a.aggregate_template?.calculations as any;
        return calcs?.report_type === quickTab;
      });
    }

    // 2. البحث النصي
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      result = result.filter((a) => {
        const templateName =
          a.aggregate_template?.name_ar?.toLowerCase() || '';
        const entityName = a.entity?.name_ar?.toLowerCase() || '';
        const creatorName = a.creator?.full_name?.toLowerCase() || '';
        return (
          templateName.includes(s) ||
          entityName.includes(s) ||
          creatorName.includes(s)
        );
      });
    }

    // 3. فلتر متقدم: نوع الفترة
    if (advanced.periodType) {
      result = result.filter((a) => a.period_type === advanced.periodType);
    }

    // 4. فلتر متقدم: من تاريخ
    if (advanced.periodStart) {
      result = result.filter(
        (a) => (a.period_start || '') >= advanced.periodStart
      );
    }

    // 5. فلتر متقدم: إلى تاريخ
    if (advanced.periodEnd) {
      result = result.filter(
        (a) => (a.period_end || '') <= advanced.periodEnd
      );
    }

    // 6. فلتر متقدم: المنطقة
    if (advanced.regionId) {
      result = result.filter((a) => a.entity_id === advanced.regionId);
    }

    return result;
  }, [aggregates, quickTab, search, advanced]);

  // ═══════════════════════════════════════════
  // Counts (للعرض في التبويبات)
  // ═══════════════════════════════════════════

  const counts = useMemo(() => {
    const rl = aggregates.filter((a) => {
      const calcs = a.aggregate_template?.calculations as any;
      return calcs?.report_type === 'RL';
    }).length;

    const tls = aggregates.filter((a) => {
      const calcs = a.aggregate_template?.calculations as any;
      return calcs?.report_type === 'TLS';
    }).length;

    return {
      all: aggregates.length,
      rl,
      tls,
    };
  }, [aggregates]);

  // ═══════════════════════════════════════════
  // Available Regions (للفلتر)
  // ═══════════════════════════════════════════

  const availableRegions = useMemo(() => {
    const map = new Map<string, string>();
    aggregates.forEach((a) => {
      if (a.entity?.id && a.entity?.name_ar) {
        map.set(a.entity.id, a.entity.name_ar);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [aggregates]);

  // ═══════════════════════════════════════════
  // Active Filters Count
  // ═══════════════════════════════════════════

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advanced.periodType) count++;
    if (advanced.periodStart) count++;
    if (advanced.periodEnd) count++;
    if (advanced.regionId) count++;
    return count;
  }, [advanced]);

  const hasAnyFilter =
    quickTab !== 'all' ||
    search.trim() !== '' ||
    activeFiltersCount > 0;

  // ═══════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════

  const clearAllFilters = () => {
    setQuickTab('all');
    setSearch('');
    setAdvanced(DEFAULT_ADVANCED);
  };

  const clearAdvanced = () => {
    setAdvanced(DEFAULT_ADVANCED);
  };

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

      {/* ═══ Filters Bar ═══ */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Quick Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <QuickTabButton
              active={quickTab === 'all'}
              onClick={() => setQuickTab('all')}
              label="الكل"
              count={counts.all}
            />
            <QuickTabButton
              active={quickTab === 'RL'}
              onClick={() => setQuickTab('RL')}
              label="تجميعي - زيارات R.L"
              count={counts.rl}
            />
            <QuickTabButton
              active={quickTab === 'TLS'}
              onClick={() => setQuickTab('TLS')}
              label="تجميعي - زيارات TLS"
              count={counts.tls}
            />
          </div>

          {/* Search + Advanced Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم التقرير، المنطقة، أو المختص..."
                className="w-full rounded-lg border border-border bg-surface py-2.5 pr-10 pl-10 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Advanced Toggle */}
            <Button
              variant={advancedOpen ? 'primary' : 'ghost'}
              size="sm"
              icon={<Filter className="h-4 w-4" />}
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              فلترة متقدمة
              {activeFiltersCount > 0 && (
                <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  advancedOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>

            {/* Clear All */}
            {hasAnyFilter && (
              <Button
                variant="ghost"
                size="sm"
                icon={<X className="h-4 w-4" />}
                onClick={clearAllFilters}
                className="text-danger hover:bg-danger/10"
              >
                مسح الكل
              </Button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {advancedOpen && (
            <div className="rounded-lg border border-border bg-bg-secondary/50 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Period Type */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    <Calendar className="inline h-3.5 w-3.5 ml-1" />
                    فترة التقرير
                  </label>
                  <select
                    value={advanced.periodType || ''}
                    onChange={(e) =>
                      setAdvanced({
                        ...advanced,
                        periodType: (e.target.value || null) as PeriodType | null,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">كل الفترات</option>
                    <option value="biweekly">نصف شهري</option>
                    <option value="monthly">شهري</option>
                    <option value="custom">مخصص</option>
                  </select>
                </div>

                {/* Period Start */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    من تاريخ
                  </label>
                  <input
                    type="date"
                    value={advanced.periodStart}
                    onChange={(e) =>
                      setAdvanced({ ...advanced, periodStart: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Period End */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    إلى تاريخ
                  </label>
                  <input
                    type="date"
                    value={advanced.periodEnd}
                    onChange={(e) =>
                      setAdvanced({ ...advanced, periodEnd: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Region */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    <MapPin className="inline h-3.5 w-3.5 ml-1" />
                    المنطقة
                  </label>
                  <select
                    value={advanced.regionId || ''}
                    onChange={(e) =>
                      setAdvanced({
                        ...advanced,
                        regionId: e.target.value || null,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">كل المناطق</option>
                    {availableRegions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Advanced */}
              {activeFiltersCount > 0 && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={clearAdvanced}
                    className="text-xs text-danger hover:underline"
                  >
                    مسح الفلاتر المتقدمة
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              عرض <strong className="text-text">{filteredAggregates.length}</strong>{' '}
              من {aggregates.length} تقرير
            </span>
          </div>
        </div>
      </Card>

      {/* ═══ Loading ═══ */}
      {loadingList && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-text-secondary">جاري التحميل...</p>
          </div>
        </div>
      )}

      {/* ═══ Empty — No reports at all ═══ */}
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

      {/* ═══ Empty — No results after filter ═══ */}
      {!loadingList &&
        aggregates.length > 0 &&
        filteredAggregates.length === 0 && (
          <Card padding="lg">
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <div className="mb-4 text-5xl">🔍</div>
              <h3 className="mb-2 text-lg font-semibold text-text">
                لا توجد نتائج مطابقة
              </h3>
              <p className="mb-6 text-sm text-text-secondary">
                جرّب تغيير الفلاتر أو البحث بكلمات مختلفة
              </p>
              <Button variant="ghost" onClick={clearAllFilters}>
                مسح جميع الفلاتر
              </Button>
            </div>
          </Card>
        )}

      {/* ═══ List ═══ */}
      {!loadingList && filteredAggregates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAggregates.map((aggregate) => {
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
                    <p className="mt-0.5 text-xs font-medium text-info">
                      📍 {aggregate.entity?.name_ar || '—'}
                    </p>
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
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">المنطقة:</span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-info/10 px-2 py-0.5 text-xs font-semibold text-info">
                      <span>📍</span>
                      {aggregate.entity?.name_ar || '—'}
                    </span>
                  </div>

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

// ═══════════════════════════════════════════════════════════
// QuickTabButton — زر التبويب السريع
// ═══════════════════════════════════════════════════════════

interface QuickTabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}

function QuickTabButton({
  active,
  onClick,
  label,
  count,
}: QuickTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-surface text-text-secondary hover:bg-bg-secondary'
      }`}
    >
      <span>{label}</span>
      <span
        className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs ${
          active
            ? 'bg-primary text-white'
            : 'bg-bg-secondary text-text-muted'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export default AggregatesListPage;