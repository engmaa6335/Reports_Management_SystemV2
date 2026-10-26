import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from './lib/supabase';

import { useAuthStore } from './stores/auth-store';
import { useEntityStore } from './stores/entity-store';
import { useThemeStore } from './stores/theme-store';
import { usePagesStore } from './stores/pages-store';
import { usePermission } from './hooks/usePermission';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { EntitySelectorPage } from './pages/entity/EntitySelectorPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ReportsListPage } from './pages/reports/ReportsListPage';
import { CreateReportPage } from './pages/reports/CreateReportPage';
import { ViewReportPage } from './pages/reports/ViewReportPage';
import { EditReportPage } from './pages/reports/EditReportPage';
import AggregatesListPage from './pages/aggregates/AggregatesListPage';
import { CreateAggregatePage } from './pages/aggregates/CreateAggregatePage';
import { ViewAggregatePage } from './pages/aggregates/ViewAggregatePage';
import { EditAggregatePage } from './pages/aggregates/EditAggregatePage';

// ⭐ Aggregate Summaries
import { SummariesListPage } from './pages/aggregate-summaries/SummariesListPage';
import { CreateSummaryPage } from './pages/aggregate-summaries/CreateSummaryPage';
import { ViewSummaryPage } from './pages/aggregate-summaries/ViewSummaryPage';

import { Loading } from './components/ui/Loading';
import { NotificationsPage } from './pages/notifications/NotificationsPage';

// ⭐ Users
import { UsersListPage } from './pages/users/UsersListPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { CreateUserPage } from './pages/users/CreateUserPage';

// ⭐ Entities
import { EntitiesPage } from './pages/admin/entities/EntitiesPage';
import { EntityDetailPage } from './pages/admin/entities/EntityDetailPage';
import { EntityFormPage } from './pages/admin/entities/EntityFormPage';

// ⭐ Templates
import { TemplatesPage } from './pages/admin/templates/TemplatesPage';
import { TemplateFormPage } from './pages/admin/templates/TemplateFormPage';
import { TemplateDetailPage } from './pages/admin/templates/TemplateDetailPage';
import { FieldFormPage } from './pages/admin/templates/FieldFormPage';

// ⭐ Settings
import { SettingsLayout } from './pages/settings/SettingsLayout';
import { SettingsPage } from './pages/settings/SettingsPage';
import { AggregateSummariesSettingsPage } from './pages/settings/AggregateSummariesSettingsPage';

// ⭐ Notifications Admin
import { NotificationsAdminPage } from './pages/admin/notifications/NotificationsAdminPage';
import { NotificationRulesPage } from './pages/admin/notifications/NotificationRulesPage';
import { NotificationRuleFormPage } from './pages/admin/notifications/NotificationRuleFormPage';
import { NotificationTemplatesPage } from './pages/admin/notifications/NotificationTemplatesPage';
import { NotificationTemplateFormPage } from './pages/admin/notifications/NotificationTemplateFormPage';
import { NotificationLogPage } from './pages/admin/notifications/NotificationLogPage';
import { NotificationChannelsPage } from './pages/admin/notifications/NotificationChannelsPage';
import { SendManualNotificationPage } from './pages/admin/notifications/SendManualNotificationPage';
import { NotificationLogDetailPage } from './pages/admin/notifications/NotificationLogDetailPage';

// ⭐ Permissions
import { PermissionsDashboard } from './pages/permissions/PermissionsDashboard';
import { BulkImportPage } from './pages/permissions/BulkImportPage';
import { UserPermissionsPage } from './pages/permissions/UserPermissionsPage';
import { RolesPage } from './pages/permissions/RolesPage';

// ⭐ Themes
import ThemesPage from './pages/settings/ThemesPage';
import ResetUserThemesPage from './pages/settings/ResetUserThemesPage';

// ⭐ Profile
import ProfilePage from './pages/profile/ProfilePage';

// ═══════════════════════════════════════════════════════════
// ⭐ حماية المسارات (توجيه فوري)
// ═══════════════════════════════════════════════════════════

function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { allowed, loading } = usePermission(permission);

  if (loading) {
    return <Loading fullScreen message="جاري التحقق من الصلاحيات..." />;
  }

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════
// AdminRedirect
// ═══════════════════════════════════════════════════════════

function AdminRedirect() {
  const location = useLocation();
  const subPath = location.pathname.replace(/^\/admin/, '');
  const target = `/settings${subPath}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}

function App() {
  const { initialize, initialized, user } = useAuthStore();
  const {
    clearEntities,
    loadUserEntities,
    initialized: entitiesInitialized,
  } = useEntityStore();

  const initTheme = useThemeStore((s) => s.init);
  const { i18n } = useTranslation();

  // ⭐ Pages store
  const loadPages = usePagesStore((s) => s.loadPages);
  const clearPages = usePagesStore((s) => s.clearPages);
  const pagesInitialized = usePagesStore((s) => s.initialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user && !entitiesInitialized) {
      loadUserEntities(user.id);
    }
  }, [user, entitiesInitialized, loadUserEntities]);

  // ⭐ Load pages after login (for dynamic sidebar)
  useEffect(() => {
    if (user?.id && !pagesInitialized) {
      loadPages();
    }
  }, [user?.id, pagesInitialized, loadPages]);

  useEffect(() => {
    if (initialized && !user) {
      clearEntities();
      clearPages();
    }
  }, [initialized, user, clearEntities, clearPages]);

  useEffect(() => {
    if (user?.id) {
      initTheme(user.id);
    }
  }, [user?.id, initTheme]);

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('language')
        .eq('user_id', user.id)
        .maybeSingle();

      const savedLang = data?.language || user.preferredLanguage || 'ar';

      if (savedLang !== i18n.language) {
        await i18n.changeLanguage(savedLang);
      }
    })();
  }, [user?.id, user?.preferredLanguage, i18n]);

  if (!initialized) {
    return <Loading fullScreen message="جاري تحميل النظام..." />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/select-entity"
          element={
            <ProtectedRoute>
              <EntitySelectorPage />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Reports */}
          <Route path="/reports" element={<ReportsListPage />} />
          <Route path="/reports/new" element={<CreateReportPage />} />
          <Route path="/reports/new/:templateId" element={<CreateReportPage />} />
          <Route path="/reports/:id" element={<ViewReportPage />} />
          <Route path="/reports/:id/edit" element={<EditReportPage />} />

          {/* Aggregates */}
          <Route path="/aggregates" element={<AggregatesListPage />} />
          <Route path="/aggregates/new" element={<CreateAggregatePage />} />
          <Route path="/aggregates/new/:templateId" element={<CreateAggregatePage />} />
          <Route path="/aggregates/:id" element={<ViewAggregatePage />} />
          <Route path="/aggregates/:id/edit" element={<EditAggregatePage />} />

          {/* ⭐ Aggregate Summaries */}
          <Route
            path="/aggregate-summaries"
            element={
              <RequirePermission permission="aggregate_summaries.view">
                <SummariesListPage />
              </RequirePermission>
            }
          />
          <Route
            path="/aggregate-summaries/new"
            element={
              <RequirePermission permission="aggregate_summaries.create">
                <CreateSummaryPage />
              </RequirePermission>
            }
          />
          <Route
            path="/aggregate-summaries/:id"
            element={
              <RequirePermission permission="aggregate_summaries.view">
                <ViewSummaryPage />
              </RequirePermission>
            }
          />

          {/* ⭐ Profile */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* ⭐ Settings (محمي بالكامل) */}
          <Route
            path="/settings"
            element={
              <RequirePermission permission="settings.view">
                <SettingsLayout />
              </RequirePermission>
            }
          >
            <Route index element={<SettingsPage />} />

            {/* ⭐ Templates */}
            <Route
              path="templates"
              element={
                <RequirePermission permission="templates.view">
                  <TemplatesPage />
                </RequirePermission>
              }
            />
            <Route
              path="templates/new"
              element={
                <RequirePermission permission="templates.create">
                  <TemplateFormPage />
                </RequirePermission>
              }
            />
            <Route
              path="templates/:id/edit"
              element={
                <RequirePermission permission="templates.edit">
                  <TemplateFormPage />
                </RequirePermission>
              }
            />
            <Route
              path="templates/:id/fields/new"
              element={
                <RequirePermission permission="templates.manage">
                  <FieldFormPage />
                </RequirePermission>
              }
            />
            <Route
              path="templates/:id/fields/:fieldId/edit"
              element={
                <RequirePermission permission="templates.manage">
                  <FieldFormPage />
                </RequirePermission>
              }
            />
            <Route
              path="templates/:id"
              element={
                <RequirePermission permission="templates.view">
                  <TemplateDetailPage />
                </RequirePermission>
              }
            />

            {/* ⭐ Aggregate Summaries Settings */}
            <Route
              path="aggregate-summaries"
              element={
                <RequirePermission permission="aggregate_summaries.manage">
                  <AggregateSummariesSettingsPage />
                </RequirePermission>
              }
            />

            {/* ⭐ Notifications Admin */}
            <Route
              path="notifications"
              element={
                <RequirePermission permission="notifications.manage">
                  <NotificationsAdminPage />
                </RequirePermission>
              }
            >
              <Route index element={<Navigate to="rules" replace />} />
              <Route path="rules" element={<NotificationRulesPage />} />
              <Route path="rules/new" element={<NotificationRuleFormPage />} />
              <Route path="rules/:id/edit" element={<NotificationRuleFormPage />} />
              <Route path="templates" element={<NotificationTemplatesPage />} />
              <Route path="templates/new" element={<NotificationTemplateFormPage />} />
              <Route path="templates/:id/edit" element={<NotificationTemplateFormPage />} />
              <Route path="log" element={<NotificationLogPage />} />
              <Route path="log/:id" element={<NotificationLogDetailPage />} />
              <Route path="channels" element={<NotificationChannelsPage />} />
              <Route path="send-manual" element={<SendManualNotificationPage />} />
            </Route>

            {/* ⭐ Users */}
            <Route
              path="users"
              element={
                <RequirePermission permission="users.view">
                  <UsersListPage />
                </RequirePermission>
              }
            />
            <Route
              path="users/new"
              element={
                <RequirePermission permission="users.create">
                  <CreateUserPage />
                </RequirePermission>
              }
            />
            <Route
              path="users/:id"
              element={
                <RequirePermission permission="users.view">
                  <UserDetailPage />
                </RequirePermission>
              }
            />

            {/* ⭐ Entities */}
            <Route
              path="entities"
              element={
                <RequirePermission permission="entities.view">
                  <EntitiesPage />
                </RequirePermission>
              }
            />
            <Route
              path="entities/new"
              element={
                <RequirePermission permission="entities.create">
                  <EntityFormPage />
                </RequirePermission>
              }
            />
            <Route
              path="entities/:id/edit"
              element={
                <RequirePermission permission="entities.edit">
                  <EntityFormPage />
                </RequirePermission>
              }
            />
            <Route
              path="entities/:id"
              element={
                <RequirePermission permission="entities.view">
                  <EntityDetailPage />
                </RequirePermission>
              }
            />

            {/* ⭐ Permissions & Roles */}
            <Route
              path="permissions"
              element={
                <RequirePermission permission="permissions.manage">
                  <PermissionsDashboard />
                </RequirePermission>
              }
            />
            <Route
              path="permissions/bulk-import"
              element={
                <RequirePermission permission="bulk_import.execute">
                  <BulkImportPage />
                </RequirePermission>
              }
            />
            <Route
              path="permissions/users/:id"
              element={
                <RequirePermission permission="permissions.admin_override">
                  <UserPermissionsPage />
                </RequirePermission>
              }
            />
            <Route
              path="roles"
              element={
                <RequirePermission permission="roles.view">
                  <RolesPage />
                </RequirePermission>
              }
            />

            {/* ⭐ Themes */}
            <Route
              path="themes"
              element={
                <RequirePermission permission="themes.view">
                  <ThemesPage />
                </RequirePermission>
              }
            />
            <Route
              path="themes/reset"
              element={
                <RequirePermission permission="users.manage">
                  <ResetUserThemesPage />
                </RequirePermission>
              }
            />
          </Route>

          <Route path="/admin/*" element={<AdminRedirect />} />
          <Route
            path="/notifications"
            element={
              <RequirePermission permission="notifications.view">
                <NotificationsPage />
              </RequirePermission>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;