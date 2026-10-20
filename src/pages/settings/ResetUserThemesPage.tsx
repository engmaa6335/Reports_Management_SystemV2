import { useEffect, useMemo, useState } from 'react';
import { Search, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermission } from '../../hooks/usePermission';
import { bulkResetUserThemes } from '../../lib/themes-api';

interface UserRow {
  id: string;
  full_name: string;
  username: string;
  email: string;
  employee_number: string | null;
  current_theme: string | null;
}

export default function ResetUserThemesPage() {
  const { allowed, loading: permLoading } = usePermission('users.manage');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          id, full_name, username, email, employee_number,
          user_preferences ( theme_code )
        `
        )
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      setUsers(
        (data || []).map((u: any) => ({
          id: u.id,
          full_name: u.full_name,
          username: u.username,
          email: u.email,
          employee_number: u.employee_number,
          current_theme: u.user_preferences?.theme_code ?? 'light',
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employee_number ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected(
      selected.size === filtered.length
        ? new Set()
        : new Set(filtered.map((u) => u.id))
    );

  const resetSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`إعادة تعيين ثيم ${selected.size} مستخدم إلى الافتراضي (light)؟`))
      return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await bulkResetUserThemes(Array.from(selected));
      setMsg(`✅ أُعيد تعيين ${res.updated} مستخدم إلى "${res.theme}".`);
      setSelected(new Set());
      await load();
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (permLoading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin inline" />
      </div>
    );
  }
  if (!allowed) {
    return <div className="p-6 text-center text-danger">لا تملك صلاحية الوصول.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">إعادة تعيين ثيمات المستخدمين</h1>
        <p className="text-sm text-text-secondary mt-1">
          اختر مستخدماً أو أكثر لإرجاعهم إلى الثيم الافتراضي (light).
        </p>
      </div>

      {msg && (
        <div className="p-3 rounded-lg bg-bg-secondary border border-border text-sm">
          {msg}
        </div>
      )}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم / المستخدم / البريد / الرقم الوظيفي…"
          className="w-full pr-10 pl-3 py-2 rounded-lg border border-border bg-surface text-sm"
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-border">
        <div className="text-sm text-text-secondary">
          محدد: <span className="font-bold text-text">{selected.size}</span> من{' '}
          {filtered.length}
        </div>
        <button
          onClick={resetSelected}
          disabled={busy || selected.size === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          إعادة تعيين المحددين
        </button>
      </div>

      {loading ? (
        <div className="text-center p-6">
          <Loader2 className="w-6 h-6 animate-spin inline" />
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selected.size === filtered.length && filtered.length > 0
                    }
                    onChange={toggleAll}
                  />
                </th>
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">المستخدم</th>
                <th className="p-3 text-right">الرقم الوظيفي</th>
                <th className="p-3 text-right">الثيم الحالي</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isLight = u.current_theme === 'light';
                return (
                  <tr
                    key={u.id}
                    className="border-t border-border hover:bg-bg-secondary"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggle(u.id)}
                        disabled={isLight}
                      />
                    </td>
                    <td className="p-3">{u.full_name}</td>
                    <td className="p-3 text-text-secondary">{u.username}</td>
                    <td className="p-3 text-text-muted">
                      {u.employee_number ?? '—'}
                    </td>
                    <td className="p-3">
                      {isLight ? (
                        <span className="flex items-center gap-1 text-success text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> light
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary">
                          {u.current_theme ?? '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-text-muted">
                    لا نتائج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}