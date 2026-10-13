import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { AggregatesListPage } from './pages/aggregates/AggregatesListPage';
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

            {/* ⭐ Templates — الترتيب حساس! */}
            {/* 1. قائمة القوالب */}
            <Route path="templates" element={<TemplatesPage />} />

            {/* 2. إضافة قالب */}
            <Route path="templates/new" element={<TemplateFormPage />} />

            {/* 3. تعديل قالب */}
            <Route
              path="templates/:id/edit"
              element={<TemplateFormPage />}
            />

            {/* 4. حقول القالب — قبل templates/:id */}
            <Route
              path="templates/:id/fields/new"
              element={<FieldFormPage />}
            />
            <Route
              path="templates/:id/fields/:fieldId/edit"
              element={<FieldFormPage />}
            />

            {/* 5. تفاصيل القالب — الأخير */}
            <Route
              path="templates/:id"
              element={<TemplateDetailPage />}
            />

            {/* Notifications */}
            <Route
              path="notifications"
              element={
                <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-muted">
                  🔔 إدارة التنبيهات — قريباً
                </div>
              }
            />

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

            {/* Roles, Themes */}
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
          <Route
            path="/admin/users/*"
            element={<Navigate to="/settings/users" replace />}
          />
          <Route
            path="/admin/entities/*"
            element={<Navigate to="/settings/entities" replace />}
          />
          <Route
            path="/admin/roles"
            element={<Navigate to="/settings/roles" replace />}
          />
          <Route
            path="/admin/themes"
            element={<Navigate to="/settings/themes" replace />}
          />

          {/* Notifications */}
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;