import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useAuthStore } from './stores/auth-store';
import { useEntityStore } from './stores/entity-store';
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

// ================================================
// ⭐ AdminRedirect — يحافظ على المسار الفرعي
// ================================================

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

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user && !entitiesInitialized) {
      loadUserEntities(user.id);
    }
  }, [user, entitiesInitialized, loadUserEntities]);

  useEffect(() => {
    if (initialized && !user) {
      clearEntities();
    }
  }, [initialized, user, clearEntities]);

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
          <Route
            path="/reports/new/:templateId"
            element={<CreateReportPage />}
          />
          <Route path="/reports/:id" element={<ViewReportPage />} />
          <Route path="/reports/:id/edit" element={<EditReportPage />} />

          {/* Aggregates */}
          <Route path="/aggregates" element={<AggregatesListPage />} />
          <Route path="/aggregates/new" element={<CreateAggregatePage />} />
          <Route
            path="/aggregates/new/:templateId"
            element={<CreateAggregatePage />}
          />
          <Route path="/aggregates/:id" element={<ViewAggregatePage />} />
          <Route
            path="/aggregates/:id/edit"
            element={<EditAggregatePage />}
          />

          {/* ⭐ Settings — كل الإدارة */}
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<SettingsPage />} />

            {/* ⭐ Templates */}
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="templates/new" element={<TemplateFormPage />} />
            <Route
              path="templates/:id/edit"
              element={<TemplateFormPage />}
            />
            <Route
              path="templates/:id/fields/new"
              element={<FieldFormPage />}
            />
            <Route
              path="templates/:id/fields/:fieldId/edit"
              element={<FieldFormPage />}
            />
            <Route
              path="templates/:id"
              element={<TemplateDetailPage />}
            />

            {/* ⭐⭐⭐ إدارة التنبيهات — وحدة كاملة */}
            <Route path="notifications" element={<NotificationsAdminPage />}>
              <Route index element={<Navigate to="rules" replace />} />

              {/* القواعد — القائمة ثم النموذج */}
              <Route path="rules" element={<NotificationRulesPage />} />
              <Route path="rules/new" element={<NotificationRuleFormPage />} />
              <Route
                path="rules/:id/edit"
                element={<NotificationRuleFormPage />}
              />

              {/* القوالب — القائمة ثم النموذج */}
              <Route path="templates" element={<NotificationTemplatesPage />} />
              <Route
                path="templates/new"
                element={<NotificationTemplateFormPage />}
              />
              <Route
                path="templates/:id/edit"
                element={<NotificationTemplateFormPage />}
              />

              {/* السجل */}
             <Route path="log" element={<NotificationLogPage />} />
              <Route path="log/:id" element={<NotificationLogDetailPage />} />

              {/* القنوات */}
              <Route path="channels" element={<NotificationChannelsPage />} />

              {/* الإرسال المخصص */}
              <Route
                path="send-manual"
                element={<SendManualNotificationPage />}
              />
            </Route>

            {/* ⭐ Users */}
            <Route path="users" element={<UsersListPage />} />
            <Route path="users/new" element={<CreateUserPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />

            {/* ⭐ Entities */}
            <Route path="entities" element={<EntitiesPage />} />
            <Route path="entities/new" element={<EntityFormPage />} />
            <Route
              path="entities/:id/edit"
              element={<EntityFormPage />}
            />
            <Route path="entities/:id" element={<EntityDetailPage />} />

            {/* Roles, Themes — قريبًا */}
            <Route
              path="roles"
              element={
                <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-muted">
                  🛡️ إدارة الأدوار — قريباً
                </div>
              }
            />
            <Route
              path="themes"
              element={
                <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-muted">
                  🎨 إدارة الثيمات — قريباً
                </div>
              }
            />
          </Route>

          {/* ⭐ Redirects من /admin/* → /settings/* */}
          <Route path="/admin/*" element={<AdminRedirect />} />

          {/* Notifications — صفحة المستخدم العادي */}
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;