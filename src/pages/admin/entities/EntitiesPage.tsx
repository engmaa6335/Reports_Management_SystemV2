import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  RefreshCw,
  Building2,
  Power,
  PowerOff,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useEntitiesStore } from '../../../stores/entities-store';
import { useEntityStore } from '../../../stores/entity-store';
import { Button, Card, Input } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import type { EntityWithRelations } from '../../../types/entities';

// ================================================
// Helpers
// ================================================

function getEntityIcon(typeCode: string | null | undefined): string {
  switch (typeCode) {
    case 'region':
      return '🗺️';
    case 'school':
      return '🏫';
    case 'tls_center':
      return '🏢';
    case 'edu_unit':
      return '📚';
    case 'edc':
      return '🏛️';
    case 'qa_unit':
      return '✅';
    default:
      return '📍';
  }
}

function getTypeColor(typeCode: string | null | undefined): string {
  switch (typeCode) {
    case 'region':
      return '#3b82f6';
    case 'school':
      return '#10b981';
    case 'tls_center':
      return '#f59e0b';
    case 'edu_unit':
      return '#8b5cf6';
    case 'edc':
      return '#ef4444';
    case 'qa_unit':
      return '#06b6d4';
    default:
      return '#6b7280';
  }
}

// ================================================
// Component
// ================================================

export function EntitiesPage() {
  const navigate = useNavigate();
  const { activeEntity } = useEntityStore();

  const {
    allEntities,
    entities,
    loadingList,
    entityTypes,
    regions,
    error,
    filters,
    loadEntities,
    setFilters,
    clearFilters,
    loadEntityTypes,
    loadRegions,
    clearError,
  } = useEntitiesStore();

  const [searchInput, setSearchInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ⭐ للتمرير
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isTechSupport = activeEntity?.roleCode === 'tech_support';

  // ================================================
  // Effects
  // ================================================

  useEffect(() => {
    loadEntityTypes();
    loadRegions();
  }, [loadEntityTypes, loadRegions]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setFilters]);

  // ⭐ Scroll indicators (RTL-aware)
  const checkScroll = () => {
    const el = tabsScrollRef.current;
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

    // في RTL نعكس المنطق
    setCanScrollLeft(scrolledFromEnd);
    setCanScrollRight(scrolledFromStart);
  };

  useEffect(() => {
    checkScroll();
    const t = setTimeout(checkScroll, 100);

    const el = tabsScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        clearTimeout(t);
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [entityTypes.length]);

  const scrollLeft = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const newPos = Math.abs(el.scrollLeft) + 240;
    el.scrollTo({ left: -newPos, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const newPos = Math.max(0, Math.abs(el.scrollLeft) - 240);
    el.scrollTo({ left: -newPos, behavior: 'smooth' });
  };

  // ================================================
  // Stats
  // ================================================

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    let active = 0;
    let inactive = 0;

    allEntities.forEach((e) => {
      const code = e.entity_type?.code || 'unknown';
      byType[code] = (byType[code] || 0) + 1;

      if (e.is_active) active++;
      else inactive++;
    });

    return {
      total: allEntities.length,
      active,
      inactive,
      byType,
    };
  }, [allEntities]);

  // Type tabs
  const typeTabs = useMemo(() => {
    const tabs: {
      code: string;
      name: string;
      icon: string;
      count: number;
      color: string;
    }[] = [];

    entityTypes.forEach((t) => {
      tabs.push({
        code: t.code,
        name: t.name_ar,
        icon: getEntityIcon(t.code),
        count: stats.byType[t.code] || 0,
        color: getTypeColor(t.code),
      });
    });

    tabs.sort((a, b) => {
      const ta = entityTypes.find((t) => t.code === a.code);
      const tb = entityTypes.find((t) => t.code === b.code);
      return (ta?.hierarchy_level || 0) - (tb?.hierarchy_level || 0);
    });

    return tabs;
  }, [entityTypes, stats.byType]);

  // قائمة الآباء المفلترة حسب نوع الأب
  const availableParents = useMemo(() => {
    let result = allEntities.filter((e) => e.is_active);

    if (filters.parentTypeCode) {
      result = result.filter(
        (e) => e.entity_type?.code === filters.parentTypeCode
      );
    }

    return result.sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
  }, [allEntities, filters.parentTypeCode]);

  // ================================================
  // Handlers
  // ================================================

  const handleRefresh = () => {
    loadEntities(filters);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    clearFilters();
  };

  const handleTypeFilter = (code: string | null) => {
    setFilters({ typeCode: code });
  };

  const handleStatusFilter = (isActive: boolean | null) => {
    setFilters({ isActive });
  };

  const hasActiveFilters =
    filters.search ||
    filters.typeCode ||
    filters.parentTypeCode ||
    filters.isActive !== null ||
    filters.regionId ||
    filters.parentId;

  const handleViewDetails = (id: string) => {
    navigate(`/admin/entities/${id}`);
  };

  const handleCreate = () => {
    navigate('/admin/entities/new');
  };

  // ================================================
  // Render
  // ================================================

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <span className="truncate">إدارة الكيانات</span>
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            {stats.total > 0
              ? `${stats.total} كيان مسجل في النظام`
              : 'لا توجد كيانات'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
            disabled={loadingList}
          >
            <span className="hidden sm:inline">تحديث</span>
          </Button>

          {isTechSupport && (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleCreate}
            >
              <span className="hidden sm:inline">إضافة كيان</span>
              <span className="sm:hidden">إضافة</span>
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span className="flex-1 break-words">{error}</span>
            <button
              onClick={clearError}
              className="text-danger hover:underline text-xs flex-shrink-0"
            >
              إغلاق
            </button>
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* Filters Card */}
      {/* ═══════════════════════════════════════════ */}
      <Card padding="none" className="overflow-hidden">
        {/* ⭐ Type Tabs — Mobile: Dropdown */}
        <div className="sm:hidden p-3 border-b border-border">
          <label className="block text-xs font-medium text-text-muted mb-1.5">
            تصنيف الكيانات
          </label>
          <select
            value={filters.typeCode || ''}
            onChange={(e) => handleTypeFilter(e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">📋 الكل ({stats.total})</option>
            {typeTabs.map((t) => (
              <option key={t.code} value={t.code}>
                {t.icon} {t.name} ({t.count})
              </option>
            ))}
          </select>
        </div>

        {/* ⭐ Type Tabs — Desktop with smart arrows (RTL-aware) */}
        <div className="hidden sm:block border-b border-border relative">
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-surface via-surface to-transparent flex items-center justify-center hover:from-primary/10 transition-colors"
              aria-label="المزيد"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
          )}

          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-surface via-surface to-transparent flex items-center justify-center hover:from-primary/10 transition-colors"
              aria-label="السابق"
            >
              <ChevronLeft className="w-5 h-5 text-primary" />
            </button>
          )}

          <div
            ref={tabsScrollRef}
            className="overflow-x-auto scrollbar-thin"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex flex-nowrap items-center gap-1 px-2 min-w-max">
              <TabButton
                active={filters.typeCode === null}
                onClick={() => handleTypeFilter(null)}
                label="📋 الكل"
                count={stats.total}
              />

              {typeTabs.map((t) => (
                <TabButton
                  key={t.code}
                  active={filters.typeCode === t.code}
                  onClick={() => handleTypeFilter(t.code)}
                  label={`${t.icon} ${t.name}`}
                  count={t.count}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="px-3 sm:px-4 pt-3 border-b border-border">
          <div className="flex items-center gap-1 overflow-x-auto pb-3 scrollbar-thin">
            <StatusButton
              active={filters.isActive === null}
              onClick={() => handleStatusFilter(null)}
              label="📊 الكل"
              count={stats.total}
              variant="default"
            />
            <StatusButton
              active={filters.isActive === true}
              onClick={() => handleStatusFilter(true)}
              label="🟢 نشط"
              count={stats.active}
              variant="success"
            />
            <StatusButton
              active={filters.isActive === false}
              onClick={() => handleStatusFilter(false)}
              label="⛔ معطّل"
              count={stats.inactive}
              variant="danger"
            />
          </div>
        </div>

        {/* Search + Advanced toggle */}
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث بالاسم أو الكود..."
              className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                icon={<X className="w-4 h-4" />}
                onClick={handleClearFilters}
              >
                <span className="hidden sm:inline">مسح</span>
              </Button>
            )}

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-primary hover:underline whitespace-nowrap px-2"
            >
              {showAdvanced ? 'إخفاء ▼' : 'خيارات ▲'}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="px-3 sm:px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-4">
            {/* 1. المنطقة */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                المنطقة
              </label>
              <select
                value={filters.regionId || ''}
                onChange={(e) =>
                  setFilters({ regionId: e.target.value || null })
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">كل المناطق</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    🗺️ {r.name_ar}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. نوع الأب */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                نوع الأب
              </label>
              <select
                value={filters.parentTypeCode || ''}
                onChange={(e) => {
                  setFilters({
                    parentTypeCode: e.target.value || null,
                    parentId: null,
                  });
                }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">كل الأنواع</option>
                {entityTypes.map((t) => (
                  <option key={t.id} value={t.code}>
                    {getEntityIcon(t.code)} {t.name_ar}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. الكيان الأب */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                الكيان الأب
              </label>
              <select
                value={filters.parentId || ''}
                onChange={(e) =>
                  setFilters({ parentId: e.target.value || null })
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={availableParents.length === 0}
              >
                <option value="">كل الكيانات</option>
                {availableParents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {getEntityIcon(e.entity_type?.code)} {e.name_ar}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════ */}
      {/* List */}
      {/* ═══════════════════════════════════════════ */}

      {loadingList ? (
        <Loading message="جاري تحميل الكيانات..." />
      ) : entities.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8 sm:py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-bg-secondary rounded-full mb-4">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-text-muted" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-text mb-2">
              {allEntities.length === 0
                ? 'لا توجد كيانات'
                : 'لا توجد نتائج مطابقة'}
            </h2>
            <p className="text-text-secondary text-sm mb-6">
              {allEntities.length === 0
                ? 'ابدأ بإضافة كيان جديد'
                : 'جرّب تغيير الفلاتر أو البحث'}
            </p>
            {hasActiveFilters ? (
              <Button variant="ghost" onClick={handleClearFilters}>
                مسح الفلاتر
              </Button>
            ) : isTechSupport ? (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleCreate}
              >
                إضافة كيان
              </Button>
            ) : null}
          </div>
        </Card>
      ) : (
        <>
          <div className="text-sm text-text-muted">
            عرض <strong className="text-text">{entities.length}</strong> من{' '}
            <strong className="text-text">{allEntities.length}</strong> كيان
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {entities.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                onClick={() => handleViewDetails(entity.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ================================================
// TabButton
// ================================================

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
        flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3
        text-xs sm:text-sm font-medium
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
          inline-flex items-center justify-center min-w-[18px] sm:min-w-[20px]
          h-4.5 sm:h-5 px-1 sm:px-1.5 rounded-full text-[10px] sm:text-xs font-bold
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

// ================================================
// StatusButton
// ================================================

interface StatusButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  variant: 'default' | 'success' | 'danger';
}

function StatusButton({
  active,
  onClick,
  label,
  count,
  variant,
}: StatusButtonProps) {
  const activeClass = {
    default: 'bg-primary/10 text-primary border border-primary/30',
    success: 'bg-success/10 text-success border border-success/30',
    danger: 'bg-danger/10 text-danger border border-danger/30',
  }[variant];

  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 flex items-center gap-1.5 sm:gap-2
        px-2.5 sm:px-3 py-1.5
        rounded-lg text-xs font-medium transition-colors whitespace-nowrap
        ${
          active
            ? activeClass
            : 'text-text-secondary hover:bg-bg-secondary border border-transparent'
        }
      `}
    >
      <span>{label}</span>
      <span className="font-bold">{count}</span>
    </button>
  );
}

// ================================================
// EntityCard
// ================================================

function EntityCard({
  entity,
  onClick,
}: {
  entity: EntityWithRelations;
  onClick: () => void;
}) {
  const typeCode = entity.entity_type?.code || null;
  const typeColor = getTypeColor(typeCode);
  const isActive = entity.is_active ?? false;

  return (
    <button
      onClick={onClick}
      className="text-right transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary rounded-xl w-full"
    >
      <Card
        padding="md"
        className={`h-full hover:shadow-hard transition-shadow ${
          !isActive ? 'opacity-60' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
            style={{ backgroundColor: `${typeColor}20` }}
          >
            {getEntityIcon(typeCode)}
          </div>

          <div className="flex items-center gap-1.5">
            {isActive ? (
              <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" />
            ) : (
              <PowerOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-danger" />
            )}
          </div>
        </div>

        <h3 className="text-sm sm:text-base font-bold text-text mb-1 line-clamp-2">
          {entity.name_ar}
        </h3>

        {entity.name_en && (
          <p
            className="text-[10px] sm:text-xs text-text-muted mb-2 sm:mb-3 line-clamp-1"
            dir="ltr"
          >
            {entity.name_en}
          </p>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-2 sm:mb-3">
          {entity.entity_type && (
            <span
              className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium"
              style={{
                backgroundColor: `${typeColor}15`,
                color: typeColor,
              }}
            >
              {entity.entity_type.name_ar}
            </span>
          )}

          {entity.code && (
            <span className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-bg-secondary text-text-secondary font-mono">
              {entity.code}
            </span>
          )}
        </div>

        <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs text-text-secondary">
          {entity.parent && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span>🔗</span>
              <span className="line-clamp-1">{entity.parent.name_ar}</span>
            </div>
          )}

          {entity.contact_info?.manager_name && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span>👤</span>
              <span className="line-clamp-1">
                {String(entity.contact_info.manager_name)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs text-text-muted mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            عرض
          </span>
          <span className="font-mono">{entity.id.slice(0, 6)}</span>
        </div>
      </Card>
    </button>
  );
}