// ═══════════════════════════════════════════════════════════
// SummariesListPage — List of aggregate report summaries
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useSummariesStore } from '../../stores/summaries-store';
import { usePermission } from '../../hooks/usePermission';
import { usePageAccess } from '../../hooks/usePageAccess';
import { Button, Card } from '../../components/ui';
import { DeleteSummaryModal } from '../../components/aggregate-summaries/DeleteSummaryModal';
import {
  pickLocalizedName,
  getPeriodTypeLabelI18n,
  getSummaryStatusLabel,
  formatDateI18n,
  formatPeriodRangeI18n,
  formatNumberI18n,
} from '../../lib/i18n-helpers';
import type { PeriodType } from '../../types/aggregates';
import type { SummaryStatus } from '../../types/summaries';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type QuickTab = 'all' | SummaryStatus;

interface AdvancedFilters {
  templateId: string | null;
  periodType: PeriodType | null;
  periodStart: string;
  periodEnd: string;
  classification: string | null;
  regionId: string | null;
}

const DEFAULT_ADVANCED: AdvancedFilters = {
  templateId: null,
  periodType: null,
  periodStart: '',
  periodEnd: '',
  classification: null,
  regionId: null,
};

// ═══════════════════════════════════════════════════════════
// StatCard
// ═══════════════════════════════════════════════════════════

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'primary' | 'info' | 'success' | 'warning';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
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

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export function SummariesListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = i18n.language;

  const { allowed: canView, loading: checkingView } = usePermission(
    'aggregate_summaries.view'
  );
  const { allowed: canCreate } = usePageAccess('aggregate_summaries', 'create');
  const { allowed: canEdit } = usePageAccess('aggregate_summaries', 'edit');
  const { allowed: canDelete } = usePageAccess('aggregate_summaries', 'delete');

  const {
    summaries,
    templates,
    loadingList,
    loadingTemplates,
    deleting,
    error,
    loadSummaries,
    loadTemplates,
    clearFilters,
    deleteSummary,
    clearError,
  } = useSummariesStore();

  const [quickTab, setQuickTab] = useState<QuickTab>('all');
  const [search, setSearch] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedFilters>(DEFAULT_ADVANCED);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    creatorName: string;
    totalVisits: number;
  } | null>(null);

  useEffect(() => {
    if (canView) {
      loadSummaries();
      loadTemplates();
    }
    return () => clearError();
  }, [canView, loadSummaries, loadTemplates, clearError]);

  // ═══════════════════════════════════════════
  // Filtered summaries
  // ═══════════════════════════════════════════

  const filteredSummaries = useMemo(() => {
    let result = [...summaries];

    if (quickTab !== 'all') {
      result = result.filter((s) => s.status === quickTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((s) => {
        const title = s.title?.toLowerCase() || '';
        const template = s.template?.name_ar?.toLowerCase() || '';
        const templateEn = s.template?.name_en?.toLowerCase() || '';
        const classification = s.classification?.toLowerCase() || '';
        return (
          title.includes(q) ||
          template.includes(q) ||
          templateEn.includes(q) ||
          classification.includes(q)
        );
      });
    }

    if (advanced.templateId) {
      result = result.filter((s) => s.template_id === advanced.templateId);
    }
    if (advanced.periodType) {
      result = result.filter((s) => s.period_type === advanced.periodType);
    }
    if (advanced.periodStart) {
      result = result.filter(
        (s) => (s.period_start || '') >= advanced.periodStart
      );
    }
    if (advanced.periodEnd) {
      result = result.filter(
        (s) => (s.period_end || '') <= advanced.periodEnd
      );
    }
    if (advanced.classification) {
      result = result.filter(
        (s) => s.classification === advanced.classification
      );
    }
    if (advanced.regionId) {
      result = result.filter((s) => s.region_id === advanced.regionId);
    }

    return result;
  }, [summaries, quickTab, search, advanced]);

  // ═══════════════════════════════════════════
  // Counts (for tabs)
  // ═══════════════════════════════════════════

  const counts = useMemo(() => {
    const counts: Record<QuickTab, number> = {
      all: summaries.length,
      draft: 0,
      review: 0,
      approved: 0,
      archived: 0,
    };
    for (const s of summaries) {
      if (s.status in counts) {
        counts[s.status as SummaryStatus]++;
      }
    }
    return counts;
  }, [summaries]);

  // ═══════════════════════════════════════════
  // ⭐ Stats Cards
  // ═══════════════════════════════════════════

  const stats = useMemo(() => {
    const total = summaries.length;

    // آخر 30 يوماً
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thisMonth = summaries.filter(
      (s) => new Date(s.created_at) >= thirtyDaysAgo
    ).length;

    // حسب الحالة
    const draft = summaries.filter((s) => s.status === 'draft').length;
    const approved = summaries.filter((s) => s.status === 'approved').length;

    return { total, thisMonth, draft, approved };
  }, [summaries]);

  // ═══════════════════════════════════════════
  // Options
  // ═══════════════════════════════════════════

  const templateOptions = useMemo(
    () =>
      templates.map((tpl) => ({
        value: tpl.id,
        label: pickLocalizedName(tpl, language),
      })),
    [templates, language]
  );

  const classificationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of summaries) {
      if (s.classification) set.add(s.classification);
    }
    return Array.from(set).sort();
  }, [summaries]);

  const regionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of summaries) {
      if (s.region?.id && s.region?.name_ar) {
        map.set(s.region.id, pickLocalizedName(s.region, language));
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, name }));
  }, [summaries, language]);

  const activeAdvancedCount = useMemo(() => {
    let n = 0;
    if (advanced.templateId) n++;
    if (advanced.periodType) n++;
    if (advanced.periodStart) n++;
    if (advanced.periodEnd) n++;
    if (advanced.classification) n++;
    if (advanced.regionId) n++;
    return n;
  }, [advanced]);

  const hasAnyFilter =
    quickTab !== 'all' || search.trim() !== '' || activeAdvancedCount > 0;

  const clearAllFilters = () => {
    setQuickTab('all');
    setSearch('');
    setAdvanced(DEFAULT_ADVANCED);
    clearFilters();
  };

  const clearAdvanced = () => setAdvanced(DEFAULT_ADVANCED);

  const handleDelete = (summary: typeof summaries[0]) => {
    setDeleteTarget({
      id: summary.id,
      title: summary.title,
      creatorName: summary.creator?.full_name || '—',
      totalVisits: summary.total_visits,
    });
  };

  if (checkingView) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!canView) {
    return (
      <Card padding="lg" className="text-center">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-text mb-2">
          {t('aggregate_summaries.no_permission_view')}
        </h2>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            {t('aggregate_summaries.title')}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {t('aggregate_summaries.subtitle')}
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/aggregate-summaries/new')}
          >
            {t('aggregate_summaries.create_summary')}
          </Button>
        )}
      </div>

      {/* ⭐ Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Sparkles className="w-5 h-5" />}
          label={t('aggregate_summaries.total_summaries', {
            defaultValue: 'إجمالي الملخصات',
          })}
          value={stats.total}
          color="primary"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label={t('aggregate_summaries.this_month', {
            defaultValue: 'آخر 30 يوماً',
          })}
          value={stats.thisMonth}
          color="info"
        />
        <StatCard
          icon={<Edit2 className="w-5 h-5" />}
          label={getSummaryStatusLabel(t, 'draft')}
          value={stats.draft}
          color="warning"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label={getSummaryStatusLabel(t, 'approved')}
          value={stats.approved}
          color="success"
        />
      </div>

      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="flex items-center justify-between text-danger">
            <span className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </span>
            <button onClick={clearError} className="text-xs underline">
              ×
            </button>
          </div>
        </Card>
      )}

      {/* Filters Card */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Quick tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <QuickTabButton
              active={quickTab === 'all'}
              onClick={() => setQuickTab('all')}
              label={t('aggregate_summaries.all')}
              count={counts.all}
            />
            <QuickTabButton
              active={quickTab === 'draft'}
              onClick={() => setQuickTab('draft')}
              label={getSummaryStatusLabel(t, 'draft')}
              count={counts.draft}
            />
            <QuickTabButton
              active={quickTab === 'review'}
              onClick={() => setQuickTab('review')}
              label={getSummaryStatusLabel(t, 'review')}
              count={counts.review}
            />
            <QuickTabButton
              active={quickTab === 'approved'}
              onClick={() => setQuickTab('approved')}
              label={getSummaryStatusLabel(t, 'approved')}
              count={counts.approved}
            />
            <QuickTabButton
              active={quickTab === 'archived'}
              onClick={() => setQuickTab('archived')}
              label={getSummaryStatusLabel(t, 'archived')}
              count={counts.archived}
            />
          </div>

          {/* Search + Advanced toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('aggregate_summaries.search_placeholder')}
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

            <Button
              variant={advancedOpen ? 'primary' : 'ghost'}
              size="sm"
              icon={<Filter className="h-4 w-4" />}
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              {t('aggregate_summaries.advanced_filter')}
              {activeAdvancedCount > 0 && (
                <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                  {activeAdvancedCount}
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  advancedOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>

            {hasAnyFilter && (
              <Button
                variant="ghost"
                size="sm"
                icon={<X className="h-4 w-4" />}
                onClick={clearAllFilters}
                className="text-danger hover:bg-danger/10"
              >
                {t('aggregate_summaries.clear_all')}
              </Button>
            )}
          </div>

          {/* Advanced filters */}
          {advancedOpen && (
            <div className="rounded-lg border border-border bg-bg-secondary/50 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Template */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    {t('aggregate_summaries.meta_template')}
                  </label>
                  <select
                    value={advanced.templateId || ''}
                    onChange={(e) =>
                      setAdvanced({
                        ...advanced,
                        templateId: e.target.value || null,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                  >
                    <option value="">— {t('aggregate_summaries.all')} —</option>
                    {templateOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period type */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    <Calendar className="inline h-3.5 w-3.5 ml-1" />
                    {t('aggregate_summaries.period_type')}
                  </label>
                  <select
                    value={advanced.periodType || ''}
                    onChange={(e) =>
                      setAdvanced({
                        ...advanced,
                        periodType: (e.target.value || null) as PeriodType | null,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                  >
                    <option value="">{t('aggregate_summaries.all_periods')}</option>
                    <option value="biweekly">
                      {getPeriodTypeLabelI18n(t, 'biweekly')}
                    </option>
                    <option value="monthly">
                      {getPeriodTypeLabelI18n(t, 'monthly')}
                    </option>
                    <option value="custom">
                      {getPeriodTypeLabelI18n(t, 'custom')}
                    </option>
                  </select>
                </div>

                {/* Period start */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    <Calendar className="inline h-3.5 w-3.5 ml-1" />
                    {t('aggregate_summaries.from_date')}
                  </label>
                  <input
                    type="date"
                    value={advanced.periodStart}
                    onChange={(e) =>
                      setAdvanced({ ...advanced, periodStart: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                  />
                </div>

                {/* Period end */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    {t('aggregate_summaries.to_date')}
                  </label>
                  <input
                    type="date"
                    value={advanced.periodEnd}
                    onChange={(e) =>
                      setAdvanced({ ...advanced, periodEnd: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                  />
                </div>

                {/* Classification */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    {t('aggregate_summaries.classification')}
                  </label>
                  <select
                    value={advanced.classification || ''}
                    onChange={(e) =>
                      setAdvanced({
                        ...advanced,
                        classification: e.target.value || null,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                  >
                    <option value="">
                      {t('aggregate_summaries.all_classifications')}
                    </option>
                    {classificationOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Region */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    <MapPin className="inline h-3.5 w-3.5 ml-1" />
                    {t('aggregate_summaries.region')}
                  </label>
                  <select
                    value={advanced.regionId || ''}
                    onChange={(e) =>
                      setAdvanced({
                        ...advanced,
                        regionId: e.target.value || null,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                  >
                    <option value="">{t('aggregate_summaries.all_regions')}</option>
                    {regionOptions.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeAdvancedCount > 0 && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={clearAdvanced}
                    className="text-xs text-danger hover:underline"
                  >
                    {t('aggregate_summaries.clear_all')}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              {t('aggregate_summaries.showing', {
                filtered: filteredSummaries.length,
                total: summaries.length,
              })}
            </span>
          </div>
        </div>
      </Card>

      {/* Loading */}
      {(loadingList || loadingTemplates) && summaries.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-text-secondary">
              {t('aggregate_summaries.loading')}
            </p>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loadingList && summaries.length === 0 && (
        <Card padding="lg">
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
            <div className="mb-4 text-5xl">✨</div>
            <h3 className="mb-2 text-lg font-semibold text-text">
              {t('aggregate_summaries.no_summaries_title')}
            </h3>
            <p className="mb-6 text-sm text-text-secondary">
              {t('aggregate_summaries.no_summaries_desc')}
            </p>
            {canCreate && (
              <Button
                variant="primary"
                size="lg"
                icon={<Plus className="h-5 w-5" />}
                onClick={() => navigate('/aggregate-summaries/new')}
              >
                {t('aggregate_summaries.create_summary')}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* No results */}
      {!loadingList &&
        summaries.length > 0 &&
        filteredSummaries.length === 0 && (
          <Card padding="lg">
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <div className="mb-4 text-5xl">🔍</div>
              <h3 className="mb-2 text-lg font-semibold text-text">
                {t('aggregate_summaries.no_results_title')}
              </h3>
              <p className="mb-6 text-sm text-text-secondary">
                {t('aggregate_summaries.no_results_desc')}
              </p>
              <Button variant="ghost" onClick={clearAllFilters}>
                {t('aggregate_summaries.clear_all_filters')}
              </Button>
            </div>
          </Card>
        )}

      {/* List */}
      {!loadingList && filteredSummaries.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSummaries.map((summary) => (
            <Card
              key={summary.id}
              padding="lg"
              className="transition-shadow hover:shadow-hard flex flex-col"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text truncate">
                    {summary.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-primary">
                    {summary.template
                      ? pickLocalizedName(summary.template, language)
                      : '—'}
                  </p>
                  {summary.classification && (
                    <p className="mt-1 text-xs text-text-muted">
                      {summary.classification}
                    </p>
                  )}
                </div>
                <StatusBadge status={summary.status} t={t} />
              </div>

              <div className="mb-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {summary.region
                      ? pickLocalizedName(summary.region, language)
                      : summary.entity
                      ? pickLocalizedName(summary.entity, language)
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {formatPeriodRangeI18n(
                      summary.period_start,
                      summary.period_end,
                      language
                    )}
                  </span>
                </div>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-primary/5">
                  <div className="text-lg font-bold text-primary">
                    {formatNumberI18n(summary.total_visits, language)}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {t('aggregate_summaries.visits_count')}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-success/5">
                  <div className="text-lg font-bold text-success">
                    {summary.strengths?.length || 0}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {t('aggregate_summaries.strengths_count')}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-warning/5">
                  <div className="text-lg font-bold text-warning">
                    {summary.improvements?.length || 0}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {t('aggregate_summaries.improvements_count')}
                  </div>
                </div>
              </div>

              <div className="mb-3 text-[11px] text-text-muted">
                <div className="truncate">
                  {summary.creator?.full_name || '—'}
                </div>
                <div>{formatDateI18n(summary.created_at, language)}</div>
              </div>

              <div className="mt-auto flex gap-1.5 border-t border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => navigate(`/aggregate-summaries/${summary.id}`)}
                  className="flex-1 text-xs"
                >
                  {t('aggregate_summaries.view')}
                </Button>

                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                    onClick={() =>
                      navigate(`/aggregate-summaries/${summary.id}/edit`)
                    }
                    className="flex-1 text-xs"
                  >
                    {t('aggregate_summaries.edit')}
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => handleDelete(summary)}
                    className="text-danger hover:bg-danger/10"
                  >
                    {t('aggregate_summaries.delete')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {deleteTarget && (
        <DeleteSummaryModal
          open={true}
          summaryTitle={deleteTarget.title}
          summaryCreatorName={deleteTarget.creatorName}
          totalVisits={deleteTarget.totalVisits}
          isDeleting={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async (reason) => {
            await deleteSummary(deleteTarget.id, reason);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

interface QuickTabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}

function QuickTabButton({ active, onClick, label, count }: QuickTabButtonProps) {
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

function StatusBadge({ status, t }: { status: SummaryStatus; t: TFunction }) {
  const variants: Record<SummaryStatus, string> = {
    draft: 'bg-text-muted/10 text-text-muted',
    review: 'bg-info/10 text-info',
    approved: 'bg-success/10 text-success',
    archived: 'bg-bg-secondary text-text-muted',
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${
        variants[status] || 'bg-bg-secondary text-text-muted'
      }`}
    >
      {getSummaryStatusLabel(t, status)}
    </span>
  );
}

export default SummariesListPage;