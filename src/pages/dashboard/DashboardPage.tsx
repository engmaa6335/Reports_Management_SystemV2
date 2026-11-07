import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Calendar, FileText, Users, Download,
  AlertTriangle, BarChart3, Building2, ChevronDown, ChevronUp, School, GraduationCap, Search
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
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
  name: string; nameEn: string; type: 'rl' | 'tls' | 'region'; rl?: number; tls?: number; visits?: number; total?: number; planned?: number; pct?: number | null;
}
interface GroupedRow { regionName: string; entities: { name: string; visits: number }[] | null; }
interface SpecialistRow {
  user_id: string; nameAr: string; nameEn: string; specAr: string; specEn: string;
  rl_planned: number; rl_actual: number; tls_planned: number; tls_actual: number;
  total_planned: number; total_actual: number; pct: number | null; status: 'active' | 'warning' | 'danger';
  lastVisitAr: string; lastVisitEn: string; has_plan: boolean;
}
interface DashboardData { stats: StatItem[]; tableData: TableRow[]; schoolsData?: GroupedRow[]; centersData?: GroupedRow[]; specialistsData: SpecialistRow[]; }

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

// ═══════════════════════════════════════════════════════════
// Helper: التصدير إلى CSV (Excel)
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════
function getPeriodRange(period: PeriodKey, customStart: string, customEnd: string) {
  const today = new Date();
  // بداية الأسبوع: السبت
  const dayOfWeek = today.getDay(); // 0=الأحد, 6=السبت
  // نريد أن يكون السبت هو بداية الأسبوع (offset = 6)
  const daysToSaturday = (dayOfWeek + 1) % 7; // 6 إذا كان اليوم سبت، 0 إذا كان أحد... إلخ
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysToSaturday); // السبت
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
    default: start = new Date(startOfWeek);
  }
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════
export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeEntity, availableEntities, initialized, loadUserEntities, setActiveEntity } = useEntityStore();

  const lang = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en';
  const safeEntities = availableEntities ?? [];

  const [period, setPeriod] = useState<PeriodKey>('this_week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchSchools, setSearchSchools] = useState('');
  const [searchCenters, setSearchCenters] = useState('');
  const [searchSpecialists, setSearchSpecialists] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'has_plan' | 'no_plan'>('all');

  const [expandedSections, setExpandedSections] = useState<{ schools: boolean; centers: boolean; specialists: boolean }>({
    schools: false, centers: false, specialists: false,
  });
  const [expandedRegions, setExpandedRegions] = useState<{ schools: Record<string, boolean>; centers: Record<string, boolean> }>({
    schools: {}, centers: {},
  });

  const toggleSection = (section: 'schools' | 'centers' | 'specialists') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  const toggleRegion = (type: 'schools' | 'centers', regionName: string) => {
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
    } catch (err: any) { console.error(err); setError(err.message || 'Failed to load dashboard data'); } finally { setLoading(false); }
  };

  useEffect(() => { if (activeEntity) fetchData(); }, [activeEntity?.entityId, activeEntity?.roleCode, period, customStart, customEnd]);

  const roleCode = (activeEntity?.roleCode || 'edu_specialist') as RoleCode;
  const roleIcon = ROLE_ICONS[roleCode] ?? '👤';
  const roleLabel = lang === 'ar' ? ROLE_LABELS_AR[roleCode] : ROLE_LABELS_EN[roleCode];
  const entityName = activeEntity?.entityName || '';
  const isEdcOrTech = roleCode === 'edc_viewer' || roleCode === 'tech_support';
  const isRegionManager = roleCode === 'region_manager';

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
    const safeGroups = groups.map(g => ({ regionName: g.regionName, entities: Array.isArray(g.entities) ? g.entities : [] })).filter(g => g.entities.length > 0);
    if (!query.trim()) return safeGroups;
    const q = query.toLowerCase();
    return safeGroups.map(g => ({ regionName: g.regionName, entities: g.entities.filter(e => e.name.toLowerCase().includes(q)) })).filter(g => g.entities.length > 0);
  };

  const filteredSchools = useMemo(() => filterGroups(data?.schoolsData, searchSchools), [data?.schoolsData, searchSchools]);
  const filteredCenters = useMemo(() => filterGroups(data?.centersData, searchCenters), [data?.centersData, searchCenters]);

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

  if (!initialized) return <Loading message={t('common.loading')} />;
  if (safeEntities.length === 0) return (
    <Card padding="lg" className="max-w-md mx-auto text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">{t('entity.no_entities')}</h1>
      <p className="text-[var(--color-text-secondary)] mb-6">{t('entity.contact_support')}</p>
    </Card>
  );
  if (!activeEntity) return <Loading message={t('common.loading')} />;

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
                  }}
                >
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
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.stats.map((stat, idx) => {
              const color = colorMap[stat.color] || 'var(--color-primary)';
              return (
                <Card key={idx} padding="md" className="transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold" style={{ color: stat.trendType === 'up' ? 'var(--color-success)' : stat.trendType === 'down' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {stat.trendType === 'up' ? '▲' : stat.trendType === 'down' ? '▼' : '—'} {stat.trend}
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold mb-1" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
                  <div className="text-sm text-[var(--color-text-secondary)] font-medium">{lang === 'ar' ? stat.labelAr : stat.labelEn}</div>
                  {stat.breakdown && (
                    <div className="flex gap-3 mt-2 text-[11px]">
                      <span style={{ color: '#1d4ed8', fontWeight: 700 }}>🏫 {stat.breakdown.rl} R.L</span>
                      <span style={{ color: '#047857', fontWeight: 700 }}>🏢 {stat.breakdown.tls} TLS</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* 1. جدول المختصين — يظهر أولاً لمدير المنطقة */}
          {isRegionManager && data.specialistsData && data.specialistsData.length > 0 && (
            <Card padding="md">
              <button onClick={() => toggleSection('specialists')} className="w-full flex items-center justify-between p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold">{lang === 'ar' ? 'خطط المختصين' : 'Specialists Plans'}</h3>
                </div>
                {expandedSections.specialists ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.specialists && (
                <div className="mt-4">
                  <SpecialistsTableContent
                    specialists={data.specialistsData}
                    filteredSpecialists={filteredSpecialists}
                    searchSpecialists={searchSpecialists}
                    setSearchSpecialists={setSearchSpecialists}
                    planFilter={planFilter}
                    setPlanFilter={setPlanFilter}
                    lang={lang}
                  />
                </div>
              )}
            </Card>
          )}

          {/* 2. Regions Table (للدعم والمركز فقط) */}
          {isEdcOrTech && data.tableData && data.tableData.length > 0 && (
            <Card padding="lg">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Building2 className="w-4 h-4" />{lang === 'ar' ? 'تفاصيل المناطق' : 'Regions Details'}
                </h3>
                <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={() => downloadCSV(data.tableData, [{ key: 'name', label: lang === 'ar' ? 'المنطقة' : 'Region' }, { key: 'rl', label: 'R.L' }, { key: 'tls', label: 'TLS' }, { key: 'total', label: lang === 'ar' ? 'المجموع' : 'Total' }], lang === 'ar' ? 'تفاصيل_المناطق' : 'Regions_Details')}>
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
            </Card>
          )}

          {/* 3. Schools Collapsible */}
          {isEdcOrTech && (
            <Card padding="md">
              <button onClick={() => toggleSection('schools')} className="w-full flex items-center justify-between p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
                <div className="flex items-center gap-2"><School className="w-5 h-5 text-blue-600" /><h3 className="text-lg font-bold">{lang === 'ar' ? 'تفاصيل المدارس' : 'Schools Details'}</h3></div>
                {expandedSections.schools ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.schools && (
                <div className="mt-4 space-y-2">
                  <Card padding="sm" className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border-none">
                    <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <input type="text" placeholder={lang === 'ar' ? 'ابحث باسم مدرسة...' : 'Search school...'} value={searchSchools} onChange={(e) => setSearchSchools(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm" />
                  </Card>
                  <div className="flex justify-end mb-2">
                    <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm" onClick={() => downloadCSV(filteredSchools.flatMap(g => g.entities), [{ key: 'name', label: lang === 'ar' ? 'المدرسة' : 'School' }, { key: 'visits', label: lang === 'ar' ? 'الزيارات' : 'Visits' }], lang === 'ar' ? 'تفاصيل_المدارس' : 'Schools_Details')}>
                      {lang === 'ar' ? 'تصدير' : 'Export'}
                    </Button>
                  </div>
                  {filteredSchools.length === 0 ? (<p className="text-center text-sm text-gray-500 py-4">لا توجد نتائج</p>) : (
                    filteredSchools.map((group, idx) => (
                      <div key={idx} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                        <button onClick={() => toggleRegion('schools', group.regionName)} className="w-full flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] transition text-sm font-bold">
                          <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-500" />{group.regionName}<span className="text-xs text-gray-500 font-normal bg-white px-2 py-0.5 rounded-full border">{group.entities.length} مدرسة</span></span>
                          {expandedRegions.schools[group.regionName] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {expandedRegions.schools[group.regionName] && (
                          <div className="p-2 space-y-1 bg-[var(--color-surface)]">
                            {group.entities.map((e, i) => (<div key={i} className="flex justify-between items-center p-2 border-b last:border-0 text-sm hover:bg-[var(--color-bg-secondary)] rounded"><span>{e.name}</span><span className="font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{e.visits}</span></div>))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          )}

          {/* 4. Centers Collapsible */}
          {isEdcOrTech && (
            <Card padding="md">
              <button onClick={() => toggleSection('centers')} className="w-full flex items-center justify-between p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
                <div className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-green-600" /><h3 className="text-lg font-bold">{lang === 'ar' ? 'تفاصيل المراكز (TLS)' : 'Centers Details (TLS)'}</h3></div>
                {expandedSections.centers ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.centers && (
                <div className="mt-4 space-y-2">
                  <Card padding="sm" className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border-none">
                    <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <input type="text" placeholder={lang === 'ar' ? 'ابحث باسم مركز...' : 'Search center...'} value={searchCenters} onChange={(e) => setSearchCenters(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm" />
                  </Card>
                  <div className="flex justify-end mb-2">
                    <Button variant="secondary" icon={<Download className="w-4 h-4" />} size="sm" onClick={() => downloadCSV(filteredCenters.flatMap(g => g.entities), [{ key: 'name', label: lang === 'ar' ? 'المركز' : 'Center' }, { key: 'visits', label: lang === 'ar' ? 'الزيارات' : 'Visits' }], lang === 'ar' ? 'تفاصيل_المراكز' : 'Centers_Details')}>
                      {lang === 'ar' ? 'تصدير' : 'Export'}
                    </Button>
                  </div>
                  {filteredCenters.length === 0 ? (<p className="text-center text-sm text-gray-500 py-4">لا توجد نتائج</p>) : (
                    filteredCenters.map((group, idx) => (
                      <div key={idx} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                        <button onClick={() => toggleRegion('centers', group.regionName)} className="w-full flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] transition text-sm font-bold">
                          <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-500" />{group.regionName}<span className="text-xs text-gray-500 font-normal bg-white px-2 py-0.5 rounded-full border">{group.entities.length} مركز</span></span>
                          {expandedRegions.centers[group.regionName] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {expandedRegions.centers[group.regionName] && (
                          <div className="p-2 space-y-1 bg-[var(--color-surface)]">
                            {group.entities.map((e, i) => (<div key={i} className="flex justify-between items-center p-2 border-b last:border-0 text-sm hover:bg-[var(--color-bg-secondary)] rounded"><span>{e.name}</span><span className="font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{e.visits}</span></div>))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          )}

          {/* 5. Region Manager Table (Flat List) - للمدير فقط */}
          {isRegionManager && data.tableData && data.tableData.length > 0 && (
            <Card padding="lg">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2"><FileText className="w-4 h-4" />{lang === 'ar' ? 'تفاصيل المدارس والمراكز' : 'Schools & Centers Details'}</h3>
                <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={() => downloadCSV(data.tableData, [{ key: 'name', label: lang === 'ar' ? 'المدرسة/المركز' : 'Entity' }, { key: 'type', label: lang === 'ar' ? 'النوع' : 'Type' }, { key: 'visits', label: lang === 'ar' ? 'الزيارات' : 'Visits' }], lang === 'ar' ? 'تفاصيل_المدارس_والمراكز' : 'Schools_Centers')}>
                  {lang === 'ar' ? 'تصدير Excel' : 'Export Excel'}
                </Button>
              </div>
              <Card padding="sm" className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-[var(--color-text-muted)]" />
                <input type="text" placeholder={lang === 'ar' ? 'ابحث باسم مدرسة أو مركز...' : 'Search...'} value={searchSchools} onChange={(e) => setSearchSchools(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm" />
              </Card>
              <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-bg-secondary)]">
                    <tr>
                      <th className="text-start px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'المدرسة / المركز' : 'School / Center'}</th>
                      <th className="text-center px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                      <th className="text-center px-3 py-3 text-xs font-bold">{lang === 'ar' ? 'الزيارات' : 'Visits'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tableData.filter(r => r.name.toLowerCase().includes(searchSchools.toLowerCase())).map((row, idx) => (
                      <tr key={idx} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]">
                        <td className="px-3 py-3 font-semibold">{lang === 'ar' ? row.name : row.nameEn}</td>
                        <td className="text-center px-3 py-3"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: row.type === 'tls' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: row.type === 'tls' ? '#047857' : '#1d4ed8' }}>{row.type === 'tls' ? '🏢 TLS' : '🏫 R.L'}</span></td>
                        <td className="text-center px-3 py-3 font-bold">{row.visits ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* 6. جدول المختصين — يظهر أخيراً للدعم والمركز */}
          {isEdcOrTech && data.specialistsData && data.specialistsData.length > 0 && (
            <Card padding="md">
              <button onClick={() => toggleSection('specialists')} className="w-full flex items-center justify-between p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
                <div className="flex items-center gap-2"><Users className="w-5 h-5 text-purple-600" /><h3 className="text-lg font-bold">{lang === 'ar' ? 'خطط المختصين' : 'Specialists Plans'}</h3></div>
                {expandedSections.specialists ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.specialists && (
                <div className="mt-4">
                  <SpecialistsTableContent
                    specialists={data.specialistsData}
                    filteredSpecialists={filteredSpecialists}
                    searchSpecialists={searchSpecialists}
                    setSearchSpecialists={setSearchSpecialists}
                    planFilter={planFilter}
                    setPlanFilter={setPlanFilter}
                    lang={lang}
                  />
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Component: SpecialistsTableContent
// ═══════════════════════════════════════════════════════════════════════
function SpecialistsTableContent({
  specialists,
  filteredSpecialists,
  searchSpecialists,
  setSearchSpecialists,
  planFilter,
  setPlanFilter,
  lang,
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
              {filteredSpecialists.map((s, idx) => {
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