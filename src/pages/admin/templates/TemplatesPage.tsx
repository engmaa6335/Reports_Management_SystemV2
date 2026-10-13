import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  RefreshCw,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTemplatesAdminStore } from '../../../stores/templates-admin-store';
import { useEntityStore } from '../../../stores/entity-store';
import { Button, Card } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { TemplateCard } from '../../../components/templates-admin/TemplateCard';
import { DeleteTemplateModal } from '../../../components/templates-admin/DeleteTemplateModal';
import type {
  TemplateWithRelations,
  DeleteTemplateCheck,
} from '../../../types/templates-admin';

// ================================================
// Component
// ================================================

export function TemplatesPage() {
  const navigate = useNavigate();
  const { activeEntity } = useEntityStore();

  const {
    templates,
    allTemplates,
    categories,
    loadingList,
    deleting,
    error,
    filters,
    loadTemplates,
    loadCategories,
    setFilters,
    clearFilters,
    checkDeleteTemplate,
    softDeleteTemplate,
    cascadeDeleteTemplate,
    clearError,
  } = useTemplatesAdminStore();

  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] =
    useState<TemplateWithRelations | null>(null);
  const [deleteCheck, setDeleteCheck] =
    useState<DeleteTemplateCheck | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ⭐ Scroll indicators
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isTechSupport = activeEntity?.roleCode === 'tech_support';

  // ================================================
  // Effects
  // ================================================

  useEffect(() => {
    loadCategories();
    loadTemplates();
  }, [loadCategories, loadTemplates]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(t);
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
  }, [categories.length]);

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
    const byCategory: Record<string, number> = {};
    let active = 0;
    let inactive = 0;

    allTemplates.forEach((t) => {
      const code = t.category?.code || 'unknown';
      byCategory[code] = (byCategory[code] || 0) + 1;

      if (t.is_active) active++;
      else inactive++;
    });

    return {
      total: allTemplates.length,
      active,
      inactive,
      byCategory,
    };
  }, [allTemplates]);

  // ================================================
  // Handlers
  // ================================================

  const handleRefresh = () => {
    loadTemplates(filters);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    clearFilters();
  };

  const handleCategoryFilter = (code: string | null) => {
    setFilters({ categoryCode: code });
  };

  const handleStatusFilter = (isActive: boolean | null) => {
    setFilters({ isActive });
  };

  const handleViewDetails = (id: string) => {
    navigate(`/settings/templates/${id}`);
  };

  const handleCreate = () => {
    navigate('/settings/templates/new');
  };

  const handleDelete = async (template: TemplateWithRelations) => {
    try {
      const check = await checkDeleteTemplate(template.id);
      setDeleteCheck(check);
      setDeleteTarget(template);
      setShowDeleteModal(true);
    } catch (err) {
      alert('فشل فحص القالب');
    }
  };

  const handleConfirmSoftDelete = async () => {
    if (!deleteTarget) return;
    try {
      await softDeleteTemplate(deleteTarget.id);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setDeleteCheck(null);
    } catch (err) {
      alert('فشل التعطيل');
    }
  };

  const handleConfirmCascadeDelete = async () => {
    if (!deleteTarget) return;
    try {
      await cascadeDeleteTemplate(deleteTarget.id);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setDeleteCheck(null);
    } catch (err) {
      alert('فشل الحذف');
    }
  };

  const hasActiveFilters =
    filters.search || filters.categoryCode || filters.isActive !== null;

  // ================================================
  // Render — Loading
  // ================================================

  if (loadingList && templates.length === 0) {
    return <Loading message="جاري تحميل القوالب..." />;
  }

  // ================================================
  // Render
  // ================================================

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <span className="truncate">إعدادات القوالب</span>
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            {stats.total > 0
              ? `${stats.total} قالب مسجل في النظام`
              : 'لا توجد قوالب'}
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
              <span className="hidden sm:inline">إضافة قالب</span>
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

      {/* Filters Card */}
      <Card padding="none" className="overflow-hidden">
        {/* Category Tabs — Desktop with arrows */}
        <div className="hidden sm:block border-b border-border relative">
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-surface via-surface to-transparent flex items-center justify-center hover:from-primary/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
          )}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-surface via-surface to-transparent flex items-center justify-center hover:from-primary/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-primary" />
            </button>
          )}

          <div
            ref={tabsScrollRef}
            className="overflow-x-auto scrollbar-thin"
          >
            <div className="flex flex-nowrap items-center gap-1 px-2 min-w-max">
              <TabButton
                active={filters.categoryCode === null}
                onClick={() => handleCategoryFilter(null)}
                label="📋 الكل"
                count={stats.total}
              />
              {categories.map((c) => (
                <TabButton
                  key={c.id}
                  active={filters.categoryCode === c.code}
                  onClick={() => handleCategoryFilter(c.code)}
                  label={`${c.icon || '📁'} ${c.name_ar}`}
                  count={stats.byCategory[c.code] || 0}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Category Tabs — Mobile: dropdown */}
        <div className="sm:hidden p-3 border-b border-border">
          <label className="block text-xs font-medium text-text-muted mb-1.5">
            الفئة
          </label>
          <select
            value={filters.categoryCode || ''}
            onChange={(e) => handleCategoryFilter(e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">📋 الكل ({stats.total})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.code}>
                {c.icon || '📁'} {c.name_ar} ({stats.byCategory[c.code] || 0})
              </option>
            ))}
          </select>
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

        {/* Search */}
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              icon={<X className="w-4 h-4" />}
              onClick={handleClearFilters}
            >
              <span className="hidden sm:inline">مسح الفلاتر</span>
              <span className="sm:hidden">مسح</span>
            </Button>
          )}
        </div>
      </Card>

      {/* List */}
      {loadingList ? (
        <Loading message="جاري التحميل..." />
      ) : templates.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              {hasActiveFilters ? '🔍' : '📋'}
            </div>
            <h2 className="text-lg font-bold text-text mb-2">
              {hasActiveFilters
                ? 'لا توجد نتائج مطابقة'
                : 'لا توجد قوالب'}
            </h2>
            <p className="text-text-secondary text-sm mb-4">
              {hasActiveFilters
                ? 'جرّب تغيير الفلاتر أو البحث'
                : 'ابدأ بإضافة قالب جديد'}
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
                إضافة قالب
              </Button>
            ) : null}
          </div>
        </Card>
      ) : (
        <>
          <div className="text-sm text-text-muted">
            عرض <strong className="text-text">{templates.length}</strong> من{' '}
            <strong className="text-text">{allTemplates.length}</strong> قالب
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {templates.map((template) => (
              <div key={template.id} className="relative">
                <TemplateCard
                  template={template}
                  onClick={() => handleViewDetails(template.id)}
                />
                {isTechSupport && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(template);
                    }}
                    className="absolute top-2 left-2 w-8 h-8 rounded-full bg-surface/90 backdrop-blur-sm text-danger hover:bg-danger hover:text-white transition-colors flex items-center justify-center z-10 shadow-md"
                    title="حذف"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete Modal */}
      <DeleteTemplateModal
        isOpen={showDeleteModal}
        templateName={deleteTarget?.name_ar || ''}
        checkResult={deleteCheck}
        onClose={() => {
          if (!deleting) {
            setShowDeleteModal(false);
            setDeleteTarget(null);
            setDeleteCheck(null);
          }
        }}
        onSoftDelete={handleConfirmSoftDelete}
        onCascadeDelete={handleConfirmCascadeDelete}
        isDeleting={deleting}
      />
    </div>
  );
}

// ================================================
// TabButton
// ================================================

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-text-secondary hover:text-text hover:border-border'
      }`}
    >
      <span>{label}</span>
      <span
        className={`inline-flex items-center justify-center min-w-[18px] sm:min-w-[20px] h-4.5 sm:h-5 px-1 sm:px-1.5 rounded-full text-[10px] sm:text-xs font-bold ${
          active
            ? 'bg-primary text-white'
            : 'bg-bg-secondary text-text-secondary'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ================================================
// StatusButton
// ================================================

function StatusButton({
  active,
  onClick,
  label,
  count,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  variant: 'default' | 'success' | 'danger';
}) {
  const activeClass = {
    default: 'bg-primary/10 text-primary border border-primary/30',
    success: 'bg-success/10 text-success border border-success/30',
    danger: 'bg-danger/10 text-danger border border-danger/30',
  }[variant];

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? activeClass
          : 'text-text-secondary hover:bg-bg-secondary border border-transparent'
      }`}
    >
      <span>{label}</span>
      <span className="font-bold">{count}</span>
    </button>
  );
}