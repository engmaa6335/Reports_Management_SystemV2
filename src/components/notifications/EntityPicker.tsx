import { useEffect, useMemo, useState } from 'react';
import { Building2, Search, X, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { useNotificationComposerStore } from '../../stores/notification-composer-store';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

interface EntityRow {
  id: string;
  name_ar: string;
  entity_type_id: string | null;
  member_count: number;
}

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export function EntityPicker() {
  const { intent, addEntity, removeEntity } = useNotificationComposerStore();
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ── جلب الكيانات النشطة ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: entitiesData, error: entitiesError } = await supabase
          .from('entities')
          .select('id, name_ar, entity_type_id')
          .eq('is_active', true)
          .order('name_ar')
          .limit(500);

        if (entitiesError) throw entitiesError;

        const { data: membersData, error: membersError } = await supabase
          .from('user_entity_roles')
          .select('entity_id')
          .is('ended_at', null);

        if (membersError) throw membersError;

        if (cancelled) return;

        const countMap = new Map<string, number>();
        for (const row of membersData ?? []) {
          const eid = (row as { entity_id: string }).entity_id;
          countMap.set(eid, (countMap.get(eid) ?? 0) + 1);
        }

        const rows: EntityRow[] = (entitiesData ?? []).map((e: any) => ({
          id: e.id,
          name_ar: e.name_ar,
          entity_type_id: e.entity_type_id,
          member_count: countMap.get(e.id) ?? 0,
        }));

        setEntities(rows);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'فشل تحميل الكيانات');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── تصفية حسب البحث ──
  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return entities;
    return entities.filter((e) => e.name_ar.includes(q));
  }, [entities, search]);

  const selectedIds = new Set(intent.entity_ids);

  return (
    <Card>
      <div className="space-y-4">
        {/* العنوان */}
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-text">
            اختر كيانًا أو أكثر
          </h3>
          {selectedIds.size > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {selectedIds.size} مختار
            </span>
          )}
        </div>

        {/* البحث */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن كيان..."
            className="
              w-full pr-10 pl-4 py-2.5 rounded-lg border border-border
              bg-surface text-text placeholder:text-text-muted
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            "
          />
        </div>

        {/* الحالة */}
        {loading && (
          <p className="text-sm text-text-muted text-center py-4">
            جاري تحميل الكيانات...
          </p>
        )}

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* القائمة */}
        {!loading && !error && (
          <div className="border border-border rounded-lg max-h-96 overflow-y-auto divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-text-muted">
                لا توجد كيانات مطابقة.
              </p>
            ) : (
              filtered.map((entity) => {
                const isSelected = selectedIds.has(entity.id);
                return (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() =>
                      isSelected
                        ? removeEntity(entity.id)
                        : addEntity(entity.id)
                    }
                    className={`
                      w-full flex items-center gap-3 p-3 text-right
                      transition-colors
                      ${isSelected ? 'bg-primary/5' : 'hover:bg-bg-secondary'}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-4 h-4 rounded accent-primary pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text truncate">
                        {entity.name_ar}
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3" />
                        {entity.member_count} عضو
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-xs text-primary font-medium">
                        مختار
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* الشارات المختارة */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {intent.entity_ids.map((id) => {
              const entity = entities.find((e) => e.id === id);
              if (!entity) return null;
              return (
                <span
                  key={id}
                  className="
                    inline-flex items-center gap-1.5 px-3 py-1.5
                    rounded-full bg-primary/10 text-primary text-xs font-medium
                  "
                >
                  {entity.name_ar}
                  <button
                    type="button"
                    onClick={() => removeEntity(id)}
                    className="
                      w-4 h-4 rounded-full bg-primary/20 hover:bg-danger hover:text-white
                      flex items-center justify-center transition-colors
                    "
                    aria-label={`إزالة ${entity.name_ar}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}