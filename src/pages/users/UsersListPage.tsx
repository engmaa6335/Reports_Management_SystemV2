import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Users as UsersIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useUsersStore } from '../../stores/users-store';
import { usePermission } from '../../hooks/usePermission';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import type { RoleGroup } from '../../types/users';

// ================================================
// Tab Config
// ================================================

interface TabConfig {
  id: RoleGroup;
  label: string;
  icon: string;
  color: string;
}

const TABS: TabConfig[] = [
  { id: null, label: 'الكل', icon: '📋', color: '#2563eb' },
  { id: 'region_manager', label: 'مدير منطقة', icon: '🗺️', color: '#3b82f6' },
  { id: 'school_manager', label: 'مدير مدرسة', icon: '🏫', color: '#10b981' },
  { id: 'tls_manager', label: 'مدير مساحة تعلم', icon: '🏢', color: '#f59e0b' },
  { id: 'edu_specialist', label: 'مختص تربوي', icon: '📚', color: '#06b6d4' },
  { id: 'qa_chief', label: 'رئيس ضمان الجودة', icon: '✅', color: '#8b5cf6' },
  { id: 'qa_coordinator', label: 'منسق ضمان الجودة', icon: '🎯', color: '#ec4899' },
  { id: 'tech_support', label: 'دعم فني', icon: '🔧', color: '#6366f1' },
  { id: 'edc_viewer', label: 'مركز التطوير التربوي', icon: '👁️', color: '#84cc16' },
];

// ================================================
// Component
// ================================================

export function UsersListPage() {
  const navigate = useNavigate();

  // ⭐ فحص الصلاحيات
  const { allowed: canView, loading: checkingView } = usePermission('users.view');
  const { allowed: canCreate } = usePermission('users.create');
  const { allowed: canManage } = usePermission('users.manage');

  const hasCreatePermission = canManage || canCreate;

  const {
    allUsers,
    users,
    roles,
    loading,
    error,
    filters,
    loadUsers,
    loadRoles,
    setFilters,
    clearFilters,
    toggleActive,
    clearError,
  } = useUsersStore();

  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ⭐ للتمرير
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // ================================================
  // Effects
  // ================================================

  useEffect(() => {
    if (canView) {
      loadRoles();
      loadUsers();
    }
  }, [loadRoles, loadUsers, canView]);

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
  }, [allUsers.length]);

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
    const counts: Record<string, number> = {
      all: allUsers.length,
      region_manager: 0,
      school_manager: 0,
      tls_manager: 0,
      edu_specialist: 0,
      qa_chief: 0,
      qa_coordinator: 0,
      tech_support: 0,
      edc_viewer: 0,
    };

    allUsers.forEach((u) => {
      const codes = u.roles.map((r) => r.role_code);

      if (codes.includes('region_manager')) counts.region_manager++;
      if (codes.includes('school_manager')) counts.school_manager++;
      if (codes.includes('tls_manager')) counts.tls_manager++;
      if (codes.includes('edu_specialist')) counts.edu_specialist++;
      if (codes.includes('qa_chief')) counts.qa_chief++;
      if (codes.includes('qa_coordinator')) counts.qa_coordinator++;
      if (codes.includes('tech_support')) counts.tech_support++;
      if (codes.includes('edc_viewer')) counts.edc_viewer++;
    });

    return counts;
  }, [allUsers]);

  // ================================================
  // Handlers
  // ================================================

  const handleTabChange = (tabId: RoleGroup) => {
    setFilters({ roleGroup: tabId });
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    if (!confirm(current ? 'تعطيل هذا المستخدم؟' : 'تفعيل هذا المستخدم؟'))
      return;
    try {
      await toggleActive(id, !current);
    } catch {
      alert('فشل تحديث الحالة');
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    clearFilters();
  };

  const hasActiveFilters =
    filters.search ||
    filters.roleGroup ||
    filters.roleCode ||
    filters.isActive !== null;

  // ================================================
  // Render Guards
  // ================================================

  if (checkingView) {
    return <Loading message="جاري التحقق من الصلاحيات..." />;
  }

  if (!canView) {
    return (
      <div className="p-6 text-center text-danger">
        <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">لا تملك صلاحية الوصول</h2>
        <p>ليس لديك صلاحية لعرض المستخدمين.</p>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return <Loading message="جاري تحميل المستخدمين..." />;
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
            <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <span className="truncate">المستخدمون</span>
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            {stats.all > 0
              ? `${stats.all} مستخدم مسجل في النظام`
              : 'لا يوجد مستخدمون'}
          </p>
        </div>
        
        {/* ⭐ زر الإضافة يظهر فقط لمن يملك الصلاحية */}
        {hasCreatePermission && (
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/settings/users/new')}
            className="flex-shrink-0"
          >
            <span className="hidden sm:inline">إضافة مستخدم</span>
            <span className="sm:hidden">إضافة</span>
          </Button>
        )}
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
        {/* Tabs — Mobile */}
        <div className="sm:hidden p-3 border-b border-border">
          <label className="block text-xs font-medium text-text-muted mb-1.5">
            تصنيف المستخدمين
          </label>
          <select
            value={filters.roleGroup || ''}
            onChange={(e) =>
              handleTabChange((e.target.value || null) as RoleGroup)
            }
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {TABS.map((tab) => (
              <option key={tab.id || 'all'} value={tab.id || ''}>
                {tab.icon} {tab.label} ({stats[tab.id || 'all']})
              </option>
            ))}
          </select>
        </div>

        {/* Tabs — Desktop */}
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
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex flex-nowrap items-center gap-1 px-2 min-w-max">
              {TABS.map((tab) => (
                <TabButton
                  key={tab.id || 'all'}
                  active={filters.roleGroup === tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  label={`${tab.icon} ${tab.label}`}
                  count={stats[tab.id || 'all']}
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
              onClick={() => setFilters({ isActive: null })}
              label="📊 الكل"
              count={stats.all}
              variant="default"
            />
            <StatusButton
              active={filters.isActive === true}
              onClick={() => setFilters({ isActive: true })}
              label="🟢 نشط"
              count={allUsers.filter((u) => u.is_active).length}
              variant="success"
            />
            <StatusButton
              active={filters.isActive === false}
              onClick={() => setFilters({ isActive: false })}
              label="⛔ معطّل"
              count={allUsers.filter((u) => !u.is_active).length}
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
              placeholder="بحث بالاسم، البريد، أو اسم المستخدم..."
              className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs text-primary hover:underline whitespace-nowrap px-2"
            >
              {showFilters ? 'إخفاء ▼' : 'خيارات ▲'}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="px-3 sm:px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border pt-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                الدور
              </label>
              <select
                value={filters.roleCode || ''}
                onChange={(e) =>
                  setFilters({ roleCode: e.target.value || null })
                }
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">كل الأدوار</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                الحالة
              </label>
              <select
                value={
                  filters.isActive === null
                    ? ''
                    : filters.isActive
                    ? 'true'
                    : 'false'
                }
                onChange={(e) => {
                  const v = e.target.value;
                  setFilters({ isActive: v === '' ? null : v === 'true' });
                }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">الكل</option>
                <option value="true">نشط</option>
                <option value="false">معطّل</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Users List */}
      {loading ? (
        <Loading message="جاري التحميل..." />
      ) : users.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              {hasActiveFilters ? '🔍' : '👥'}
            </div>
            <h2 className="text-lg font-bold text-text mb-2">
              {hasActiveFilters
                ? 'لا توجد نتائج مطابقة'
                : 'لا يوجد مستخدمون'}
            </h2>
            <p className="text-text-secondary text-sm mb-4">
              {hasActiveFilters
                ? 'جرّب تغيير الفلاتر أو البحث'
                : 'ابدأ بإضافة مستخدم جديد'}
            </p>
            {hasActiveFilters ? (
              <Button variant="ghost" onClick={handleClearFilters}>
                مسح الفلاتر
              </Button>
            ) : hasCreatePermission ? (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => navigate('/settings/users/new')}
              >
                إضافة مستخدم
              </Button>
            ) : null}
          </div>
        </Card>
      ) : (
        <>
          <div className="text-sm text-text-muted">
            عرض <strong className="text-text">{users.length}</strong> من{' '}
            <strong className="text-text">{allUsers.length}</strong> مستخدم
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg-secondary border-b border-border">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-text">
                      المستخدم
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-text">
                      الأدوار
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-text">
                      الحالة
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-text">
                      آخر دخول
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-text">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border hover:bg-bg-secondary transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                         onClick={() => navigate(`/settings/users/${user.id}`)}
                          className="text-right"
                        >
                          <div className="font-medium text-text hover:text-primary">
                            {user.full_name}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {user.email}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <span className="text-xs text-text-muted">
                              لا توجد أدوار
                            </span>
                          ) : (
                            user.roles.map((r) => (
                              <span
                                key={r.assignment_id}
                                className="inline-block px-2 py-1 rounded-md text-xs bg-primary/10 text-primary"
                              >
                                {r.role_name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                            user.is_active
                              ? 'bg-success/10 text-success'
                              : 'bg-danger/10 text-danger'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.is_active ? 'bg-success' : 'bg-danger'
                            }`}
                          />
                          {user.is_active ? 'نشط' : 'معطّل'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-secondary">
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleDateString(
                                'ar-EG'
                              )
                            : 'لم يدخل بعد'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* ⭐ إجراء التعطيل/التفعيل يظهر فقط لمن يملك users.manage أو users.deactivate */}
                        {canManage && (
                          <button
                            onClick={() =>
                              handleToggleActive(user.id, user.is_active)
                            }
                            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                              user.is_active
                                ? 'text-danger hover:bg-danger/10'
                                : 'text-success hover:bg-success/10'
                            }`}
                          >
                            {user.is_active ? 'تعطيل' : 'تفعيل'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
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

export default UsersListPage;