import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Upload,
  Users,
  Key,
  FileCheck,
  AlertTriangle,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { Card, Button } from '../../components/ui';
import {
  getBulkImportJobs,
  getAllPermissions,
  getActiveRoles,
} from '../../lib/permissions-api';

export function PermissionsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    permissions: 0,
    roles: 0,
    jobs: 0,
    lastJobStatus: '—',
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [permissions, roles, jobs] = await Promise.all([
          getAllPermissions(),
          getActiveRoles(),
          getBulkImportJobs(),
        ]);

        setStats({
          permissions: permissions.length,
          roles: roles.length,
          jobs: jobs.length,
          lastJobStatus: jobs[0]?.status || '—',
        });
        setRecentJobs(jobs.slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'فشل تحميل البيانات');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          إدارة الأدوار والصلاحيات
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          مركز التحكم بالوصول — الدعم الفني فقط
        </p>
      </div>

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Key className="w-5 h-5" />}
          label="الصلاحيات"
          value={stats.permissions}
          color="blue"
        />
        <StatCard
          icon={<Shield className="w-5 h-5" />}
          label="الأدوار"
          value={stats.roles}
          color="green"
        />
        <StatCard
          icon={<FileCheck className="w-5 h-5" />}
          label="عمليات الاستيراد"
          value={stats.jobs}
          color="amber"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="آخر عملية"
          value={0}
          displayValue={stats.lastJobStatus}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold mb-4">⚡ إجراءات سريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ActionCard
            icon={<Upload className="w-6 h-6" />}
            title="استيراد جماعي من Excel"
            description="إعادة تعيين إسنادات المختصين والمنسقين دفعة واحدة"
            onClick={() => navigate('/settings/permissions/bulk-import')}
          />
          <ActionCard
            icon={<Users className="w-6 h-6" />}
            title="صلاحيات مستخدم"
            description="عرض وإدارة الأدوار والاستثناءات لمستخدم محدد"
            onClick={() => navigate('/settings/users')}
          />
        </div>
      </Card>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">📋 آخر عمليات الاستيراد</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings/permissions/bulk-import')}
            >
              عرض الكل
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {job.file_name || '—'}
                  </div>
                  <div className="text-xs text-text-muted">
                    {new Date(job.started_at).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded ${
                    job.status === 'completed'
                      ? 'bg-success/10 text-success'
                      : job.status === 'rolled_back'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-bg-secondary text-text-muted'
                  }`}>
                    {job.status === 'completed'
                      ? 'مكتمل'
                      : job.status === 'rolled_back'
                      ? 'متراجع'
                      : job.status}
                  </span>
                  <span className="text-xs text-text-muted">
                    ✅ {job.created_rows} / ❌ {job.unmatched_rows}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  displayValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  displayValue?: string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const colors = {
    blue: 'bg-primary/10 text-primary',
    green: 'bg-success/10 text-success',
    amber: 'bg-warning/10 text-warning',
    purple: 'bg-purple-500/10 text-purple-600',
  };
  return (
    <Card padding="md">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <div className="text-xs text-text-muted">{label}</div>
          <div className="text-xl font-bold text-text">
            {displayValue ?? value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg border border-border bg-surface hover:border-primary hover:bg-primary/5 transition-all text-right flex items-start gap-3"
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-text">{title}</div>
        <div className="text-xs text-text-secondary mt-1">{description}</div>
      </div>
    </button>
  );
}