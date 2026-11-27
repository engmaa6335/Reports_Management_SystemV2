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
  MapPin,
  School,
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

type PeriodKey = 'this_week' | 'last_week' | 'two_weeks_ago' | 'custom' | 'all';

function getPeriodRange(period: PeriodKey, customStart: string, customEnd: string) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToSaturday = (dayOfWeek + 1) % 7;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysToSaturday);
  startOfWeek.setHours(0, 0, 0, 0);

  let start: Date, end: Date = new Date(today);

  switch (period) {
    case 'this_week':
      start = new Date(startOfWeek);
      break;
    case 'last_week':
      start = new Date(startOfWeek);
      start.setDate(start.getDate() - 7);
      end = new Date(startOfWeek);
      end.setDate(end.getDate() - 1);
      break;
    case 'two_weeks_ago':
      start = new Date(startOfWeek);
      start.setDate(start.getDate() - 14);
      end = new Date(startOfWeek);
      end.setDate(end.getDate() - 8);
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : startOfWeek;
      if (customEnd) end = new Date(customEnd);
      break;
    default:
      start = new Date(startOfWeek);
  }
  
  // ضبط نهاية اليوم لضمان شمول التقارير المسجلة في نفس اليوم
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

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
    active: { label: t('reports_page.status_active'), className: 'bg-success/10 text-success' },
    updated: { label: t('reports_page.status_updated'), className: 'bg-info/10 text-info' },
    aggregated: { label: t('reports_page.status_aggregated'), className: 'bg-warning/10 text-warning' },
    archived: { label: t('reports_page.status_archived'), className: 'bg-text-muted/10 text-text-muted' },
  };
  return badges[status] || { label: status, className: 'bg-bg-secondary text-text' };
}

function getPeriodLabel(periodType: string | null, t: (key: string) => string): string {
  if (!periodType) return '—';
  const labels: Record<string, string> = {
    weekly: t('reports_page.period_weekly'),
    biweekly: t('reports_page.period_biweekly'),
    monthly: t('reports_page.period_monthly'),
    custom: t('reports_page.period_custom'),
  };
  return labels[periodType] || periodType;
}

function getTemplateKind(templateCode: string | undefined): 'tls' | 'rl' | 'other' {
  if (!templateCode) return 'other';
  const code = String(templateCode).toLowerCase();
  if (code.includes('tls')) return 'tls';
  if (code.includes('rl') || code.includes('r_l') || code.includes('r-l')) return 'rl';
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
    loading,
    error,
    loadReports,
  } = useReportsStore();
  const { templates, loading: templatesLoading, loadAvailableTemplates } = useTemplatesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // ⭐ الفلتر الافتراضي "هذا الأسبوع"
  const [periodFilter, setPeriodFilter] = useState<PeriodKey>('this_week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [hasCreatePermission, setHasCreatePermission] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const canViewAll = ['tech_support', 'edc_viewer', 'qa_chief'].includes(activeEntity?.roleCode || '');
  const isTechSupport = activeEntity?.roleCode === 'tech_support';
  const noTemplates = !templatesLoading && templates.length === 0;

  // ═══════════════════════════════════════════════════════════
  // Permission check + Realtime
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    let subscription: any = null;
    let intervalId: any = null;
    let isMounted = true;

    const checkPermission = async () => {
      if (!activeEntity?.roleCode) return;
      try {
        const { data, error } = await supabase.rpc('check_user_can_create_report');
        if (!isMounted) return;
        if (error) setHasCreatePermission(false);
        else setHasCreatePermission(data === true);
      } catch (err) {
        if (isMounted) setHasCreatePermission(false);
      } finally {
        if (isMounted) setCheckingPermissions(false);
      }
    };

    const init = async () => {
      setCheckingPermissions(true);
      await checkPermission();
      if (!isMounted) return;

      const channelName = `reports_permissions_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      try {
        subscription = supabase
          .channel(channelName)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'user_entity_roles' }, () => {
            if (isMounted) checkPermission();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, () => {
            if (isMounted) checkPermission();
          })
          .subscribe();
      } catch (err) {}
      if (isMounted) intervalId = setInterval(checkPermission, 10000);
    };

    init();
    return () => {
      isMounted = false;
      if (subscription) try { supabase.removeChannel(subscription); } catch (e) {}
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeEntity?.roleCode, activeEntity?.entityId, user?.id]);

  // ═══════════════════════════════════════════════════════════
  // Load data
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (user && activeEntity) loadReports(user.id, activeEntity.entityId);
  }, [user, activeEntity, loadReports]);

  useEffect(() => {
    if (activeEntity?.roleCode) loadAvailableTemplates(activeEntity.roleCode);
  }, [activeEntity?.roleCode, activeEntity?.entityId, loadAvailableTemplates]);

  // إعادة تعيين فلتر الحالة للمستخدمين العاديين لمنع أي تعارض
  useEffect(() => {
    if (!isTechSupport) setStatusFilter('all');
  }, [isTechSupport]);

  // ═══════════════════════════════════════════════════════════
  // Derived data (Local Filtering)
  // ═══════════════════════════════════════════════════════════

  const entityColumnLabel = useMemo(() => {
    const role = activeEntity?.roleCode;
    if (role === 'tls_manager') return i18n.language === 'ar' ? 'المركز' : 'Center';
    if (role === 'school_manager') return i18n.language === 'ar' ? 'المدرسة' : 'School';
    if (activeEntity?.regionModes?.includes('tls') && !activeEntity?.regionModes?.includes('rl')) return i18n.language === 'ar' ? 'المركز' : 'Center';
    if (activeEntity?.regionModes?.includes('rl') && !activeEntity?.regionModes?.includes('tls')) return i18n.language === 'ar' ? 'المدرسة' : 'School';
    return i18n.language === 'ar' ? 'المدرسة / المركز' : 'School / Center';
  }, [activeEntity?.roleCode, activeEntity?.regionModes, i18n.language]);

  const uniqueRegions = useMemo(() => {
    const map = new Map<string, string>();
    reports.forEach((r) => {
      const regionName = (r as any).region?.name_ar;
      const regionId = r.region_id;
      if (regionId && regionName) map.set(regionId, regionName);
    });
    return Array.from(map.entries()).map(([id, name_ar]) => ({ id, name_ar }));
  }, [reports]);

  // ⭐ 1. الفلترة الأساسية (تعتمد حصرياً على created_at لتطابق لوحة التحكم)
  const reportsBeforeStatusFilter = useMemo(() => {
    let result = reports;

    if (kindFilter !== 'all') result = result.filter((r) => getTemplateKind(r.template?.code) === kindFilter);
    if (regionFilter !== 'all') result = result.filter((r) => r.region_id === regionFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.template?.name_ar?.toLowerCase().includes(q) ||
          r.entity?.name_ar?.toLowerCase().includes(q) ||
          r.creator?.full_name?.toLowerCase().includes(q) ||
          extractTeacherName(r.data as any).toLowerCase().includes(q)
      );
    }

    // فلترة الفترة (محلياً بناءً على created_at)
    if (periodFilter !== 'all') {
      const { start, end } = getPeriodRange(periodFilter, customStart, customEnd);
      result = result.filter((r) => {
        if (!r.created_at) return false;
        const d = new Date(r.created_at);
        return d >= start && d <= end;
      });
    }

    return result;
  }, [reports, kindFilter, regionFilter, searchQuery, periodFilter, customStart, customEnd]);

  // ⭐ 2. النتيجة النهائية للعرض (مع فلتر الحالة للدعم الفني فقط)
  const filteredReports = useMemo(() => {
    if (isTechSupport && statusFilter !== 'all') {
      return reportsBeforeStatusFilter.filter((r) => r.status === statusFilter);
    }
    return reportsBeforeStatusFilter;
  }, [reportsBeforeStatusFilter, statusFilter, isTechSupport]);

  // ⭐ 3. العدادات (للدعم الفني فقط)
  const statusCounts = useMemo(
    () => ({
      all: reportsBeforeStatusFilter.length,
      active: reportsBeforeStatusFilter.filter((r) => r.status === 'active').length,
      updated: reportsBeforeStatusFilter.filter((r) => r.status === 'updated').length,
      aggregated: reportsBeforeStatusFilter.filter((r) => r.status === 'aggregated').length,
      archived: reportsBeforeStatusFilter.filter((r) => r.status === 'archived').length,
    }),
    [reportsBeforeStatusFilter]
  );

  // ⭐ 4. البطاقات العلوية الديناميكية بناءً على الفترة المحددة
  const dynamicStats = useMemo(() => {
    const total = reportsBeforeStatusFilter.length;
    const rl = reportsBeforeStatusFilter.filter((r) => getTemplateKind(r.template?.code) === 'rl').length;
    const tls = reportsBeforeStatusFilter.filter((r) => getTemplateKind(r.template?.code) === 'tls').length;
    const archived = reportsBeforeStatusFilter.filter((r) => r.status === 'archived').length;
    return { total, rl, tls, archived };
  }, [reportsBeforeStatusFilter]);

  const pageTitle = useMemo(() => {
    const role = activeEntity?.roleCode;
    if (role === 'tech_support' || role === 'edc_viewer') return `📝 ${t('reports_page.all_reports')}`;
    if (role === 'qa_chief') return `📝 ${t('reports_page.team_reports')}`;
    if (role === 'region_manager' || role === 'region_assistant') return `📝 ${t('reports_page.region_reports')}`;
    if (role === 'qa_coordinator' || role === 'edu_specialist') return `📝 ${t('reports_page.my_reports')}`;
    if (role === 'school_manager') return `📝 ${t('reports_page.school_reports')}`;
    if (role === 'tls_manager') return `📝 ${t('reports_page.center_reports')}`;
    return `📝 ${t('reports_page.reports')}`;
  }, [activeEntity, t]);

  // ═══════════════════════════════════════════════════════════
  // Scroll handling
  // ═══════════════════════════════════════════════════════════
  const checkScroll = () => {
    const el = tableScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) { setCanScrollLeft(false); setCanScrollRight(false); return; }
    const currentScroll = Math.abs(el.scrollLeft);
    setCanScrollLeft(currentScroll < maxScroll - 2);
    setCanScrollRight(currentScroll > 2);
  };

  useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 100);
    const el = tableScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        clearTimeout(timer);
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [reports.length, filteredReports.length]);

  const scrollTableLeft = () => {
    const el = tableScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: -(Math.abs(el.scrollLeft) + 300), behavior: 'smooth' });
  };

  const scrollTableRight = () => {
    const el = tableScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: -Math.max(0, Math.abs(el.scrollLeft) - 300), behavior: 'smooth' });
  };

  if (loading && reports.length === 0) {
    return <Loading message={t('reports_page.loading_reports')} />;
  }

  const hasAnyFilter =
    searchQuery ||
    periodFilter !== 'this_week' ||
    kindFilter !== 'all' ||
    statusFilter !== 'all' ||
    regionFilter !== 'all' ||
    (periodFilter === 'custom' && (customStart || customEnd));

  const periodOptions: { key: PeriodKey; labelAr: string; labelEn: string }[] = [
    { key: 'this_week', labelAr: 'هذا الأسبوع', labelEn: 'This Week' },
    { key: 'last_week', labelAr: 'الأسبوع الماضي', labelEn: 'Last Week' },
    { key: 'two_weeks_ago', labelAr: 'قبل أسبوعين', labelEn: '2 Weeks Ago' },
    { key: 'custom', labelAr: 'مخصص', labelEn: 'Custom' },
    { key: 'all', labelAr: 'كافة التقارير', labelEn: 'All Reports' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{pageTitle}</h1>
          <p className="text-text-secondary mt-1">
            {canViewAll
              ? t('reports_page.view_all_desc', { entity: activeEntity?.entityName || '' })
              : t('reports_page.view_my_desc', { entity: activeEntity?.entityName || '' })}
          </p>
        </div>

        {!checkingPermissions && hasCreatePermission && (
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/reports/new')}>
            {t('reports_page.create_report')}
          </Button>
        )}
      </div>

      {/* ⭐ فلتر الفترة الزمنية (ظاهر للجميع مع حقول مخصص) */}
      <div className="flex flex-col gap-3 bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />{i18n.language === 'ar' ? 'الفترة:' : 'Period:'}
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {periodOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriodFilter(opt.key)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border"
                style={{
                  backgroundColor: periodFilter === opt.key ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: periodFilter === opt.key ? '#fff' : 'var(--color-text-secondary)',
                  borderColor: periodFilter === opt.key ? 'var(--color-primary)' : 'var(--color-border)',
                }}
              >
                {i18n.language === 'ar' ? opt.labelAr : opt.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* حقول "من وإلى" تظهر مباشرة عند اختيار مخصص */}
        {periodFilter === 'custom' && (
          <div className="flex items-center gap-3 flex-wrap mt-2 p-3 rounded-lg border border-dashed" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-primary)' }}>
            <label className="text-xs font-bold text-[var(--color-text-secondary)]">{i18n.language === 'ar' ? 'من:' : 'From:'}</label>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input" style={{ maxWidth: '160px' }} />
            <label className="text-xs font-bold text-[var(--color-text-secondary)]">{i18n.language === 'ar' ? 'إلى:' : 'To:'}</label>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input" style={{ maxWidth: '160px' }} />
          </div>
        )}
      </div>

      {/* Warning: No templates */}
      {hasCreatePermission && noTemplates && (
        <Card padding="md" className="border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-warning mb-1">
                {t('reports_page.no_templates_warning', { entity: activeEntity?.entityName || '' })}
              </p>
              <p className="text-warning/90">{t('reports_page.no_templates_desc')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ⭐ Stats (البطاقات الديناميكية بناءً على الفترة) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="w-5 h-5" />} label={i18n.language === 'ar' ? 'إجمالي التقارير' : 'Total Reports'} value={dynamicStats.total} color="primary" />
        <StatCard icon={<School className="w-5 h-5" />} label={i18n.language === 'ar' ? 'تقارير R.L' : 'R.L Reports'} value={dynamicStats.rl} color="info" />
        <StatCard icon={<GraduationCap className="w-5 h-5" />} label={i18n.language === 'ar' ? 'تقارير TLS' : 'TLS Reports'} value={dynamicStats.tls} color="success" />
        <StatCard icon={<Archive className="w-5 h-5" />} label={i18n.language === 'ar' ? 'مؤرشفة' : 'Archived'} value={dynamicStats.archived} color="warning" />
      </div>

      {/* Filter Card */}
      <Card padding="none">
        {/* ⭐ شريط الحالة (الكل، نشط...) يظهر فقط للدعم الفني */}
        {isTechSupport && (
          <div className="border-b border-border overflow-x-auto">
            <div className="flex items-center gap-1 px-2 min-w-max">
              <TabButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label={t('reports_page.all')} count={statusCounts.all} />
              <TabButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} label={t('reports_page.status_active')} count={statusCounts.active} />
              <TabButton active={statusFilter === 'updated'} onClick={() => setStatusFilter('updated')} label={t('reports_page.status_updated')} count={statusCounts.updated} />
              <TabButton active={statusFilter === 'aggregated'} onClick={() => setStatusFilter('aggregated')} label={t('reports_page.status_aggregated')} count={statusCounts.aggregated} />
              <TabButton active={statusFilter === 'archived'} onClick={() => setStatusFilter('archived')} label={t('reports_page.status_archived')} count={statusCounts.archived} />
            </div>
          </div>
        )}

        <div className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder={t('reports_page.search_placeholder')}
              icon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* زر الخيارات المتقدمة (ظاهر للجميع) */}
          <Button
            variant={showAdvanced ? 'primary' : 'secondary'}
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {t('reports_page.advanced_options')}
          </Button>

          {hasAnyFilter && (
            <Button
              variant="ghost"
              icon={<X className="w-4 h-4" />}
              onClick={() => {
                setStatusFilter('all');
                setKindFilter('all');
                setRegionFilter('all');
                setPeriodFilter('this_week'); // العودة للافتراضي
                setSearchQuery('');
                setCustomStart('');
                setCustomEnd('');
              }}
            >
              {t('reports_page.clear')}
            </Button>
          )}
        </div>

        {/* الخيارات المتقدمة (بدون حقول التاريخ لأنها انتقلت للأعلى) */}
        {showAdvanced && (
          <div className="px-4 pb-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  {t('reports_page.report_type')}
                </label>
                <select
                  value={kindFilter}
                  onChange={(e) => setKindFilter(e.target.value as KindFilter)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                >
                  <option value="all">{t('reports_page.all')}</option>
                  <option value="rl">{t('aggregates_page.report_type_rl')}</option>
                  <option value="tls">{t('aggregates_page.report_type_tls')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  <MapPin className="inline w-3.5 h-3.5 mr-1" />
                  {i18n.language === 'ar' ? 'المنطقة التعليمية' : 'Region'}
                </label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm"
                >
                  <option value="all">{i18n.language === 'ar' ? 'كل المناطق' : 'All Regions'}</option>
                  {uniqueRegions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name_ar}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* عدّاد التقارير المفلترة */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-text-muted">
          {i18n.language === 'ar' ? (
            <>عرض <strong className="text-text">{filteredReports.length}</strong> من <strong className="text-text">{reports.length}</strong> تقرير</>
          ) : (
            <>Showing <strong className="text-text">{filteredReports.length}</strong> of <strong className="text-text">{reports.length}</strong> reports</>
          )}
          {hasAnyFilter && filteredReports.length !== reports.length && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs">
              {i18n.language === 'ar'
                ? `(${reports.length - filteredReports.length} مخفي بسبب الفلاتر)`
                : `(${reports.length - filteredReports.length} hidden by filters)`}
            </span>
          )}
        </span>
      </div>

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
              {reports.length === 0 ? t('reports_page.no_reports_title') : t('reports_page.no_results_title')}
            </h2>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              {reports.length === 0
                ? hasCreatePermission
                  ? noTemplates
                    ? t('reports_page.no_templates_in_region', { entity: activeEntity?.entityName || '' })
                    : t('reports_page.no_reports_desc')
                  : t('reports_page.no_permission')
                : t('reports_page.try_change_filters')}
            </p>
            {reports.length === 0 && hasCreatePermission && !noTemplates && (
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/reports/new')}>
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
            <button onClick={scrollTableRight} className="absolute right-0 top-12 bottom-0 z-20 w-10 bg-gradient-to-l from-surface via-surface/90 to-transparent flex items-center justify-center hover:from-primary/10 transition-colors" aria-label="تمرير لليمين">
              <ChevronRight className="w-6 h-6 text-primary drop-shadow-sm" />
            </button>
          )}
          {canScrollLeft && (
            <button onClick={scrollTableLeft} className="absolute left-0 top-12 bottom-0 z-20 w-10 bg-gradient-to-r from-surface via-surface/90 to-transparent flex items-center justify-center hover:from-primary/10 transition-colors" aria-label="تمرير لليسار">
              <ChevronLeft className="w-6 h-6 text-primary drop-shadow-sm" />
            </button>
          )}

          <div ref={tableScrollRef} className="overflow-auto max-h-[calc(100vh-280px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full relative">
              <thead className="bg-bg-secondary border-b border-border sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase">{t('reports_page.table_report')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase hidden md:table-cell">{entityColumnLabel}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase hidden lg:table-cell">{i18n.language === 'ar' ? 'المنطقة' : 'Region'}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase hidden md:table-cell">{i18n.language === 'ar' ? 'المعلم' : 'Teacher'}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase hidden lg:table-cell">{t('reports_page.table_creator')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase">{t('reports_page.table_status')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase">{t('reports_page.table_date')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const badge = getStatusBadge(report.status, t);
                  const teacherName = extractTeacherName(report.data as any);
                  const regionName = (report as any).region?.name_ar;

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
                              {report.template?.name_ar || t('reports_page.table_report')}
                            </div>
                            <div className="text-xs text-text-muted truncate">
                              {getPeriodLabel(report.period_type, t)}
                              {report.period_start && ` — ${formatDate(report.period_start, i18n.language)}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm text-text">
                          <Building2 className="w-4 h-4 text-text-muted flex-shrink-0" />
                          <span className="truncate max-w-[200px]" title={report.entity?.name_ar}>
                            {report.entity?.name_ar || '—'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2 text-sm text-text">
                          <MapPin className="w-4 h-4 text-info flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{regionName || '—'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm text-text">
                          <GraduationCap className="w-4 h-4 text-text-muted flex-shrink-0" />
                          <span className="truncate max-w-[150px]" title={teacherName}>
                            {teacherName}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2 text-sm text-text">
                          <UserIcon className="w-4 h-4 text-text-muted" />
                          <span className="truncate">{report.creator?.full_name || '—'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}>
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
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
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
        ${active ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text hover:border-border'}
      `}
    >
      <span>{label}</span>
      <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${active ? 'bg-primary text-white' : 'bg-bg-secondary text-text-secondary'}`}>
        {count}
      </span>
    </button>
  );
}

export default ReportsListPage;