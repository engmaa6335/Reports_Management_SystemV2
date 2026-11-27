import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Calendar, FileText, Users, Download,
  AlertTriangle, BarChart3, Building2, ChevronDown, ChevronUp, School, GraduationCap, Search,
  MapPin, MapPinOff, ClipboardList, Minimize2, Maximize2
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { usePermission } from '../../hooks/usePermission';
import { supabase } from '../../lib/supabase';
import { Button, Card, Loading } from '../../components/ui';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
type RoleCode = 'region_manager' | 'region_assistant' | 'edc_viewer' | 'qa_chief' | 'qa_coordinator' | 'edu_specialist' | 'school_manager' | 'tls_manager' | 'tech_support';
type PeriodKey = 'this_week' | 'last_week' | 'two_weeks_ago' | 'custom';

interface StatItem {
  labelAr: string; labelEn: string; value: string; trend: string; trendType: 'up' | 'down' | 'flat'; color: string; breakdown?: { rl: number; tls: number };
}
interface TableRow {
  name: string; nameEn: string; type: 'rl' | 'tls' | 'region' | 'school' | 'tls_center'; rl?: number; tls?: number; visits?: number; total?: number; planned?: number; pct?: number | null;
}
interface CenterEntity { name: string; nameEn?: string; visits: number; specialists?: string[]; }
interface GroupedRow { regionName: string; entities: CenterEntity[] | null; }
interface SpecialistRow {
  user_id: string; nameAr: string; nameEn: string; specAr: string; specEn: string;
  rl_planned: number; rl_actual: number; tls_planned: number; tls_actual: number;
  total_planned: number; total_actual: number; pct: number | null; status: 'active' | 'warning' | 'danger';
  lastVisitAr: string; lastVisitEn: string; has_plan: boolean;
}
interface SpecialistVisit { user_id: string; nameAr: string; nameEn: string; rl: number; tls: number; total: number; }
interface VisitedCenter { entity_id: string; nameAr: string; nameEn: string; regionName: string; visits: number; specialists: string[]; }
interface NotVisitedCenter { entity_id: string; nameAr: string; nameEn: string; regionName: string; }

interface DashboardData {
  stats: StatItem[];
  tableData: TableRow[];
  schoolsData?: GroupedRow[];
  centersData?: GroupedRow[];
  specialistsData: SpecialistRow[];
  specialistVisits: SpecialistVisit[];
  visitedCenters: VisitedCenter[];
  notVisitedCenters: NotVisitedCenter[];
}

const ROLE_ICONS: Record<RoleCode, string> = {
  region_manager: '🗺️', region_assistant: '🤝', edc_viewer: '👁️',
  qa_chief: '✅', qa_coordinator: '🎯', edu_specialist: '📚',
  school_manager: '🏫', tls_manager: '🏢', tech_support: '🔧',
};
const ROLE_LABELS_AR: Record<RoleCode, string> = {
  region_manager: 'مدير منطقة', region_assistant: 'مساعد مدير منطقة',
  edc_viewer: 'مركز التطوير التربوي', qa_chief: 'رئيس ضمان الجودة',
  qa_coordinator: 'منسق ضمان الجودة', edu_specialist: 'مختص تربوي',
  school_manager: 'مدير مدرسة', tls_manager: 'مدير مركز تطوير', tech_support: 'دعم فني',
};
const ROLE_LABELS_EN: Record<RoleCode, string> = {
  region_manager: 'Region Manager', region_assistant: 'Region Assistant',
  edc_viewer: 'EDC Viewer', qa_chief: 'QA Chief',
  qa_coordinator: 'QA Coordinator', edu_specialist: 'Education Specialist',
  school_manager: 'School Manager', tls_manager: 'TLS Manager', tech_support: 'Tech Support',
};

const downloadCSV = (data: any[], headers: { key: string; label: string }[], filename: string) => {
  if (!data || data.length === 0) { alert('لا توجد بيانات للتصدير'); return; }
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  const rows = data.map(row => headers.map(h => {
    let val = row[h.key];
    if (val === null || val === undefined) val = '';
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(','));
  const csvContent = [headerRow, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function getPeriodRange(period: PeriodKey, customStart: string, customEnd: string) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToSaturday = (dayOfWeek + 1) % 7;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysToSaturday);
  startOfWeek.setHours(0, 0, 0, 0);
  let start: Date, end: Date = new Date(today);
  switch (period) {
    case 'this_week': start = new Date(startOfWeek); break;
    case 'last_week':
      start = new Date(startOfWeek); start.setDate(start.getDate() - 7);
      end = new Date(startOfWeek); end.setDate(end.getDate() - 1); break;
    case 'two_weeks_ago':
      start = new Date(startOfWeek); start.setDate(start.getDate() - 14);
      end = new Date(startOfWeek); end.setDate(end.getDate() - 8); break;
    case 'custom':
      start = customStart ? new Date(customStart) : startOfWeek;
      if (customEnd) end = new Date(customEnd); break;
    default: start = new Date(startOfWeek);
  }
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}

// ═══════════════════════════════════════════════════════════
// AccordionSection
// ═══════════════════════════════════════════════════════════
function AccordionSection({ title, icon, isOpen, onToggle, badge, children }: {
  title: string; icon: React.ReactNode; isOpen: boolean; onToggle: () => void;
  badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card padding="md">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
        <div className="flex items-center gap-2 flex-wrap">
          {icon}
          <h3 className="text-lg font-bold">{title}</h3>
          {badge}
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {isOpen && <div className="mt-4">{children}</div>}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════
export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeEntity, availableEntities, initialized, loadUserEntities, setActiveEntity } = useEntityStore();

  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en';
  const safeEntities = availableEntities ?? [];

  // ⭐ فحص الصلاحية مع حالة التحميل لمنع ظهور القسم لحظياً عند سحب الصلاحية
  const { allowed: canViewSpecialistPlans, loading: permLoading } = usePermission('specialist_plans.view');

  const [period, setPeriod] = useState<PeriodKey>('this_week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchSchools, setSearchSchools] = useState('');
  const [searchCenters, setSearchCenters] = useState('');
  const [searchNotVisited, setSearchNotVisited] = useState('');
  const [searchSpecialists, setSearchSpecialists] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'has_plan' | 'no_plan'>('all');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    specialistVisitsRM: true,
    visitedCenters: false,
    notVisitedCenters: false,
    schoolsDetails: false,
    specialistPlans: false,
    regionsDetails: true,
    centersPerRegion: false,
    schoolsPerRegion: false,
  });
  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const [expandedRegions, setExpandedRegions] = useState<{
    schools: Record<string, boolean>;
    centers: Record<string, boolean>;
    notVisited: Record<string, boolean>;
  }>({ schools: {}, centers: {}, notVisited: {} });

  const toggleRegion = (type: 'schools' | 'centers' | 'notVisited', regionName: string) => {
    setExpandedRegions(prev => ({ ...prev, [type]: { ...prev[type], [regionName]: !prev[type][regionName] } }));
  };

  useEffect(() => { if (user && !initialized) loadUserEntities(user.id); }, [user, initialized, loadUserEntities]);
  useEffect(() => {
    if (!initialized || safeEntities.length === 0) return;
    if (safeEntities.length === 1 && !activeEntity) setActiveEntity(safeEntities[0].entityId);
    else if (safeEntities.length > 1 && !activeEntity) navigate('/select-entity', { replace: true });
  }, [initialized, safeEntities, activeEntity, setActiveEntity, navigate]);

  const fetchData = async () => {
    if (!activeEntity) return;
    setLoading(true); setError(null);
    try {
      const range = getPeriodRange(period, customStart, customEnd);
      const { data: result, error: rpcError } = await supabase.rpc('get_dashboard_data', {
        p_role_code: activeEntity.roleCode, p_entity_id: activeEntity.entityId,
        p_start_date: range.start, p_end_date: range.end,
      });
      if (rpcError) throw rpcError;
      setData(result as DashboardData);
    } catch (err: any) { console.error(err); setError(err.message || 'Failed to load dashboard data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (activeEntity) fetchData(); }, [activeEntity?.entityId, activeEntity?.roleCode, period, customStart, customEnd]);

  const roleCode = (activeEntity?.roleCode || 'edu_specialist') as RoleCode;
  const roleIcon = ROLE_ICONS[roleCode] ?? '👤';
  const roleLabel = lang === 'ar' ? ROLE_LABELS_AR[roleCode] : ROLE_LABELS_EN[roleCode];
  const entityName = activeEntity?.entityName || '';
  const isEdcOrTech = roleCode === 'edc_viewer' || roleCode === 'tech_support';
  const isRegionManager = roleCode === 'region_manager' || roleCode === 'region_assistant';

  const periodOptions: { key: PeriodKey; labelAr: string; labelEn: string }[] = [
    { key: 'this_week', labelAr: 'هذا الأسبوع', labelEn: 'This Week' },
    { key: 'last_week', labelAr: 'الأسبوع الماضي', labelEn: 'Last Week' },
    { key: 'two_weeks_ago', labelAr: 'قبل أسبوعين', labelEn: '2 Weeks Ago' },
    { key: 'custom', labelAr: 'مخصص', labelEn: 'Custom' },
  ];

  const colorMap: Record<string, string> = {
    primary: 'var(--color-primary)', info: 'var(--color-info)',
    warning: 'var(--color-warning)', success: 'var(--color-success)', danger: 'var(--color-danger)',
  };

  const filterGroups = (groups: GroupedRow[] | undefined, query: string) => {
    if (!groups) return [];
    const safe = groups.map(g => ({ regionName: g.regionName, entities: Array.isArray(g.entities) ? g.entities : [] })).filter(g => g.entities.length > 0);
    if (!query.trim()) return safe;
    const q = query.toLowerCase();
    return safe.map(g => ({ regionName: g.regionName, entities: g.entities.filter(e => e.name.toLowerCase().includes(q)) })).filter(g => g.entities.length > 0);
  };

  const filteredSchools = useMemo(() => filterGroups(data?.schoolsData, searchSchools), [data?.schoolsData, searchSchools]);
  const filteredCenters = useMemo(() => filterGroups(data?.centersData, searchCenters), [data?.centersData, searchCenters]);

  const groupedNotVisited = useMemo(() => {
    if (!data?.notVisitedCenters?.length) return [];
    const map = new Map<string, NotVisitedCenter[]>();
    for (const c of data.notVisitedCenters) {
      if (!map.has(c.regionName)) map.set(c.regionName, []);
      map.get(c.regionName)!.push(c);
    }
    return Array.from(map.entries()).map(([regionName, centers]) => ({ regionName, centers }));
  }, [data?.notVisitedCenters]);

  const filteredNotVisited = useMemo(() => {
    const q = searchNotVisited.trim().toLowerCase();
    if (!q) return groupedNotVisited;
    return groupedNotVisited
      .map(g => ({ regionName: g.regionName, centers: g.centers.filter(c => c.nameAr.toLowerCase().includes(q) || (c.nameEn || '').toLowerCase().includes(q)) }))
      .filter(g => g.centers.length > 0);
  }, [groupedNotVisited, searchNotVisited]);

  const filteredSpecialists = useMemo(() => {
    if (!data?.specialistsData) return [];
    let result = data.specialistsData;
    if (searchSpecialists.trim()) {
      const q = searchSpecialists.toLowerCase();
      result = result.filter(s => s.nameAr.toLowerCase().includes(q) || (s.nameEn && s.nameEn.toLowerCase().includes(q)));
    }
    if (planFilter === 'has_plan') result = result.filter(s => s.has_plan);
    else if (planFilter === 'no_plan') result = result.filter(s => !s.has_plan);
    return result;
  }, [data?.specialistsData, searchSpecialists, planFilter]);

  const expandAllNotVisited = () => {
    const all: Record<string, boolean> = {};
    filteredNotVisited.forEach(g => { all[g.regionName] = true; });
    setExpandedRegions(prev => ({ ...prev, notVisited: all }));
  };
  const collapseAllNotVisited = () => setExpandedRegions(prev => ({ ...prev, notVisited: {} }));

  if (!initialized) return <Loading message={t('common.loading')} />;
  if (safeEntities.length === 0) return (
    <Card padding="lg" className="max-w-md mx-auto text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">{t('entity.no_entities')}</h1>
      <p className="text-[var(--color-text-secondary)] mb-6">{t('entity.contact_support')}</p>
    </Card>
  );
  if (!activeEntity) return <Loading message={t('common.loading')} />;

  const schoolManagerRows = (data?.tableData || []).filter(r => r.type === 'school');

  const exportSpecialistVisits = () => {
    if (!data?.specialistVisits?.length) return;
    downloadCSV(
      data.specialistVisits.map(s => ({ name: lang === 'ar' ? s.nameAr : s.nameEn, rl: s.rl, tls: s.tls, total: s.total })),
      [
        { key: 'name', label: lang === 'ar' ? 'المختص' : 'Specialist' },
        { key: 'rl', label: 'R.L' },
        { key: 'tls', label: 'TLS' },
        { key: 'total', label: lang === 'ar' ? 'المجموع' : 'Total' },
      ],
      lang === 'ar' ? 'زيارات_المختصين' : 'Specialist_Visits'
    );
  };

  const exportVisitedCenters = () => {
    if (!data?.visitedCenters?.length) return;
    downloadCSV(
      data.visitedCenters.map(c => ({
        name: lang === 'ar' ? c.nameAr : c.nameEn,
        region: c.regionName,
        visits: c.visits,
        specialists: (c.specialists || []).join('، '),
      })),
      [
        { key: 'name', label: lang === 'ar' ? 'المركز' : 'Center' },
        { key: 'region', label: lang === 'ar' ? 'المنطقة' : 'Region' },
        { key: 'visits', label: lang === 'ar' ? 'الزيارات' : 'Visits' },
        { key: 'specialists', label: lang === 'ar' ? 'المختصون' : 'Specialists' },
      ],
      lang === 'ar' ? 'المراكز_المزارة' : 'Visited_Centers'
    );
  };

  const exportNotVisitedCenters = () => {
    if (!data?.notVisitedCenters?.length) return;
    downloadCSV(
      data.notVisitedCenters.map(c => ({ name: lang === 'ar' ? c.nameAr : c.nameEn, region: c.regionName })),
      [
        { key: 'region', label: lang === 'ar' ? 'المنطقة' : 'Region' },
        { key: 'name', label: lang === 'ar' ? 'المركز' : 'Center' },
      ],
      lang === 'ar' ? 'المراكز_غير_المزارة' : 'Not_Visited_Centers'
    );
  };

  const exportSchoolsFromGroups = () => {
    const flat = filteredSchools.flatMap(g => g.entities.map(e => ({
      region: g.regionName,
      name: e.name,
      visits: e.visits,
      specialists: (e.specialists || []).join('، '),
    })));
    if (flat.length === 0) return;
    downloadCSV(
      flat,
      [
        { key: 'region', label: lang === 'ar' ? 'المنطقة' : 'Region' },
        { key: 'name', label: lang === 'ar' ? 'المدرسة' : 'School' },
        { key: 'visits', label: lang === 'ar' ? 'الزيارات' : 'Visits' },
        { key: 'specialists', label: lang === 'ar' ? 'المختصون' : 'Specialists' },
      ],
      lang === 'ar' ? 'تفاصيل_المدارس' : 'Schools_Details'
    );
  };

  return (
    <div className="space-y-5">
      {/* Header + Period */}
      <Card padding="lg" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1" style={{ background: 'var(--color-primary)' }} />
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold text-[var(--color-text)] mb-1">{t('auth.welcome')}، {user?.fullName} 👋</h1>
            <div className="flex items-center gap-2 flex-wrap text-sm text-[var(--color-text-secondary)]">
              <span>{lang === 'ar' ? 'أنت الآن في:' : 'You are now in:'} <strong className="text-[var(--color-text)]">{entityName}</strong></span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}>
                <span>{roleIcon}</span><span>{roleLabel}</span>
              </span>
            </div>
          </div>
          {safeEntities.length > 1 && (
            <Button variant="secondary" icon={<RefreshCw className="w-4 h-4" />} onClick={() => navigate('/select-entity')}>{t('entity.switch_entity')}</Button>
          )}
        </div>
        <div className="border-t border-[var(--color-border)] pt-5 mt-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />{lang === 'ar' ? 'الفترة:' : 'Period:'}
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {periodOptions.map((opt) => (
                <button key={opt.key} onClick={() => setPeriod(opt.key)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border"
                  style={{
                    backgroundColor: period === opt.key ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: period === opt.key ? '#fff' : 'var(--color-text-secondary)',
                    borderColor: period === opt.key ? 'var(--color-primary)' : 'var(--color-border)',
                  }}>
                  {lang === 'ar' ? opt.labelAr : opt.labelEn}
                </button>
              ))}
            </div>
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-3 flex-wrap mt-3 p-3 rounded-lg border border-dashed" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-primary)' }}>
              <label className="text-xs font-bold text-[var(--color-text-secondary)]">{lang === 'ar' ? 'من:' : 'From:'}</label>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input" style={{ maxWidth: '160px' }} />
              <label className="text-xs font-bold text-[var(--color-text-secondary)]">{lang === 'ar' ? 'إلى:' : 'To:'}</label>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input" style={{ maxWidth: '160px' }} />
            </div>
          )}
        </div>
      </Card>

      {loading && <Loading message={t('common.loading')} />}
      {error && !loading && (
        <Card padding="md" className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-[var(--color-danger)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
          <Button variant="secondary" onClick={fetchData} className="mt-3">{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</Button>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          {/* Stats: 3 بطاقات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.stats.map((stat, idx) => {
              const color = colorMap[stat.color] || 'var(--color-primary)';
              const Icon = idx === 1 ? GraduationCap : idx === 2 ? School : BarChart3;
              return (
                <Card key={idx} padding="md" className="transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[var(--color-text-muted)]">—</span>
                  </div>
                  <div className="text-3xl font-extrabold mb-1" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
                  <div className="text-sm text-[var(--color-text-secondary)] font-medium">{lang === 'ar' ? stat.labelAr : stat.labelEn}</div>
                </Card>
              );
            })}
          </div>

          {/* ============= Region Manager ============= */}
          {isRegionManager && (
            <>
              <AccordionSection
                title={lang === 'ar' ? 'ملخص زيارات المختصين' : 'Specialists Visits Summary'}
                icon={<ClipboardList className="w-5 h-5 text-purple-600" />}
                isOpen={!!expanded.specialistVisitsRM}
                onToggle={() => toggle('specialistVisitsRM')}
              >
                <div className="flex justify-end mb-3">
                  <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm" onClick={exportSpecialistVisits}>
                    {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                  </Button>
                </div>
                {(!data.specialistVisits || data.specialistVisits.length === 0) ? (
                  <div className="text-center py-6 text-[var(--color-text-muted)]">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--color-bg-secondary)]">
                        <tr>
                          <th className="text-start px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المختص' : 'Specialist'}</th>
                          <th className="text-center px-3 py-3 text-xs font-bold">🏢 TLS</th>
                          <th className="text-center px-3 py-3 text-xs font-bold">🏫 R.L</th>
                          <th className="text-center px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المجموع' : 'Total'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.specialistVisits.map((s) => (
                          <tr key={s.user_id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]">
                            <td className="px-3 py-3 font-semibold">{lang === 'ar' ? s.nameAr : s.nameEn}</td>
                            <td className="text-center px-3 py-3 font-bold" style={{ color: '#047857' }}>{s.tls}</td>
                            <td className="text-center px-3 py-3 font-bold" style={{ color: '#1d4ed8' }}>{s.rl}</td>
                            <td className="text-center px-3 py-3 font-extrabold">{s.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AccordionSection>

              <AccordionSection
                title={lang === 'ar' ? 'المراكز التي تم زيارتها' : 'Visited Centers'}
                icon={<MapPin className="w-5 h-5 text-green-600" />}
                isOpen={!!expanded.visitedCenters}
                onToggle={() => toggle('visitedCenters')}
                badge={data.visitedCenters?.length ? <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{data.visitedCenters.length}</span> : null}
              >
                <div className="flex justify-end mb-3">
                  <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm" onClick={exportVisitedCenters}>
                    {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                  </Button>
                </div>
                {(!data.visitedCenters || data.visitedCenters.length === 0) ? (
                  <div className="text-center py-6 text-[var(--color-text-muted)]">{lang === 'ar' ? 'لم تتم زيارة أي مركز في هذه الفترة' : 'No centers visited in this period'}</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--color-bg-secondary)]">
                        <tr>
                          <th className="text-start px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المركز' : 'Center'}</th>
                          <th className="text-start px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المنطقة' : 'Region'}</th>
                          <th className="text-center px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'الزيارات' : 'Visits'}</th>
                          <th className="text-start px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المختصون' : 'Specialists'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.visitedCenters.map((c) => (
                          <tr key={c.entity_id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]">
                            <td className="px-3 py-3 font-semibold">{lang === 'ar' ? c.nameAr : c.nameEn}</td>
                            <td className="px-3 py-3 text-xs text-[var(--color-text-secondary)]">{c.regionName}</td>
                            <td className="text-center px-3 py-3"><span className="inline-block px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold">{c.visits}</span></td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1">
                                {(c.specialists || []).map((sp, i) => (
                                  <span key={i} className="text-xs px-2 py-1 rounded-md bg-purple-100 text-purple-900 border border-purple-300 font-bold shadow-sm">{sp}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AccordionSection>

              <AccordionSection
                title={lang === 'ar' ? 'المراكز التي لم يتم زيارتها' : 'Not Visited Centers'}
                icon={<MapPinOff className="w-5 h-5 text-red-600" />}
                isOpen={!!expanded.notVisitedCenters}
                onToggle={() => toggle('notVisitedCenters')}
                badge={data.notVisitedCenters?.length ? <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{data.notVisitedCenters.length}</span> : null}
              >
                <NotVisitedCentersContent
                  grouped={filteredNotVisited}
                  totalCount={data.notVisitedCenters?.length || 0}
                  search={searchNotVisited}
                  setSearch={setSearchNotVisited}
                  expandedRegions={expandedRegions.notVisited}
                  toggleRegion={(name) => toggleRegion('notVisited', name)}
                  onExpandAll={expandAllNotVisited}
                  onCollapseAll={collapseAllNotVisited}
                  onExport={exportNotVisitedCenters}
                  lang={lang}
                />
              </AccordionSection>

              <AccordionSection
                title={lang === 'ar' ? 'تفاصيل المدارس' : 'Schools Details'}
                icon={<School className="w-5 h-5 text-blue-600" />}
                isOpen={!!expanded.schoolsDetails}
                onToggle={() => toggle('schoolsDetails')}
              >
                <div className="flex justify-end mb-3">
                  <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm"
                    onClick={() => downloadCSV(
                      schoolManagerRows.map(r => ({ name: lang === 'ar' ? r.name : r.nameEn, visits: r.visits ?? 0 })),
                      [{ key: 'name', label: lang === 'ar' ? 'المدرسة' : 'School' }, { key: 'visits', label: lang === 'ar' ? 'الزيارات' : 'Visits' }],
                      lang === 'ar' ? 'تفاصيل_المدارس' : 'Schools_Details'
                    )}>
                    {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                  </Button>
                </div>
                {schoolManagerRows.length === 0 ? (
                  <div className="text-center py-6 text-[var(--color-text-muted)]">{lang === 'ar' ? 'لا توجد مدارس' : 'No schools'}</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--color-bg-secondary)]">
                        <tr>
                          <th className="text-start px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المدرسة' : 'School'}</th>
                          <th className="text-center px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'الزيارات' : 'Visits'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schoolManagerRows.map((row, idx) => (
                          <tr key={idx} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]">
                            <td className="px-3 py-3 font-semibold">{lang === 'ar' ? row.name : row.nameEn}</td>
                            <td className="text-center px-3 py-3 font-bold" style={{ color: '#1d4ed8' }}>{row.visits ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AccordionSection>
            </>
          )}

          {/* ============= EDC / Tech Support ============= */}
          {isEdcOrTech && (
            <>
              <AccordionSection
                title={lang === 'ar' ? 'تفاصيل المناطق' : 'Regions Details'}
                icon={<Building2 className="w-5 h-5 text-blue-600" />}
                isOpen={!!expanded.regionsDetails}
                onToggle={() => toggle('regionsDetails')}
              >
                <div className="flex justify-end mb-3">
                  <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm"
                    onClick={() => downloadCSV(
                      data.tableData,
                      [{ key: 'name', label: lang === 'ar' ? 'المنطقة' : 'Region' }, { key: 'rl', label: 'R.L' }, { key: 'tls', label: 'TLS' }, { key: 'total', label: lang === 'ar' ? 'المجموع' : 'Total' }],
                      lang === 'ar' ? 'تفاصيل_المناطق' : 'Regions_Details'
                    )}>
                    {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--color-bg-secondary)]">
                      <tr>
                        <th className="text-start px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المنطقة' : 'Region'}</th>
                        <th className="text-center px-3 py-3 text-xs font-bold">🏫 R.L</th>
                        <th className="text-center px-3 py-3 text-xs font-bold">🏢 TLS</th>
                        <th className="text-center px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المجموع' : 'Total'}</th>
                        <th className="text-center px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'الإنجاز' : 'Achievement'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tableData.map((row, idx) => {
                        const pctColor = row.pct == null ? 'var(--color-text-muted)' : row.pct >= 80 ? 'var(--color-success)' : row.pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
                        return (
                          <tr key={idx} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]">
                            <td className="px-3 py-3 font-semibold">{lang === 'ar' ? row.name : row.nameEn}</td>
                            <td className="text-center px-3 py-3 font-bold" style={{ color: '#1d4ed8' }}>{row.rl ?? 0}</td>
                            <td className="text-center px-3 py-3 font-bold" style={{ color: '#047857' }}>{row.tls ?? 0}</td>
                            <td className="text-center px-3 py-3 font-extrabold">{row.total ?? 0}</td>
                            <td className="text-center px-3 py-3">
                              {row.pct != null ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="w-14 h-1.5 rounded-full overflow-hidden bg-[var(--color-bg-secondary)]">
                                    <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: pctColor }} />
                                  </div>
                                  <span className="text-xs font-bold" style={{ color: pctColor }}>{row.pct}%</span>
                                </div>
                              ) : <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </AccordionSection>

              <AccordionSection
                title={lang === 'ar' ? 'زيارات المختصين' : 'Specialists Visits'}
                icon={<ClipboardList className="w-5 h-5 text-purple-600" />}
                isOpen={!!expanded.specialistVisitsRM}
                onToggle={() => toggle('specialistVisitsRM')}
              >
                <div className="flex justify-end mb-3">
                  <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm" onClick={exportSpecialistVisits}>
                    {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                  </Button>
                </div>
                {(!data.specialistVisits || data.specialistVisits.length === 0) ? (
                  <div className="text-center py-6 text-[var(--color-text-muted)]">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--color-bg-secondary)]">
                        <tr>
                          <th className="text-start px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المختص' : 'Specialist'}</th>
                          <th className="text-center px-3 py-3 text-xs font-bold">🏢 TLS</th>
                          <th className="text-center px-3 py-3 text-xs font-bold">🏫 R.L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.specialistVisits.map((s) => (
                          <tr key={s.user_id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]">
                            <td className="px-3 py-3 font-semibold">{lang === 'ar' ? s.nameAr : s.nameEn}</td>
                            <td className="text-center px-3 py-3 font-bold" style={{ color: '#047857' }}>{s.tls}</td>
                            <td className="text-center px-3 py-3 font-bold" style={{ color: '#1d4ed8' }}>{s.rl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AccordionSection>

              <AccordionSection
                title={lang === 'ar' ? 'تفاصيل المراكز لكل منطقة' : 'Centers Details per Region'}
                icon={<GraduationCap className="w-5 h-5 text-green-600" />}
                isOpen={!!expanded.centersPerRegion}
                onToggle={() => toggle('centersPerRegion')}
              >
                <div className="space-y-2">
                  <Card padding="sm" className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border-none">
                    <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <input type="text" placeholder={lang === 'ar' ? 'ابحث باسم مركز...' : 'Search center...'} value={searchCenters} onChange={(e) => setSearchCenters(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm" />
                  </Card>
                  <div className="flex justify-end">
                    <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm"
                      onClick={() => {
                        const flat = (data.centersData || []).flatMap(g => (g.entities || []).map(e => ({
                          region: g.regionName, name: e.name, visits: e.visits, specialists: (e.specialists || []).join('، '),
                        })));
                        downloadCSV(flat, [
                          { key: 'region', label: lang === 'ar' ? 'المنطقة' : 'Region' },
                          { key: 'name', label: lang === 'ar' ? 'المركز' : 'Center' },
                          { key: 'visits', label: lang === 'ar' ? 'الزيارات' : 'Visits' },
                          { key: 'specialists', label: lang === 'ar' ? 'المختصون' : 'Specialists' },
                        ], lang === 'ar' ? 'تفاصيل_المراكز' : 'Centers_Details');
                      }}>
                      {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                    </Button>
                  </div>
                  {filteredCenters.length === 0 ? (
                    <p className="text-center text-sm text-[var(--color-text-muted)] py-4">
                      {lang === 'ar' ? 'لا توجد مراكز تمت زيارتها في هذه الفترة' : 'No visited centers in this period'}
                    </p>
                  ) : (
                    filteredCenters.map((group, idx) => (
                      <div key={idx} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                        <button onClick={() => toggleRegion('centers', group.regionName)} className="w-full flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] transition text-sm font-bold">
                          <span className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-500" />{group.regionName}
                            <span className="text-xs text-gray-500 font-normal bg-white px-2 py-0.5 rounded-full border">{group.entities.length} {lang === 'ar' ? 'مركز' : 'centers'}</span>
                          </span>
                          {expandedRegions.centers[group.regionName] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {expandedRegions.centers[group.regionName] && (
                          <div className="p-2 bg-[var(--color-surface)] space-y-2">
                            {group.entities.map((e, i) => (
                              <div key={i} className="flex justify-between items-center p-3 border-b last:border-0 text-sm hover:bg-[var(--color-bg-secondary)] rounded transition-colors gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-[var(--color-text)] mb-1">{e.name}</div>
                                  {e.specialists && e.specialists.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {e.specialists.map((sp, j) => (
                                        <span key={j} className="text-xs px-2 py-1 rounded-md bg-purple-100 text-purple-900 border border-purple-300 font-bold shadow-sm">{sp}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="font-bold bg-green-50 text-green-700 px-2.5 py-1 rounded-full whitespace-nowrap border border-green-200">{e.visits}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </AccordionSection>

              <AccordionSection
                title={lang === 'ar' ? 'تفاصيل المدارس' : 'Schools Details'}
                icon={<School className="w-5 h-5 text-blue-600" />}
                isOpen={!!expanded.schoolsPerRegion}
                onToggle={() => toggle('schoolsPerRegion')}
              >
                <div className="space-y-2">
                  <Card padding="sm" className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border-none">
                    <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <input type="text" placeholder={lang === 'ar' ? 'ابحث باسم مدرسة...' : 'Search school...'} value={searchSchools} onChange={(e) => setSearchSchools(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm" />
                  </Card>
                  <div className="flex justify-end">
                    <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm" onClick={exportSchoolsFromGroups}>
                      {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                    </Button>
                  </div>
                  {filteredSchools.length === 0 ? (
                    <p className="text-center text-sm text-[var(--color-text-muted)] py-4">{lang === 'ar' ? 'لا توجد مدارس' : 'No schools'}</p>
                  ) : (
                    filteredSchools.map((group, idx) => (
                      <div key={idx} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                        <button onClick={() => toggleRegion('schools', group.regionName)} className="w-full flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] transition text-sm font-bold">
                          <span className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-500" />{group.regionName}
                            <span className="text-xs text-gray-500 font-normal bg-white px-2 py-0.5 rounded-full border">{group.entities.length} {lang === 'ar' ? 'مدرسة' : 'schools'}</span>
                          </span>
                          {expandedRegions.schools[group.regionName] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {expandedRegions.schools[group.regionName] && (
                          <div className="p-2 bg-[var(--color-surface)] space-y-2">
                            {group.entities.map((e, i) => (
                              <div key={i} className="flex justify-between items-center p-3 border-b last:border-0 text-sm hover:bg-[var(--color-bg-secondary)] rounded transition-colors gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-[var(--color-text)] mb-1">{e.name}</div>
                                  {e.specialists && e.specialists.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {e.specialists.map((sp, j) => (
                                        <span key={j} className="text-xs px-2 py-1 rounded-md bg-purple-100 text-purple-900 border border-purple-300 font-bold shadow-sm">{sp}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className={`font-bold px-2.5 py-1 rounded-full whitespace-nowrap border ${e.visits > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{e.visits}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </AccordionSection>

              <AccordionSection
                title={lang === 'ar' ? 'المراكز التي لم يتم زيارتها' : 'Not Visited Centers'}
                icon={<MapPinOff className="w-5 h-5 text-red-600" />}
                isOpen={!!expanded.notVisitedCenters}
                onToggle={() => toggle('notVisitedCenters')}
                badge={data.notVisitedCenters?.length ? <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{data.notVisitedCenters.length}</span> : null}
              >
                <NotVisitedCentersContent
                  grouped={filteredNotVisited}
                  totalCount={data.notVisitedCenters?.length || 0}
                  search={searchNotVisited}
                  setSearch={setSearchNotVisited}
                  expandedRegions={expandedRegions.notVisited}
                  toggleRegion={(name) => toggleRegion('notVisited', name)}
                  onExpandAll={expandAllNotVisited}
                  onCollapseAll={collapseAllNotVisited}
                  onExport={exportNotVisitedCenters}
                  lang={lang}
                />
              </AccordionSection>
            </>
          )}

          {/* ⭐ خطط المختصين — محمية بالصلاحية مع حالة التحميل */}
          {!permLoading && canViewSpecialistPlans && data.specialistsData && data.specialistsData.length > 0 && (
            <AccordionSection
              title={lang === 'ar' ? 'خطط المختصين' : 'Specialists Plans'}
              icon={<Users className="w-5 h-5 text-purple-600" />}
              isOpen={!!expanded.specialistPlans}
              onToggle={() => toggle('specialistPlans')}
            >
              <SpecialistsTableContent
                specialists={data.specialistsData}
                filteredSpecialists={filteredSpecialists}
                searchSpecialists={searchSpecialists}
                setSearchSpecialists={setSearchSpecialists}
                planFilter={planFilter}
                setPlanFilter={setPlanFilter}
                lang={lang}
              />
            </AccordionSection>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// NotVisitedCentersContent — عرض مُحسَّن لقائمة المراكز الطويلة
// ═══════════════════════════════════════════════════════════════════════
function NotVisitedCentersContent({
  grouped, totalCount, search, setSearch, expandedRegions, toggleRegion,
  onExpandAll, onCollapseAll, onExport, lang,
}: {
  grouped: { regionName: string; centers: NotVisitedCenter[] }[];
  totalCount: number;
  search: string;
  setSearch: (v: string) => void;
  expandedRegions: Record<string, boolean>;
  toggleRegion: (regionName: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExport: () => void;
  lang: 'ar' | 'en';
}) {
  const totalFiltered = grouped.reduce((sum, g) => sum + g.centers.length, 0);

  if (totalCount === 0) {
    return (
      <div className="text-center py-6 text-[var(--color-success)] font-bold">
        ✅ {lang === 'ar' ? 'جميع المراكز تمت زيارتها' : 'All centers have been visited'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2.5 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'var(--color-danger)' }}>
        <MapPinOff className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
        <div className="flex-1">
          <div className="text-sm font-bold" style={{ color: 'var(--color-danger)' }}>
            {totalCount} {lang === 'ar' ? 'مركز لم تتم زيارتها' : 'centers not visited'}
            {` — ${lang === 'ar' ? 'في' : 'in'} ${grouped.length} ${lang === 'ar' ? 'منطقة' : 'regions'}`}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)]">
            {lang === 'ar' ? 'مرتبة حسب المنطقة' : 'Sorted by region'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Card padding="sm" className="flex items-center gap-2 flex-1 min-w-[200px] bg-[var(--color-bg-secondary)] border-none">
          <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
          <input type="text" placeholder={lang === 'ar' ? 'ابحث باسم مركز...' : 'Search center...'} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm" />
        </Card>
        <Button variant="secondary" size="sm" icon={<Maximize2 className="w-3.5 h-3.5" />} onClick={onExpandAll}>
          {lang === 'ar' ? 'فتح الكل' : 'Expand All'}
        </Button>
        <Button variant="secondary" size="sm" icon={<Minimize2 className="w-3.5 h-3.5" />} onClick={onCollapseAll}>
          {lang === 'ar' ? 'إغلاق الكل' : 'Collapse All'}
        </Button>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm" onClick={onExport}>
          {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
        </Button>
      </div>

      {totalFiltered === 0 ? (
        <p className="text-center text-sm text-[var(--color-text-muted)] py-4">
          {lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results'}
        </p>
      ) : (
        <div className="space-y-2">
          {grouped.map((group) => (
            <div key={group.regionName} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <button onClick={() => toggleRegion(group.regionName)} className="w-full flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] transition text-sm font-bold">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  {group.regionName}
                  <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    {group.centers.length}
                  </span>
                </span>
                {expandedRegions[group.regionName] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedRegions[group.regionName] && (
                <div className="p-2 bg-[var(--color-surface)] space-y-1">
                  {group.centers.map((c) => (
                    <div key={c.entity_id} className="flex justify-between items-center p-3 border-b last:border-0 text-sm hover:bg-[var(--color-bg-secondary)] rounded transition-colors">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--color-text)]">{lang === 'ar' ? c.nameAr : c.nameEn}</span>
                        {/* ✅ إظهار اسم المنطقة صراحة داخل الصف */}
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300 font-bold">
                          📍 {c.regionName}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold whitespace-nowrap">
                        {lang === 'ar' ? 'لم تُزَر' : 'Not visited'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SpecialistsTableContent
// ═══════════════════════════════════════════════════════════════════════
function SpecialistsTableContent({
  specialists, filteredSpecialists, searchSpecialists, setSearchSpecialists,
  planFilter, setPlanFilter, lang,
}: {
  specialists: SpecialistRow[];
  filteredSpecialists: SpecialistRow[];
  searchSpecialists: string;
  setSearchSpecialists: (v: string) => void;
  planFilter: 'all' | 'has_plan' | 'no_plan';
  setPlanFilter: (v: 'all' | 'has_plan' | 'no_plan') => void;
  lang: 'ar' | 'en';
}) {
  return (
    <div>
      <Card padding="sm" className="flex items-center gap-2 mb-4 bg-[var(--color-bg-secondary)] border-none">
        <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
        <input type="text" placeholder={lang === 'ar' ? 'ابحث باسم مختص...' : 'Search specialist...'} value={searchSpecialists} onChange={(e) => setSearchSpecialists(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm" />
      </Card>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setPlanFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${planFilter === 'all' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}>
            {lang === 'ar' ? 'الكل' : 'All'} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${planFilter === 'all' ? 'bg-white/20' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>{specialists.length}</span>
          </button>
          <button onClick={() => setPlanFilter('has_plan')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${planFilter === 'has_plan' ? 'bg-[var(--color-success)] text-white shadow-md' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}>
            {lang === 'ar' ? 'تم تعبئة الخطة' : 'Has Plan'} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${planFilter === 'has_plan' ? 'bg-white/20' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>{specialists.filter(s => s.has_plan).length}</span>
          </button>
          <button onClick={() => setPlanFilter('no_plan')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${planFilter === 'no_plan' ? 'bg-[var(--color-danger)] text-white shadow-md' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}>
            {lang === 'ar' ? 'لم يتم تعبئة الخطة' : 'No Plan'} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${planFilter === 'no_plan' ? 'bg-white/20' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>{specialists.filter(s => !s.has_plan).length}</span>
          </button>
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm" onClick={() => downloadCSV(filteredSpecialists, [{ key: 'nameAr', label: lang === 'ar' ? 'المختص' : 'Specialist' }, { key: 'rl_actual', label: 'R.L (منفذ)' }, { key: 'rl_planned', label: 'R.L (مخطط)' }, { key: 'tls_actual', label: 'TLS (منفذ)' }, { key: 'tls_planned', label: 'TLS (مخطط)' }, { key: 'pct', label: lang === 'ar' ? 'الإنجاز' : 'Pct' }], lang === 'ar' ? 'خطط_المختصين' : 'Specialists_Plans')}>
          {lang === 'ar' ? 'تصدير' : 'Export'}
        </Button>
      </div>
      {(() => {
        const inactive = filteredSpecialists.filter((s) => s.rl_actual === 0 && s.tls_actual === 0);
        if (inactive.length > 0) {
          return (
            <div className="flex items-start gap-2.5 p-3 rounded-lg mb-3 border" style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'var(--color-danger)' }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-danger)' }} />
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--color-danger)' }}>{inactive.length} {lang === 'ar' ? 'مختص لم يقم بأي زيارة' : 'specialists have not visited'}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">{inactive.map((s) => lang === 'ar' ? s.nameAr : s.nameEn).join('، ')}</div>
              </div>
            </div>
          );
        }
        return null;
      })()}
      {filteredSpecialists.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text-muted)]">{lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No results'}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="text-start px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المختص' : 'Specialist'}</th>
                <th className="text-center px-3 py-3 text-xs font-bold">🏫 R.L (مخطط/منفذ)</th>
                <th className="text-center px-3 py-3 text-xs font-bold">🏢 TLS (مخطط/منفذ)</th>
                <th className="text-center px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'الإنجاز' : 'Achievement'}</th>
                <th className="text-start px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'آخر زيارة' : 'Last Visit'}</th>
                <th className="text-center px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpecialists.map((s) => {
                const statusConfig = {
                  active: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: lang === 'ar' ? '✅ نشط' : '✅ Active' },
                  warning: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: lang === 'ar' ? '⚠️ متأخر' : '⚠️ Late' },
                  danger: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: lang === 'ar' ? '🚨 لم يزور' : '🚨 Not Visited' },
                }[s.status];
                return (
                  <tr key={s.user_id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]">
                    <td className="px-3 py-3">
                      <div className="font-semibold">{lang === 'ar' ? s.nameAr : s.nameEn}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">{lang === 'ar' ? s.specAr : s.specEn}</div>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{s.rl_actual}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}> / {s.rl_planned || '—'}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span style={{ color: '#047857', fontWeight: 700 }}>{s.tls_actual}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}> / {s.tls_planned || '—'}</span>
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="font-bold text-xs" style={{ color: s.pct == null ? 'var(--color-text-muted)' : s.pct >= 80 ? 'var(--color-success)' : s.pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                        {s.pct != null ? `${s.pct}%` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-[var(--color-text-secondary)]">{lang === 'ar' ? s.lastVisitAr : s.lastVisitEn}</td>
                    <td className="text-center px-3 py-3">
                      <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold" style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>{statusConfig.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}