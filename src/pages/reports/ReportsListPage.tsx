import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  GraduationCap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { useReportsStore } from '../../stores/reports-store';
import { useTemplatesStore } from '../../stores/templates-store';
import { Button, Card, Input } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { supabase } from '../../lib/supabase';

// ================================================
// Helpers
// ================================================

function formatDate(dateStr: string | null, lang: string): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getStatusBadge(
  status: string,
  t: (key: string) => string
): { label: string; className: string } {
  const badges: Record<string, { label: string; className: string }> = {
    active: {
      label: t('reports_page.status_active'),
      className: 'bg-success/10 text-success',
    },
    updated: {
      label: t('reports_page.status_updated'),
      className: 'bg-info/10 text-info',
    },
    aggregated: {
      label: t('reports_page.status_aggregated'),
      className: 'bg-warning/10 text-warning',
    },
    archived: {
      label: t('reports_page.status_archived'),
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

function getPeriodLabel(
  periodType: string | null,
  t: (key: string) => string
): string {
  if (!periodType) return '—';
  const labels: Record<string, string> = {
    weekly: t('reports_page.period_weekly'),
    biweekly: t('reports_page.period_biweekly'),
    monthly: t('reports_page.period_monthly'),
    custom: t('reports_page.period_custom'),
  };
  return labels[periodType] || periodType;
}

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

function extractTeacherName(data: Record<string, unknown> | undefined): string {
  if (!data) return '—';
  const val = data.teacher_name;
  return typeof val === 'string' && val.trim() ? val : '—';
}

// ================================================
// Types
// ================================================

type StatusFilter = 'all' | 'active' | 'updated' | 'aggregated' | 'archived';
type KindFilter = 'all' | 'rl' | 'tls';

// ================================================
// Component
// ================================================

export function ReportsListPage() {
  const { t, i18n } = useTranslation();
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

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [hasCreatePermission, setHasCreatePermission] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const canViewAll = ['tech_support', 'edc_viewer', 'qa_chief'].includes(
    activeEntity?.roleCode || ''
  );
  const noTemplates = !templatesLoading && templates.length === 0;

  // ═══════════════════════════════════════════════════════════
  // ⭐ Permission check + Realtime listener (StrictMode-safe)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    let subscription: any = null;
    let intervalId: any = null;
    let isMounted = true;

    const checkPermission = async () => {
      if (!activeEntity?.roleCode) return;

      try {
        const { data, error } = await supabase.rpc(
          'check_user_can_create_report'
        );

        if (!isMounted) return;

        if (error) {
          console.error('Error checking permission:', error);
          setHasCreatePermission(false);
        } else {
          setHasCreatePermission(data === true);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setHasCreatePermission(false);
      } finally {
        if (isMounted) {
          setCheckingPermissions(false);
        }
      }
    };

    const init = async () => {
      setCheckingPermissions(true);
      await checkPermission();

      if (!isMounted) return;

      // ⭐ اسم قناة فريد لتجنب تعارض StrictMode
      const channelName = `reports_permissions_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 9)}`;

      try {
        subscription = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'user_entity_roles' },
            () => {
              if (isMounted) {
                console.log('🔄 User roles changed, re-checking permission...');
                checkPermission();
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'role_permissions' },
            () => {
              if (isMounted) {
                console.log('🔄 Role permissions changed, re-checking permission...');
                checkPermission();
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('⚠️ Realtime subscription failed:', err);
      }

      // خيار احتياطي: فحص كل 10 ثوانٍ
      if (isMounted) {
        intervalId = setInterval(checkPermission, 10000);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (subscription) {
        try {
          supabase.removeChannel(subscription);
        } catch (err) {
          // تجاهل — قد تكون القناة أُزيلت بالفعل
        }
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeEntity?.roleCode, activeEntity?.entityId, user?.id]);

  // ═══════════════════════════════════════════════════════════
  // Load data
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (user && activeEntity) {
      loadReports(user.id, activeEntity.entityId);
    }
  }, [user, activeEntity, loadReports]);

  useEffect(() => {
    if (activeEntity?.roleCode) {
      loadAvailableTemplates(activeEntity.roleCode);
    }
  }, [activeEntity?.roleCode, activeEntity?.entityId, loadAvailableTemplates]);

  // ═══════════════════════════════════════════════════════════
  // Derived data
  // ═══════════════════════════════════════════════════════════

  const entityColumnLabel = useMemo(() => {
    const role = activeEntity?.roleCode;
    if (role === 'tls_manager') {
      return i18n.language === 'ar' ? 'المركز' : 'Center';
    }
    if (role === 'school_manager') {
      return i18n.language === 'ar' ? 'المدرسة' : 'School';
    }

    if (
      activeEntity?.regionModes?.includes('tls') &&
      !activeEntity?.regionModes?.includes('rl')
    ) {
      return i18n.language === 'ar' ? 'المركز' : 'Center';
    }
    if (
      activeEntity?.regionModes?.includes('rl') &&
      !activeEntity?.regionModes?.includes('tls')
    ) {
      return i18n.language === 'ar' ? 'المدرسة' : 'School';
    }

    return i18n.language === 'ar' ? 'المدرسة / المركز' : 'School / Center';
  }, [activeEntity?.roleCode, activeEntity?.regionModes, i18n.language]);

  const filteredReports = useMemo(() => {
    let result = reports;

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (kindFilter !== 'all') {
      result = result.filter(
        (r) => getTemplateKind(r.template?.code) === kindFilter
      );
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.template?.name_ar?.toLowerCase().includes(q) ||
          r.entity?.name_ar?.toLowerCase().includes(q) ||
          r.creator?.full_name?.toLowerCase().includes(q) ||
          extractTeacherName(r.data as any).toLowerCase().includes(q)
      );
    }

    if (filters.periodStart) {
      result = result.filter((r) => {
        const d = r.period_start || r.created_at;
        return d && d >= filters.periodStart!;
      });
    }

    if (filters.periodEnd) {
      result = result.filter((r) => {
        const d = r.period_start || r.created_at;
        return d && d <= filters.periodEnd!;
      });
    }

    return result;
  }, [
    reports,
    statusFilter,
    kindFilter,
    filters.searchQuery,
    filters.periodStart,
    filters.periodEnd,
  ]);

  const statusCounts = useMemo(
    () => ({
      all: reports.length,
      active: reports.filter((r) => r.status === 'active').length,
      updated: reports.filter((r) => r.status === 'updated').length,
      aggregated: reports.filter((r) => r.status === 'aggregated').length,
      archived: reports.filter((r) => r.status === 'archived').length,
    }),
    [reports]
  );

  const pageTitle = useMemo(() => {
    const role = activeEntity?.roleCode;
    if (role === 'tech_support' || role === 'edc_viewer')
      return `📝 ${t('reports_page.all_reports')}`;
    if (role === 'qa_chief') return `📝 ${t('reports_page.team_reports')}`;
    if (role === 'region_manager' || role === 'region_assistant')
      return `📝 ${t('reports_page.region_reports')}`;
    if (role === 'qa_coordinator' || role === 'edu_specialist')
      return `📝 ${t('reports_page.my_reports')}`;
    if (role === 'school_manager')
      return `📝 ${t('reports_page.school_reports')}`;
    if (role === 'tls_manager')
      return `📝 ${t('reports_page.center_reports')}`;
    return `📝 ${t('reports_page.reports')}`;
  }, [activeEntity, t]);

  // ═══════════════════════════════════════════════════════════
  // Scroll handling
  // ═══════════════════════════════════════════════════════════

  const checkScroll = () => {
    const el = tableScrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const currentScroll = Math.abs(el.scrollLeft);
    const scrolledFromStart = currentScroll > 2;
    const scrolledFromEnd = currentScroll < maxScroll - 2;

    setCanScrollLeft(scrolledFromEnd);
    setCanScrollRight(scrolledFromStart);
  };

  useEffect(() => {
    checkScroll();
    const t = setTimeout(checkScroll, 100);

    const el = tableScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        clearTimeout(t);
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [reports.length, filteredReports.length]);

  const scrollTableLeft = () => {
    const el = tableScrollRef.current;
    if (!el) return;
    const newPos = Math.abs(el.scrollLeft) + 300;
    el.scrollTo({ left: -newPos, behavior: 'smooth' });
  };

  const scrollTableRight = () => {
    const el = tableScrollRef.current;
    if (!el) return;
    const newPos = Math.max(0, Math.abs(el.scrollLeft) - 300);
    el.scrollTo({ left: -newPos, behavior: 'smooth' });
  };

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  if (loading && reports.length === 0) {
    return <Loading message={t('reports_page.loading_reports')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{pageTitle}</h1>
          <p className="text-text-secondary mt-1">
            {canViewAll
              ? t('reports_page.view_all_desc', {
                  entity: activeEntity?.entityName || '',
                })
              : t('reports_page.view_my_desc', {
                  entity: activeEntity?.entityName || '',
                })}
          </p>
        </div>

        {!checkingPermissions && hasCreatePermission && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/reports/new')}
          >
            {t('reports_page.create_report')}
          </Button>
        )}
      </div>

      {/* Warning: No templates */}
      {hasCreatePermission && noTemplates && (
        <Card padding="md" className="border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-warning mb-1">
                {t('reports_page.no_templates_warning', {
                  entity: activeEntity?.entityName || '',
                })}
              </p>
              <p className="text-warning/90">
                {t('reports_page.no_templates_desc')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label={t('reports_page.total_reports')}
          value={stats.total}
          color="primary"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label={t('reports_page.this_month')}
          value={stats.thisMonth}
          color="info"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label={t('reports_page.active')}
          value={stats.active}
          color="success"
        />
        <StatCard
          icon={<Archive className="w-5 h-5" />}
          label={t('reports_page.archived')}
          value={stats.archived}
          color="warning"
        />
      </div>

      {/* Filter Card */}
      <Card padding="none">
        <div className="border-b border-border overflow-x-auto">
          <div className="flex items-center gap-1 px-2 min-w-max">
            <TabButton
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              label={t('reports_page.all')}
              count={statusCounts.all}
            />
            <TabButton
              active={statusFilter === 'active'}
              onClick={() => setStatusFilter('active')}
              label={t('reports_page.status_active')}
              count={statusCounts.active}
            />
            <TabButton
              active={statusFilter === 'updated'}
              onClick={() => setStatusFilter('updated')}
              label={t('reports_page.status_updated')}
              count={statusCounts.updated}
            />
            <TabButton
              active={statusFilter === 'aggregated'}
              onClick={() => setStatusFilter('aggregated')}
              label={t('reports_page.status_aggregated')}
              count={statusCounts.aggregated}
            />
            <TabButton
              active={statusFilter === 'archived'}
              onClick={() => setStatusFilter('archived')}
              label={t('reports_page.status_archived')}
              count={statusCounts.archived}
            />
          </div>
        </div>

        <div className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder={t('reports_page.search_placeholder')}
              icon={<Search className="w-4 h-4" />}
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
            />
          </div>

          <Button
            variant={showAdvanced ? 'primary' : 'secondary'}
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {t('reports_page.advanced_options')}
          </Button>

          {(filters.searchQuery ||
            filters.periodStart ||
            filters.periodEnd ||
            kindFilter !== 'all' ||
            statusFilter !== 'all') && (
            <Button
              variant="ghost"
              icon={<X className="w-4 h-4" />}
              onClick={() => {
                setStatusFilter('all');
                setKindFilter('all');
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
              }}
            >
              {t('reports_page.clear')}
            </Button>
          )}
        </div>

        {showAdvanced && (
          <div className="px-4 pb-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  {t('reports_page.report_type')}
                </label>
                <select
                  value={kindFilter}
                  onChange={(e) =>
                    setKindFilter(e.target.value as KindFilter)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                >
                  <option value="all">{t('reports_page.all')}</option>
                  <option value="rl">
                    {t('aggregates_page.report_type_rl')}
                  </option>
                  <option value="tls">
                    {t('aggregates_page.report_type_tls')}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  {t('reports_page.period_from')}
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

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  {t('reports_page.period_to')}
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

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredReports.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-light rounded-full mb-4">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-text mb-2">
              {reports.length === 0
                ? t('reports_page.no_reports_title')
                : t('reports_page.no_results_title')}
            </h2>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              {reports.length === 0
                ? hasCreatePermission
                  ? noTemplates
                    ? t('reports_page.no_templates_in_region', {
                        entity: activeEntity?.entityName || '',
                      })
                    : t('reports_page.no_reports_desc')
                  : t('reports_page.no_permission')
                : t('reports_page.try_change_filters')}
            </p>
            {reports.length === 0 && hasCreatePermission && !noTemplates && (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => navigate('/reports/new')}
              >
                {t('reports_page.create_report')}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Reports Table */}
      {filteredReports.length > 0 && (
        <Card padding="none" className="relative">
          {canScrollRight && (
            <button
              onClick={scrollTableRight}
              className="absolute right-0 top-12 bottom-0 z-20 w-10 bg-gradient-to-l from-surface via-surface/90 to-transparent flex items-center justify-center hover:from-primary/10 transition-colors"
              aria-label="تمرير لليمين"
            >
              <ChevronRight className="w-6 h-6 text-primary drop-shadow-sm" />
            </button>
          )}
          {canScrollLeft && (
            <button
              onClick={scrollTableLeft}
              className="absolute left-0 top-12 bottom-0 z-20 w-10 bg-gradient-to-r from-surface via-surface/90 to-transparent flex items-center justify-center hover:from-primary/10 transition-colors"
              aria-label="تمرير لليسار"
            >
              <ChevronLeft className="w-6 h-6 text-primary drop-shadow-sm" />
            </button>
          )}

          <div
            ref={tableScrollRef}
            className="overflow-auto max-h-[calc(100vh-280px)]"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table className="w-full relative">
              <thead className="bg-bg-secondary border-b border-border sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase">
                    {t('reports_page.table_report')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase hidden md:table-cell">
                    {entityColumnLabel}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase hidden md:table-cell">
                    {i18n.language === 'ar' ? 'المعلم' : 'Teacher'}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase hidden lg:table-cell">
                    {t('reports_page.table_creator')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase">
                    {t('reports_page.table_status')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase">
                    {t('reports_page.table_date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const badge = getStatusBadge(report.status, t);
                  const teacherName = extractTeacherName(report.data as any);

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
                              {report.template?.name_ar ||
                                t('reports_page.table_report')}
                            </div>
                            <div className="text-xs text-text-muted truncate">
                              {getPeriodLabel(report.period_type, t)}
                              {report.period_start &&
                                ` — ${formatDate(
                                  report.period_start,
                                  i18n.language
                                )}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm text-text">
                          <Building2 className="w-4 h-4 text-text-muted flex-shrink-0" />
                          <span
                            className="truncate max-w-[200px]"
                            title={report.entity?.name_ar}
                          >
                            {report.entity?.name_ar || '—'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm text-text">
                          <GraduationCap className="w-4 h-4 text-text-muted flex-shrink-0" />
                          <span
                            className="truncate max-w-[150px]"
                            title={teacherName}
                          >
                            {teacherName}
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
                          {formatDate(report.created_at, i18n.language)}
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

export default ReportsListPage;