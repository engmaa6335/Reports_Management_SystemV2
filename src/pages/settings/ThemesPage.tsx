import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Loader2, Lock } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { usePermission } from '../../hooks/usePermission';
import { listAllThemes, deleteThemeSafe, type Theme } from '../../lib/themes-api';
import { ThemeEditorModal } from './ThemeEditorModal';

export default function ThemesPage() {
  const user = useAuthStore((s) => s.user);
  const { allowed: canManage } = usePermission('themes.manage');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Theme | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setThemes(await listAllThemes());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (t: Theme) => {
    if (
      !confirm(
        `حذف الثيم "${t.name_ar}"؟ سيُرجع مستخدموه إلى الثيم الافتراضي (light).`
      )
    )
      return;
    try {
      const res = await deleteThemeSafe(t.id);
      setMsg(
        `✅ حُذف "${res.deleted_theme_code}" — أُرجع ${res.reassigned_users} مستخدم إلى "${res.reassigned_to}".`
      );
      await load();
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">إدارة الثيمات</h1>
          <p className="text-sm text-text-secondary mt-1">
            الثيم المرجعي (light) محمي. النظامية محمية من الحذف. العادية قابلة
            للتعديل والحذف الآمن.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark"
          >
            <Plus className="w-4 h-4" /> إضافة ثيم
          </button>
        )}
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-bg-secondary border border-border text-sm">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((t) => (
          <ThemeCard
            key={t.id}
            theme={t}
            canManage={canManage}
            onEdit={() => setEditing(t)}
            onDelete={() => onDelete(t)}
          />
        ))}
      </div>

      {(creating || editing) && (
        <ThemeEditorModal
          theme={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  canManage,
  onEdit,
  onDelete,
}: {
  theme: Theme;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isCanonical = theme.code === 'light' && theme.is_default;
  const canEdit = canManage && !isCanonical;
  const canDelete =
    canManage && !theme.is_system && !theme.is_default && !isCanonical;

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-soft">
      <div
        className="h-20 rounded-lg mb-3 flex items-end p-2"
        style={{
          background: theme.colors['--color-primary'],
          color: theme.colors['--color-bg'],
        }}
      >
        <span className="text-sm font-bold">{theme.name_ar}</span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-text">{theme.name_ar}</div>
          <div className="text-xs text-text-muted">{theme.code}</div>
        </div>
        <div className="flex flex-col gap-1">
          {isCanonical && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> مرجعي
            </span>
          )}
          {theme.is_system && !isCanonical && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-warning/10 text-warning font-medium">
              نظامي
            </span>
          )}
          {theme.is_default && !isCanonical && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-success/10 text-success">
              افتراضي
            </span>
          )}
          {!theme.is_active && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-danger/10 text-danger">
              معطّل
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          disabled={!canEdit}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-bg-secondary hover:bg-border text-sm disabled:opacity-40"
        >
          <Edit className="w-3.5 h-3.5" /> تعديل
        </button>
        <button
          onClick={onDelete}
          disabled={!canDelete}
          className="px-3 py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 text-sm disabled:opacity-40"
          title={
            !canDelete
              ? isCanonical
                ? 'مرجعي — لا يُحذف'
                : theme.is_system
                ? 'نظامي — لا يُحذف'
                : ''
              : 'حذف آمن'
          }
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}