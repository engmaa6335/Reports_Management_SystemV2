import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Archive,
  User as UserIcon,
  Building2,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { useReportsStore } from '../../stores/reports-store';
import { useTemplatesStore } from '../../stores/templates-store';
import { Button, Card, Input } from '../../components/ui';
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

function getStatusBadge(status: string): {
  label: string;
  className: string;
} {
  const badges: Record<string, { label: string; className: string }> = {
    active: { label: '🟢 نشط', className: 'bg-success/10 text-success' },
    updated: { label: '🔵 محدّث', className: 'bg-info/10 text-info' },
    aggregated: { label: '🟡 مُجمّع', className: 'bg-warning/10 text-warning' },
    archived: {
      label: '⚪ مؤرشف',
      className: 'bg-text-muted/10 text-text-muted',
    },
  };

  return (
    badges[status] || {
      label: status,
      className: 'bg-bg-secondary text-text',
    }
  );
}

function getPeriodLabel(periodType: string | null): string {
  if (!periodType) return '—';
  const labels: Record<string, string> = {
    weekly: 'أسبوعي',
    biweekly: 'كل أسبوعين',
    monthly: 'شهري',
    custom: 'مخصص',
  };
  return labels[periodType] || periodType;
}

// ⭐ هل يمكن لهذا الدور إنشاء تقارير؟
function canCreateReports(roleCode: string | undefined): boolean {
  if (!roleCode) return false;
  return [
    'tech_support',
    'edu_specialist',
    'qa_coordinator',
    'qa_chief',
    'school_manager',
    'tls_manager',
    'region_manager',
    'region_assistant',
  ].includes(roleCode);
}

// ⭐ كشف نوع القالب (TLS / R.L / other)
function getTemplateKind(
  templateCode: string | undefined
): 'tls' | 'rl' | 'other' {
  if (!templateCode) return 'other';
  const code = String(templateCode).toLowerCase();
  if (code.includes('tls')) return 'tls';
  if (code.includes('rl') || code.includes('r_l') || code.includes('r-l')) {
    return 'rl';
  }
  return 'other';
}

// ================================================
// Types
// ================================================

type TabType = 'all' | 'active' | 'updated' | 'aggregated' | 'archived';
type KindFilter = 'all' | 'rl' | 'tls';

// ================================================
// Component
// ================================================

export function ReportsListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeEntity } = useEntityStore();
  const {
    reports,
    stats,
    loading,
    error,
    loadReports,
    filters,
    setFilters,
  } = useReportsStore();
  const { templates, loading: templatesLoading, loadAvailableTemplates } =
    useTemplatesStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // 🔑 هل يمكن رؤية كل التقارير؟
  const canViewAll = ['tech_support', 'edc_viewer', 'qa_chief'].includes(
    activeEntity?.roleCode || ''
  );

  // ⭐ هل يمكن إنشاء تقارير؟
  const allowCreate = canCreateReports(activeEntity?.roleCode);

  // ⭐ هل لا يوجد قوالب متاحة؟
  const noTemplates = !templatesLoading && templates.length === 0;

  // تحميل التقارير
  useEffect(() => {
    if (user && activeEntity) {
      loadReports(user.id, activeEntity.entityId);
    }
  }, [user, activeEntity, loadReports]);

  // تحميل القوالب
  useEffect(() => {
    if (activeEntity?.roleCode) {
      loadAvailableTemplates(activeEntity.roleCode);
    }
  }, [activeEntity?.roleCode, activeEntity?.entityId, loadAvailableTemplates]);

  // 🔑 فلترة موحّدة: التبويب + النوع + البحث + الفلاتر المتقدمة
  const filteredReports = useMemo(() => {
    let result = reports;

    // 1) التبويب (الحالة)
    if (activeTab !== 'all') {
      result = result.filter((r) => r.status === activeTab);
    }

    // 2) نوع التقرير (R.L / TLS)
    if (kindFilter !== 'all') {
      result = result.filter((r) => {
        const code = r.template?.code;
        return getTemplateKind(code) === kindFilter;
      });
    }

    // 3) البحث النصي
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.template?.name_ar?.toLowerCase().includes(query) ||
          r.entity?.name_ar?.toLowerCase().includes(query) ||
          r.creator?.full_name?.toLowerCase().includes(query)
      );
    }

    // 4) فلترة متقدمة حسب نوع التقرير (الفئة)
    if (filters.categoryCode) {
      result = result.filter(
        (r) =>
          String(r.template?.category?.code || '').toLowerCase() ===
          String(filters.categoryCode).toLowerCase()
      );
    }

    // 5) فلترة حسب قالب محدد
    if (filters.templateId) {
      result = result.filter((r) => r.template_id === filters.templateId);
    }

    // 6) فلترة متقدمة حسب تاريخ الزيارة (من)
    if (filters.periodStart) {
      result = result.filter((r) => {
        const visitDate = r.period_start || r.created_at;
        return visitDate && visitDate >= filters.periodStart!;
      });
    }

    // 7) فلترة متقدمة حسب تاريخ الزيارة (إلى)
    if (filters.periodEnd) {
      result = result.filter((r) => {
        const visitDate = r.period_start || r.created_at;
        return visitDate && visitDate <= filters.periodEnd!;
      });
    }

    return result;
  }, [reports, activeTab, kindFilter, filters]);

  // 🔑 عدادات التبويبات (حسب الحالة)
  const tabCounts = useMemo(
    () => ({
      all: reports.length,
      active: reports.filter((r) => r.status === 'active').length,
      updated: reports.filter((r) => r.status === 'updated').length,
      aggregated: reports.filter((r) => r.status === 'aggregated').length,
      archived: reports.filter((r) => r.status === 'archived').length,
    }),
    [reports]
  );

  // 🔑 عدادات أنواع التقارير (R.L / TLS)
  const kindCounts = useMemo(() => {
    const rl = reports.filter(
      (r) => getTemplateKind(r.template?.code) === 'rl'
    ).length;
    const tls = reports.filter(
      (r) => getTemplateKind(r.template?.code) === 'tls'
    ).length;
    return { all: reports.length, rl, tls };
  }, [reports]);

  // 🔑 عنوان الصفحة حسب الدور
  const pageTitle = useMemo(() => {
    const role = activeEntity?.roleCode;
    if (role === 'tech_support') return '📝 جميع التقارير';
    if (role === 'edc_viewer') return '📝 جميع التقارير (EDC)';
    if (role === 'qa_chief') return '📝 تقارير الفريق';
    if (role === 'region_manager') return '📝 تقارير المنطقة';
    if (role === 'region_assistant') return '📝 تقارير المنطقة';
    if (role === 'qa_coordinator') return '📝 تقاريري';
    if (role === 'edu_specialist') return '📝 تقاريري';
    if (role === 'school_manager') return '📝 تقارير مدرستي';
    if (role === 'tls_manager') return '📝 تقارير مركزي';
    return '📝 التقارير';
  }, [activeEntity]);

  if (loading && reports.length === 0) {
    return <Loading message="جاري تحميل التقارير..." />;
  }

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════ */}
      {/* Header */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{pageTitle}</h1>
          <p className="text-text-secondary mt-1">
            {canViewAll
              ? `عرض جميع التقارير في النظام — ${activeEntity?.entityName}`
              : `عرض وإدارة تقاريرك في ${activeEntity?.entityName}`}
          </p>
        </div>

        {allowCreate && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/reports/new')}
          >
            إنشاء تقرير جديد
          </Button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* Warning: No templates for this region */}
      {/* ═══════════════════════════════════════════════ */}
      {allowCreate && noTemplates && (
        <Card padding="md" className="border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-warning mb-1">
                لا توجد قوالب متاحة في منطقة "{activeEntity?.entityName}"
              </p>
              <p className="text-warning/90">
                بعض القوالب (مثل TLS) تظهر فقط في المناطق التي تحتوي على
                مراكز تعليمية. جرّب تبديل المنطقة من القائمة العلوية.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* Stats Cards */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="إجمالي التقارير"
          value={stats.total}
          color="primary"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="هذا الشهر"
          value={stats.thisMonth}
          color="info"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="نشطة"
          value={stats.active}
          color="success"
        />
        <StatCard
          icon={<Archive className="w-5 h-5" />}
          label="مؤرشفة"
          value={stats.archived}
          color="warning"
        />
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* ⭐ نوع التقرير: الكل / R.L / TLS */}
      {/* ═══════════════════════════════════════════════ */}
      <Card padding="md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-text-secondary ml-1">
            نوع التقرير:
          </span>
          <KindButton
            active={kindFilter === 'all'}
            onClick={() => setKindFilter('all')}
            label="الكل"
            count={kindCounts.all}
            color="primary"
          />
          <KindButton
            active={kindFilter === 'rl'}
            onClick={() => setKindFilter('rl')}
            label="📘 المختصين R.L"
            count={kindCounts.rl}
            color="info"
          />
          <KindButton
            active={kindFilter === 'tls'}
            onClick={() => setKindFilter('tls')}
            label="🎓 المختصين TLS"
            count={kindCounts.tls}
            color="success"
          />
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════ */}
      {/* Tabs + Search */}
      {/* ═══════════════════════════════════════════════ */}
      <Card padding="none">
        <div className="border-b border-border overflow-x-auto">
          <div className="flex items-center gap-1 px-2 min-w-max">
            <TabButton
              active={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              label="الكل"
              count={tabCounts.all}
            />
            <TabButton
              active={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
              label="🟢 نشط"
              count={tabCounts.active}
            />
            <TabButton
              active={activeTab === 'updated'}
              onClick={() => setActiveTab('updated')}
              label="🔵 محدّث"
              count={tabCounts.updated}
            />
            <TabButton
              active={activeTab === 'aggregated'}
              onClick={() => setActiveTab('aggregated')}
              label="🟡 مُجمّع"
              count={tabCounts.aggregated}
            />
            <TabButton
              active={activeTab === 'archived'}
              onClick={() => setActiveTab('archived')}
              label="⚪ مؤرشف"
              count={tabCounts.archived}
            />
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder="ابحث بالاسم، الكيان، أو المُنشئ..."
              icon={<Search className="w-4 h-4" />}
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
            />
          </div>

          <Button
            variant="secondary"
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            فلترة متقدمة
          </Button>

          {(filters.searchQuery ||
            filters.categoryCode ||
            filters.templateId ||
            filters.periodStart ||
            filters.periodEnd ||
            kindFilter !== 'all') && (
            <Button
              variant="ghost"
              icon={<X className="w-4 h-4" />}
              onClick={() => {
                setFilters({
                  searchQuery: '',
                  status: '',
                  categoryCode: '',
                  templateId: '',
                  creatorId: '',
                  entityIdFilter: '',
                  periodStart: '',
                  periodEnd: '',
                });
                setActiveTab('all');
                setKindFilter('all');
              }}
            >
              مسح
            </Button>
          )}
        </div>

        {/* ⭐ Advanced Filters */}
        {showFilters && (
          <div className="px-4 pb-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* نوع التقرير (الفئة) */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  نوع التقرير (الفئة)
                </label>
                <select
                  value={filters.categoryCode || ''}
                  onChange={(e) =>
                    setFilters({ categoryCode: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                >
                  <option value="">كل الأنواع</option>
                  <option value="rl">زيارات R.L</option>
                  <option value="tls">تقارير TLS</option>
                  <option value="edu">تقارير تربوية</option>
                  <option value="other">تقارير أخرى</option>
                </select>
              </div>

              {/* قالب محدد */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  القالب
                </label>
                <select
                  value={filters.templateId || ''}
                  onChange={(e) => setFilters({ templateId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                >
                  <option value="">كل القوالب</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              {/* تاريخ الزيارة من */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  تاريخ الزيارة من
                </label>
                <input
                  type="date"
                  value={filters.periodStart || ''}
                  onChange={(e) =>
                    setFilters({ periodStart: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                />
              </div>

              {/* تاريخ الزيارة إلى */}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  تاريخ الزيارة إلى
                </label>
                <input
                  type="date"
                  value={filters.periodEnd || ''}
                  onChange={(e) => setFilters({ periodEnd: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════ */}
      {/* Error */}
      {/* ═══════════════════════════════════════════════ */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* Empty State */}
      {/* ═══════════════════════════════════════════════ */}
      {!loading && filteredReports.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-light rounded-full mb-4">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-text mb-2">
              {reports.length === 0
                ? 'لا توجد تقارير بعد'
                : 'لا توجد نتائج مطابقة'}
            </h2>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              {reports.length === 0
                ? allowCreate
                  ? noTemplates
                    ? `لا توجد قوالب متاحة في "${activeEntity?.entityName}". جرّب تبديل المنطقة من القائمة العلوية.`
                    : 'ابدأ بإنشاء أول تقرير لك'
                  : 'ليس لديك صلاحية لإنشاء التقارير'
                : 'جرّب تغيير الفلاتر أو البحث'}
            </p>
            {reports.length === 0 && allowCreate && !noTemplates && (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => navigate('/reports/new')}
              >
                إنشاء تقرير جديد
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* Reports Table */}
      {/* ═══════════════════════════════════════════════ */}
      {filteredReports.length > 0 && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-secondary border-b border-border">
                <tr>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase">
                    التقرير
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase hidden md:table-cell">
                    الفئة
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase hidden lg:table-cell">
                    الكيان
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase hidden lg:table-cell">
                    المُنشئ
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase">
                    الحالة
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase">
                    التاريخ
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const badge = getStatusBadge(report.status);
                  return (
                    <tr
                      key={report.id}
                      onClick={() => navigate(`/reports/${report.id}`)}
                      className="border-b border-border last:border-0 hover:bg-bg-secondary cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-text truncate">
                              {report.template?.name_ar || 'تقرير'}
                            </div>
                            <div className="text-xs text-text-muted truncate">
                              {getPeriodLabel(report.period_type)}
                              {report.period_start &&
                                ` — ${formatDate(report.period_start)}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 hidden md:table-cell">
                        {report.template?.category && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                            style={{
                              backgroundColor: `${report.template.category.color}15`,
                              color:
                                report.template.category.color || '#2563eb',
                            }}
                          >
                            {report.template.category.name_ar}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2 text-sm text-text">
                          <Building2 className="w-4 h-4 text-text-muted" />
                          <span className="truncate">
                            {report.entity?.name_ar || '—'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2 text-sm text-text">
                          <UserIcon className="w-4 h-4 text-text-muted" />
                          <span className="truncate">
                            {report.creator?.full_name || '—'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm text-text-secondary">
                          {formatDate(report.created_at)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ================================================
// Sub-Components
// ================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'primary' | 'info' | 'success' | 'warning' | 'danger';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <Card padding="md">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-text">{value}</div>
          <div className="text-sm text-text-secondary">{label}</div>
        </div>
      </div>
    </Card>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}

function TabButton({ active, onClick, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-3 text-sm font-medium
        border-b-2 transition-colors whitespace-nowrap
        ${
          active
            ? 'border-primary text-primary'
            : 'border-transparent text-text-secondary hover:text-text hover:border-border'
        }
      `}
    >
      <span>{label}</span>
      <span
        className={`
          inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold
          ${
            active
              ? 'bg-primary text-white'
              : 'bg-bg-secondary text-text-secondary'
          }
        `}
      >
        {count}
      </span>
    </button>
  );
}

// ⭐ زر نوع التقرير (الكل / R.L / TLS)
interface KindButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color: 'primary' | 'info' | 'success';
}

function KindButton({
  active,
  onClick,
  label,
  count,
  color,
}: KindButtonProps) {
  const activeClasses: Record<string, string> = {
    primary: 'bg-primary text-white border-primary',
    info: 'bg-info text-white border-info',
    success: 'bg-success text-white border-success',
  };

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
        border-2 transition-all
        ${
          active
            ? activeClasses[color]
            : 'bg-surface text-text-secondary border-border hover:border-primary/40 hover:text-text'
        }
      `}
    >
      <span>{label}</span>
      <span
        className={`
          inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold
          ${active ? 'bg-white/25 text-white' : 'bg-bg-secondary text-text-secondary'}
        `}
      >
        {count}
      </span>
    </button>
  );
}