import { useEffect, useState } from 'react';
import { Users, Building2, UserPlus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { EntityPicker } from './EntityPicker';
import { UserSearchCombobox } from './UserSearchCombobox';
import { useNotificationComposerStore } from '../../stores/notification-composer-store';
import { useAuthStore } from '../../stores/auth-store';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

type Tab = 'entities' | 'roles' | 'manual';

// ════════════════════════════════════════════════════════════
// RecipientBuilder
// ════════════════════════════════════════════════════════════

export function RecipientBuilder() {
  const [tab, setTab] = useState<Tab>('entities');
  const [showFinalList, setShowFinalList] = useState(true);

  const {
    intent,
    recipients,
    computingRecipients,
    addManualUser,
    removeManualUser,
    excludeUser,
    restoreUser,
    refreshRecipients,
  } = useNotificationComposerStore();

  const { user } = useAuthStore();

  // ── تحديث المستلمين عند أي تغيير ──
  useEffect(() => {
    if (user?.id) {
      refreshRecipients(user.id);
    }
  }, [intent, user?.id, refreshRecipients]);

  const addedUserIds = new Set([
    ...intent.manual_user_ids,
    ...recipients.map((r) => r.user_id),
  ]);
  const excludedUserIds = new Set(intent.excluded_user_ids);

  return (
    <div className="space-y-4">
      {/* التبويبات */}
      <Card padding="none">
        <div className="flex border-b border-border">
          {[
            { id: 'entities', label: 'الكيانات', icon: Building2, count: intent.entity_ids.length },
            { id: 'roles', label: 'الأدوار', icon: Users, count: intent.role_ids.length },
            { id: 'manual', label: 'إضافة يدوية', icon: UserPlus, count: intent.manual_user_ids.length },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as Tab)}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium
                border-b-2 transition-colors
                ${tab === id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-text-secondary hover:text-text hover:bg-bg-secondary'}
              `}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span
                  className={`
                    text-[10px] min-w-[18px] h-[18px] px-1 rounded-full
                    flex items-center justify-center font-bold
                    ${tab === id ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'entities' && <EntityPicker />}

          {tab === 'roles' && <RolesPicker />}

          {tab === 'manual' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-text">
                أضف مستخدمين بالاسم أو البريد أو اسم الدخول
              </p>
              <UserSearchCombobox
                addedUserIds={addedUserIds}
                excludedUserIds={excludedUserIds}
                onSelect={(u) => addManualUser(u.user_id)}
              />
              <p className="text-xs text-text-muted">
                ابحث بحرفين على الأقل. لا تُنشأ حسابات جديدة.
              </p>

              {/* الشارات المختارة */}
              {intent.manual_user_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                  {intent.manual_user_ids.map((id) => {
                    const r = recipients.find((x) => x.user_id === id);
                    const label = r?.full_name ?? id.slice(0, 8);
                    return (
                      <span
                        key={id}
                        className="
                          inline-flex items-center gap-1.5 px-3 py-1.5
                          rounded-full bg-primary/10 text-primary text-xs font-medium
                        "
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() => removeManualUser(id)}
                          className="
                            w-4 h-4 rounded-full bg-primary/20 hover:bg-danger hover:text-white
                            flex items-center justify-center transition-colors
                          "
                          aria-label={`إزالة ${label}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* القائمة النهائية */}
      <Card padding="none">
        <button
          type="button"
          onClick={() => setShowFinalList((s) => !s)}
          className="
            w-full flex items-center justify-between p-4
            hover:bg-bg-secondary transition-colors
          "
        >
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-text">
              قائمة المستلمين النهائية
            </span>
            <span className="text-sm px-3 py-1 rounded-full bg-success/10 text-success font-bold">
              {recipients.length} مستلم
            </span>
            {computingRecipients && (
              <span className="text-xs text-primary animate-pulse">جاري الحساب...</span>
            )}
          </div>
          {showFinalList ? (
            <ChevronUp className="w-5 h-5 text-text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-muted" />
          )}
        </button>

        {showFinalList && (
          <div className="border-t border-border max-h-96 overflow-y-auto">
            {recipients.length === 0 && (
              <div className="p-6 text-center text-sm text-text-muted">
                لم يتم اختيار مستلمين بعد.
              </div>
            )}

            {recipients.map((r) => (
              <div
                key={r.user_id}
                className="
                  flex items-center justify-between gap-3 p-3
                  border-b border-border last:border-0 hover:bg-bg-secondary
                "
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-text truncate">
                    {r.full_name}
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    {r.email}
                  </div>
                  <div className="text-[10px] text-text-muted mt-1 flex flex-wrap gap-1">
                    {r.sources.map((s, i) => (
                      <span
                        key={i}
                        className={`
                          px-2 py-0.5 rounded-full font-medium
                          ${s.type === 'entity' ? 'bg-primary/10 text-primary' : ''}
                          ${s.type === 'role' ? 'bg-info/10 text-info' : ''}
                          ${s.type === 'manual' ? 'bg-purple-500/10 text-purple-600' : ''}
                        `}
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => excludeUser(r.user_id)}
                  className="
                    text-xs px-3 py-1.5 rounded-lg text-danger
                    hover:bg-danger/10 transition-colors flex-shrink-0
                  "
                >
                  استبعاد
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* المستثنون */}
      {intent.excluded_user_ids.length > 0 && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text">
                المستثنون ({intent.excluded_user_ids.length})
              </span>
            </div>
            <div className="space-y-2">
              {intent.excluded_user_ids.map((id) => {
                const u = recipients.find((r) => r.user_id === id);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-danger/5"
                  >
                    <span className="text-sm text-text truncate">
                      {u?.full_name ?? id.slice(0, 8)}
                    </span>
                    <button
                      type="button"
                      onClick={() => restoreUser(id)}
                      className="text-xs text-success hover:underline flex-shrink-0"
                    >
                      إعادة إضافة
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// RolesPicker — قائمة الأدوار
// ════════════════════════════════════════════════════════════

function RolesPicker() {
  const { intent, addRole, removeRole } = useNotificationComposerStore();
  const [roles, setRoles] = useState<Array<{ id: string; name_ar: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('roles')
          .select('id, name_ar, code')
          .eq('is_active', true)
          .order('name_ar');
        setRoles(data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-text-muted text-center py-4">جاري التحميل...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text">
        اختر أدوارًا — كل من يحمل هذا الدور سيصله التنبيه
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {roles.map((r) => {
          const isSelected = intent.role_ids.includes(r.id);
          return (
            <label
              key={r.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                transition-colors
                ${isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-bg-secondary'}
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() =>
                  isSelected ? removeRole(r.id) : addRole(r.id)
                }
                className="w-4 h-4 rounded accent-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-text">{r.name_ar}</div>
                <div className="text-xs text-text-muted">{r.code}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}