// src/pages/plans/VisitPlansPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Save, Send, AlertTriangle, CheckCircle, Clock, MessageSquare,
  FileEdit, Users, Search, Trash2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { usePlansStore } from '../../stores/plans-store';
import { Button, Card, Loading } from '../../components/ui';
import { PlanReviewModal } from './PlanReviewModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../lib/toast';

const STATUS_LABEL: Record<string, { ar: string; en: string; color: string; bg: string }> = {
  draft: { ar: 'مسودة', en: 'Draft', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  submitted: { ar: 'بانتظار الاعتماد', en: 'Submitted', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  approved: { ar: 'معتمدة', en: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  needs_revision: { ar: 'تحتاج تعديل', en: 'Needs Revision', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
};

// ═══════════════════════════════════════════════════════════════════════
// ⭐ Helper: الحصول على نطاق الأسبوع (السبت إلى الجمعة) بالتوقيت المحلي
// ═══════════════════════════════════════════════════════════════════════
function getWeekRange(offsetWeeks = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=الأحد, 5=الجمعة, 6=السبت
  const daysToSaturday = (dayOfWeek + 1) % 7;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysToSaturday + (offsetWeeks * 7));
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // الجمعة

  // ⭐ إصلاح: تنسيق التاريخ محلياً بدون toISOString (لتجنب فرق التوقيت)
  const formatLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return { start: formatLocal(startOfWeek), end: formatLocal(endOfWeek) };
}

// ═══════════════════════════════════════════════════════════════════════
// EntitySelector
// ═══════════════════════════════════════════════════════════════════════
function EntitySelector({
  entities, selectedIds, onChange, disabled, lang, loading,
}: {
  entities: any[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  lang: 'ar' | 'en';
  loading?: boolean;
}) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'school' | 'tls_center'>('all');
  const [search, setSearch] = useState('');

  const filteredEntities = useMemo(() => {
    let result = entities;
    if (typeFilter !== 'all') result = result.filter((e) => e.type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) => (e.nameAr || '').toLowerCase().includes(q) || (e.nameEn || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [entities, typeFilter, search]);

  const toggleEntity = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  const schoolsCount = entities.filter((e) => e.type === 'school').length;
  const tlsCount = entities.filter((e) => e.type === 'tls_center').length;

  if (loading) return <div className="p-4 text-center text-xs">جاري التحميل...</div>;
  if (entities.length === 0) return (
    <div className="p-4 text-center text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.08)', color: 'var(--color-warning)' }}>
      ⚠️ {lang === 'ar' ? 'لا توجد مدارس/مراكز' : 'No schools/centers'}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${typeFilter === 'all' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-secondary)]'}`}>
          {lang === 'ar' ? `الكل (${entities.length})` : `All (${entities.length})`}
        </button>
        <button type="button" onClick={() => setTypeFilter('school')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${typeFilter === 'school' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}>
          🏫 {lang === 'ar' ? 'مدارس' : 'Schools'} ({schoolsCount})
        </button>
        <button type="button" onClick={() => setTypeFilter('tls_center')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${typeFilter === 'tls_center' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700'}`}>
          🏢 TLS ({tlsCount})
        </button>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-[var(--color-text-muted)]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === 'ar' ? 'ابحث...' : 'Search...'} className="input w-full ps-9" />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span>🎯 {selectedIds.length} {lang === 'ar' ? 'محدد' : 'selected'}</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => {
            const ids = filteredEntities.map((e) => e.id);
            onChange(Array.from(new Set([...selectedIds, ...ids])));
          }} disabled={disabled || filteredEntities.length === 0}
            className="font-bold text-[var(--color-primary)] hover:underline disabled:opacity-40">
            {lang === 'ar' ? `تحديد (${filteredEntities.length})` : `Select (${filteredEntities.length})`}
          </button>
          <button type="button" onClick={() => onChange([])} disabled={disabled || selectedIds.length === 0}
            className="font-bold text-[var(--color-danger)] hover:underline disabled:opacity-40">
            {lang === 'ar' ? 'إلغاء' : 'Clear'}
          </button>
        </div>
      </div>

      <div className="border border-[var(--color-border)] rounded-lg p-2 max-h-64 overflow-y-auto" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        {filteredEntities.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
            {lang === 'ar' ? 'لا توجد نتائج' : 'No results'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredEntities.map((entity) => {
              const isSelected = selectedIds.includes(entity.id);
              return (
                <label key={entity.id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer ${isSelected ? 'bg-[var(--color-primary)]/15' : 'hover:bg-[var(--color-surface)]'}`}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleEntity(entity.id)}
                    disabled={disabled} className="w-4 h-4" />
                  <span className="text-sm flex-1 truncate">{lang === 'ar' ? entity.nameAr : entity.nameEn}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${entity.type === 'tls_center' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {entity.type === 'tls_center' ? '🏢 TLS' : '🏫 R.L'}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PlanCard
// ═══════════════════════════════════════════════════════════════════════
function PlanCard({
  plan, lang, canApprove, canDelete, entitiesMap, onReview, onDelete,
}: {
  plan: any;
  lang: 'ar' | 'en';
  canApprove: boolean;
  canDelete: boolean;
  entitiesMap: Record<string, any>;
  onReview: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const status = plan.status ? STATUS_LABEL[plan.status] : null;
  const hasPlan = Boolean(plan.plan_id);

  const entityNames: string[] = Array.isArray(plan.entity_ids)
    ? plan.entity_ids
        .map((id: string) => entitiesMap[id])
        .filter((e: any) => Boolean(e))
        .map((e: any) => String(lang === 'ar' ? e.nameAr : e.nameEn))
    : [];

  const [showAllSchools, setShowAllSchools] = useState(false);
  const displaySchools: string[] = showAllSchools ? entityNames : entityNames.slice(0, 3);

  return (
    <div className="p-4 rounded-xl border border-[var(--color-border)]"
      style={{ backgroundColor: 'var(--color-surface)' }}>

      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[var(--color-text)] truncate">{plan.nameAr}</div>
          <div className="text-xs text-[var(--color-text-muted)]">{plan.specAr}</div>
          {plan.employee_number && (
            <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">#{plan.employee_number}</div>
          )}
        </div>
        {status ? (
          <span className="text-[10px] font-bold px-2 py-1 rounded"
            style={{ backgroundColor: status.bg, color: status.color }}>
            {lang === 'ar' ? status.ar : status.en}
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-1 rounded"
            style={{ backgroundColor: 'rgba(156,163,175,0.15)', color: '#9ca3af' }}>
            {lang === 'ar' ? 'لم ينشئ' : 'No Plan'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 my-3 text-center text-xs">
        <div><div className="text-[#1d4ed8] font-bold text-base">{plan.rl_planned ?? 0}</div><div>R.L</div></div>
        <div><div className="text-[#047857] font-bold text-base">{plan.tls_planned ?? 0}</div><div>TLS</div></div>
        <div><div className="font-bold text-base">{plan.target_total_visits ?? 0}</div><div>{lang === 'ar' ? 'المجموع' : 'Total'}</div></div>
      </div>

      {entityNames.length > 0 && (
        <div className="mb-3 p-2 rounded" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="text-[10px] font-bold text-[var(--color-text-secondary)] mb-1">
            🎯 {lang === 'ar' ? 'المدارس المستهدفة' : 'Target Schools'} ({entityNames.length}):
          </div>
          <ul className="text-[11px] text-[var(--color-text)] space-y-0.5">
            {displaySchools.map((name: string, i: number) => (
              <li key={i} className="flex items-center gap-1">
                <span className="text-[var(--color-primary)]">•</span>
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>
          {entityNames.length > 3 && (
            <button
              onClick={() => setShowAllSchools(!showAllSchools)}
              className="text-[10px] font-bold text-[var(--color-primary)] hover:underline mt-1"
            >
              {showAllSchools
                ? (lang === 'ar' ? 'عرض أقل' : 'Show less')
                : (lang === 'ar' ? `+ عرض ${entityNames.length - 3} أخرى` : `+ Show ${entityNames.length - 3} more`)}
            </button>
          )}
        </div>
      )}

      {plan.last_review_note && (
        <div className="text-xs p-2 rounded mb-2" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
          💬 {plan.last_review_note}
        </div>
      )}

      <div className="flex gap-2">
        {canApprove && hasPlan && plan.status !== 'approved' && (
          <Button variant="primary" size="sm" icon={<MessageSquare className="w-3.5 h-3.5" />}
            onClick={() => onReview(plan.plan_id!, plan.nameAr)} className="flex-1">
            {lang === 'ar' ? 'مراجعة' : 'Review'}
          </Button>
        )}
        {canDelete && hasPlan && (
          <Button variant="secondary" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => onDelete(plan.plan_id!, plan.nameAr)} className="text-[var(--color-danger)]">
            {lang === 'ar' ? 'حذف' : 'Delete'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// VisitPlansPage
// ═══════════════════════════════════════════════════════════════════════
export function VisitPlansPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const { user } = useAuthStore();
  const { activeEntity, availableEntities, setActiveEntity } = useEntityStore();

  const store = usePlansStore();
  const plans = Array.isArray(store.plans) ? store.plans : [];
  const entities = Array.isArray(store.entities) ? store.entities : [];
  const entitiesMap = store.entitiesMap || {};
  const regions = Array.isArray(store.regions) ? store.regions : [];
  const filters = store.filters || {};
  const loading = Boolean(store.loading);
  const loadingEntities = Boolean(store.loadingEntities);
  const loadingRegions = Boolean(store.loadingRegions);
  const saving = Boolean(store.saving);
  const error = store.error;
  const {
    loadPlans, loadEntities, loadRegions, setFilters,
    upsertMyPlan, reviewPlan, deletePlan, clearError,
  } = store;

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // ⭐ الحقول كـ string للسماح بأن تكون فارغة (null)
  const [rlValue, setRlValue] = useState<string>('');
  const [tlsValue, setTlsValue] = useState<string>('');
  const [notesValue, setNotesValue] = useState('');

  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string } | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const [planFilter, setPlanFilter] = useState<'all' | 'has_plan' | 'no_plan'>('all');

  const role = activeEntity?.roleCode || '';
  const isSpecialist = role === 'edu_specialist';
  const isAdminViewer = role === 'edc_viewer' || role === 'tech_support';
  const canReview = ['region_manager', 'region_assistant', 'edc_viewer', 'tech_support'].includes(role);
  const canApprove = ['region_manager', 'edc_viewer'].includes(role);
  const canDelete = role === 'tech_support';

  const myPlan = useMemo(() => {
    if (!isSpecialist || !user?.id) return null;
    if (plans.length === 0) return null;
    const found = plans.find((p: any) =>
      p && typeof p === 'object' && p.user_id && String(p.user_id) === String(user.id)
    );
    return found || null;
  }, [plans, isSpecialist, user?.id]);

  const canEdit: boolean = useMemo(() => {
    if (!myPlan) return true;
    if (typeof myPlan !== 'object') return true;
    const plan = myPlan as any;
    if (!plan.plan_id) return true;
    if (!plan.status) return true;
    if (plan.status === 'draft' || plan.status === 'needs_revision') return true;
    return false;
  }, [myPlan]);

  // ⭐ مزامنة القيم (إذا كانت 0 نعرضها فارغة)
  useEffect(() => {
    if (myPlan && typeof myPlan === 'object') {
      const plan = myPlan as any;
      setRlValue(plan.rl_planned && plan.rl_planned !== 0 ? String(plan.rl_planned) : '');
      setTlsValue(plan.tls_planned && plan.tls_planned !== 0 ? String(plan.tls_planned) : '');
      setNotesValue(plan.notes ?? '');
      setSelectedEntityIds(Array.isArray(plan.entity_ids) ? plan.entity_ids : []);
    } else {
      setRlValue('');
      setTlsValue('');
      setNotesValue('');
      setSelectedEntityIds([]);
    }
  }, [myPlan]);

  // ⭐ تعيين الفترة إلى الأسبوع القادم (لأن اليوم جمعة - إجازة)
  useEffect(() => {
    const dayOfWeek = new Date().getDay(); // 5 = الجمعة
    const offset = dayOfWeek === 5 ? 1 : 0;
    const range = getWeekRange(offset);
    setPeriodStart(range.start);
    setPeriodEnd(range.end);
  }, []);

  useEffect(() => { if (isAdminViewer) loadRegions(); }, [isAdminViewer, loadRegions]);
  useEffect(() => {
    if (isSpecialist && activeEntity?.entityId) loadEntities(activeEntity.entityId);
  }, [isSpecialist, activeEntity?.entityId, loadEntities]);

  useEffect(() => {
    if (!activeEntity || !periodStart || !periodEnd) return;
    const scope: 'region' | 'edc' = isAdminViewer ? 'edc' : 'region';
    loadPlans(scope, activeEntity.entityId, periodStart, periodEnd, filters);
  }, [activeEntity, periodStart, periodEnd, filters, loadPlans, isAdminViewer]);

  const handleSave = async (submit: boolean) => {
    // ⭐ إذا كانت القيمة فارغة، نرسل null، وإلا نرسل الرقم
    const rl = rlValue.trim() === '' ? null : Number(rlValue);
    const tls = tlsValue.trim() === '' ? null : Number(tlsValue);

    const id = await upsertMyPlan({
      periodStart, periodEnd,
      rlPlanned: rl as any,
      tlsPlanned: tls as any,
      entityIds: selectedEntityIds,
      notes: notesValue || '',
      submit,
    });
    if (id) {
      toast.success(submit ? 'تم إرسال الخطة للاعتماد' : 'تم حفظ المسودة');
      loadPlans(isAdminViewer ? 'edc' : 'region', activeEntity!.entityId, periodStart, periodEnd, filters);
    }
  };

  // ⚠️ ملاحظة: onSubmit في PlanReviewModal لا يعيد Promise (حسب تعريفه الأصلي)
  // لذلك نستخدم async داخلياً ونغلق المودال بعد الانتهاء
  const handleReview = async (
    planId: string,
    action: 'approve' | 'request_revision' | 'comment',
    note?: string,
  ) => {
    const ok = await reviewPlan(planId, action, note);
    if (ok) {
      toast.success(
        action === 'approve' ? 'تم الاعتماد'
        : action === 'request_revision' ? 'تم إرسال طلب التعديل'
        : 'تم حفظ الملاحظة'
      );
      loadPlans(isAdminViewer ? 'edc' : 'region', activeEntity!.entityId, periodStart, periodEnd, filters);
      setReviewTarget(null);
    }
  };

  const openDeleteConfirm = (planId: string, specialistName: string) => {
    setDeleteTarget({ id: planId, name: specialistName });
    setDeleteReason('');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await deletePlan(deleteTarget.id, deleteReason || undefined);
    if (ok) {
      toast.success(lang === 'ar' ? 'تم حذف الخطة' : 'Plan deleted');
      loadPlans('edc', activeEntity!.entityId, periodStart, periodEnd, filters);
    }
    setDeleteTarget(null);
    setDeleteReason('');
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    const timer = setTimeout(() => setFilters({ search: value || undefined }), 400);
    return () => clearTimeout(timer);
  };

  const filteredPlans = useMemo(() => {
    if (planFilter === 'has_plan') return plans.filter((p: any) => p.plan_id !== null);
    if (planFilter === 'no_plan') return plans.filter((p: any) => p.plan_id === null);
    return plans;
  }, [plans, planFilter]);

  const plansByRegion = useMemo(() => {
    if (!isAdminViewer) return null;
    const grouped = new Map<string, { regionAr: string; regionEn: string; plans: typeof plans }>();
    filteredPlans.forEach((plan: any) => {
      const key = plan.region_id || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, {
          regionAr: plan.regionAr || 'غير محدد',
          regionEn: plan.regionEn || 'Unknown',
          plans: [],
        });
      }
      grouped.get(key)!.plans.push(plan);
    });
    return grouped;
  }, [filteredPlans, isAdminViewer]);

  const getEntityNames = (ids: string[]): string[] => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return ids
      .map((id: string) => entitiesMap[id])
      .filter((e: any) => Boolean(e))
      .map((e: any) => String(lang === 'ar' ? e.nameAr : e.nameEn));
  };

  if (!activeEntity) {
    return (
      <Card padding="lg" className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-4">اختر الكيان</h2>
        {availableEntities.map((entity) => (
          <button key={entity.assignmentId} onClick={() => setActiveEntity(entity.entityId)}
            className="w-full p-4 rounded-lg border hover:border-[var(--color-primary)] text-start mb-2">
            <div className="font-bold">{entity.entityName}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">{entity.roleCode}</div>
          </button>
        ))}
      </Card>
    );
  }

  if (loading && plans.length === 0 && !isSpecialist) {
    return <Loading message={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'} />;
  }

  return (
    <div className="space-y-5">
      <Card padding="lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold mb-1">📋 {lang === 'ar' ? 'خطط الزيارات' : 'Visit Plans'}</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isSpecialist
                ? lang === 'ar' ? `خطتك لمنطقة: ${activeEntity?.entityName || ''}` : `Your plan: ${activeEntity?.entityName || ''}`
                : lang === 'ar' ? 'راجع خطط المختصين واعتمدها' : 'Review and approve'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4" />
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input" style={{ maxWidth: 150 }} />
            <span>→</span>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input" style={{ maxWidth: 150 }} />
          </div>
        </div>
      </Card>

      {error && (
        <Card padding="md" className="border-[var(--color-danger)]">
          <div className="flex items-center gap-2 text-[var(--color-danger)]">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>إغلاق</Button>
          </div>
        </Card>
      )}

      {isSpecialist && (
        <Card padding="lg">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            {lang === 'ar' ? `خطتي لمنطقة ${activeEntity?.entityName || ''}` : `My Plan for ${activeEntity?.entityName || ''}`}
          </h2>

          {!canEdit && myPlan && typeof myPlan === 'object' && (myPlan as any).status && (
            <div className="mb-4 p-3 rounded-lg" style={{
              backgroundColor: STATUS_LABEL[(myPlan as any).status]?.bg,
              color: STATUS_LABEL[(myPlan as any).status]?.color,
            }}>
              <div className="flex items-center gap-2 text-sm font-bold">
                {(myPlan as any).status === 'approved' && <CheckCircle className="w-4 h-4" />}
                {(myPlan as any).status === 'submitted' && <Clock className="w-4 h-4" />}
                {STATUS_LABEL[(myPlan as any).status]?.ar} — {lang === 'ar' ? 'لا يمكن التعديل' : 'Cannot edit'}
              </div>
              {(myPlan as any).last_review_note && (
                <div className="mt-2 text-xs">
                  <strong>{lang === 'ar' ? 'ملاحظة المدير:' : 'Note:'}</strong> {(myPlan as any).last_review_note}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-bold block mb-2">🏫 {lang === 'ar' ? 'زيارات R.L المخططة' : 'Planned R.L'}</label>
              <input type="number" min={0} max={999} value={rlValue}
                onChange={(e) => setRlValue(e.target.value)}
                className="input w-full text-lg font-bold text-center" disabled={!canEdit} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-bold block mb-2">🏢 {lang === 'ar' ? 'زيارات TLS المخططة' : 'Planned TLS'}</label>
              <input type="number" min={0} max={999} value={tlsValue}
                onChange={(e) => setTlsValue(e.target.value)}
                className="input w-full text-lg font-bold text-center" disabled={!canEdit} placeholder="0" />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-bold block mb-2">
              🏫 {lang === 'ar' ? `المدارس/المراكز في ${activeEntity?.entityName || ''}` : `Schools/Centers`}
            </label>
            <EntitySelector
              entities={entities}
              selectedIds={selectedEntityIds}
              onChange={setSelectedEntityIds}
              disabled={!canEdit}
              lang={lang}
              loading={loadingEntities}
            />
          </div>

          {selectedEntityIds.length > 0 && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="text-xs font-bold mb-2">
                🎯 {lang === 'ar' ? 'المدارس المختارة' : 'Selected schools'} ({selectedEntityIds.length}):
              </div>
              <div className="flex flex-wrap gap-2">
                {getEntityNames(selectedEntityIds).map((name: string, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="text-sm font-bold block mb-2">{lang === 'ar' ? 'ملاحظات (اختياري)' : 'Notes'}</label>
            <textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)}
              className="input w-full" rows={3} disabled={!canEdit}
              placeholder={lang === 'ar' ? 'أي ملاحظات...' : 'Any notes...'} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" icon={<Save className="w-4 h-4" />}
              onClick={() => handleSave(false)} disabled={saving || !canEdit}>
              {lang === 'ar' ? 'حفظ كمسودة' : 'Save Draft'}
            </Button>
            <Button variant="primary" icon={<Send className="w-4 h-4" />}
              onClick={() => handleSave(true)} disabled={saving || !canEdit}>
              {lang === 'ar' ? 'إرسال للاعتماد' : 'Submit'}
            </Button>
          </div>
        </Card>
      )}

      {canReview && (
        <Card padding="lg">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              {lang === 'ar' ? `خطط المختصين (${filteredPlans.length})` : `Specialists Plans (${filteredPlans.length})`}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4 border-b border-[var(--color-border)] pb-3">
            <button
              onClick={() => setPlanFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                planFilter === 'all'
                  ? 'bg-[var(--color-primary)] text-white shadow-md'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All'}
              <span className={`text-xs px-2 py-0.5 rounded-full ${planFilter === 'all' ? 'bg-white/20 text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                {plans.length}
              </span>
            </button>

            <button
              onClick={() => setPlanFilter('has_plan')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                planFilter === 'has_plan'
                  ? 'bg-[var(--color-success)] text-white shadow-md'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
              }`}
            >
              {lang === 'ar' ? 'تم تعبئة الخطة' : 'Has Plan'}
              <span className={`text-xs px-2 py-0.5 rounded-full ${planFilter === 'has_plan' ? 'bg-white/20 text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                {plans.filter((p: any) => p.plan_id !== null).length}
              </span>
            </button>

            <button
              onClick={() => setPlanFilter('no_plan')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                planFilter === 'no_plan'
                  ? 'bg-[var(--color-danger)] text-white shadow-md'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
              }`}
            >
              {lang === 'ar' ? 'لم يتم تعبئة الخطة' : 'No Plan'}
              <span className={`text-xs px-2 py-0.5 rounded-full ${planFilter === 'no_plan' ? 'bg-white/20 text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                {plans.filter((p: any) => p.plan_id === null).length}
              </span>
            </button>
          </div>

          {/* Search input for managers */}
          {isAdminViewer && (
            <div className="relative mb-4">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث عن مختص...' : 'Search specialists...'}
                className="input w-full ps-9"
              />
            </div>
          )}

          {loading && plans.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)]">
              {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-muted)]">
              {lang === 'ar' ? 'لا توجد خطط' : 'No plans'}
            </div>
          ) : plansByRegion ? (
            // Grouped by region (edc viewer)
            Array.from(plansByRegion.entries()).map(([regionId, group]) => (
              <div key={regionId} className="mb-6">
                <h3 className="text-md font-bold mb-3 text-[var(--color-primary)]">
                  {lang === 'ar' ? group.regionAr : group.regionEn} ({group.plans.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.plans.map((plan: any) => (
                    <PlanCard
                      key={plan.plan_id || plan.user_id}
                      plan={plan}
                      lang={lang}
                      canApprove={canApprove}
                      canDelete={canDelete}
                      entitiesMap={entitiesMap}
                      onReview={(id, name) => setReviewTarget({ id, name })}
                      onDelete={openDeleteConfirm}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Flat list for region managers
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPlans.map((plan: any) => (
                <PlanCard
                  key={plan.plan_id || plan.user_id}
                  plan={plan}
                  lang={lang}
                  canApprove={canApprove}
                  canDelete={canDelete}
                  entitiesMap={entitiesMap}
                  onReview={(id, name) => setReviewTarget({ id, name })}
                  onDelete={openDeleteConfirm}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Review Modal — متوافق مع الواجهة الأصلية لـ PlanReviewModal */}
      {/* Props: planId, specialistName, canApprove, saving, onClose, onSubmit */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {reviewTarget && (
        <PlanReviewModal
          planId={reviewTarget.id}
          specialistName={reviewTarget.name}
          canApprove={canApprove}
          saving={saving}
          onClose={() => setReviewTarget(null)}
          onSubmit={handleReview}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Delete Confirm — متوافق مع الواجهة الأصلية لـ ConfirmModal */}
      {/* Props: open, title, message, confirmText, cancelText, variant, loading, onConfirm, onCancel */}
      {/* ⚠️ لا يدعم children — لذلك عرض سبب الحذف في message فقط */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={lang === 'ar' ? 'حذف الخطة' : 'Delete Plan'}
        message={
          deleteTarget
            ? (lang === 'ar'
                ? `هل أنت متأكد من حذف خطة "${deleteTarget.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete "${deleteTarget.name}"'s plan? This action cannot be undone.`)
            : ''
        }
        confirmText={lang === 'ar' ? 'حذف' : 'Delete'}
        cancelText={lang === 'ar' ? 'إلغاء' : 'Cancel'}
        variant="danger"
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteReason(''); }}
      />
    </div>
  );
}