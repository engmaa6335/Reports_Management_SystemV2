import { useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, Building2, MapPin, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useEntityStore } from '../../stores/entity-store';

// ================================================
// Types
// ================================================

interface EntityOption {
  id: string;
  name_en: string;
  name_ar: string;
  phone: string | null;
  manager_name: string | null;
}

interface EntitySelectFieldProps {
  fieldType: 'school_select' | 'center_select';
  label: string;
  helpText?: string | null;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

// ================================================
// Component
// ================================================

export function EntitySelectField({
  fieldType,
  label,
  helpText,
  value,
  onChange,
  error,
  required,
}: EntitySelectFieldProps) {
  const { activeEntity } = useEntityStore();
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // ⭐ تحديد نوع الكيان
  const entityTypeCode = fieldType === 'school_select' ? 'school' : 'tls_center';
  const entityTypeName = fieldType === 'school_select' ? 'المدرسة' : 'مركز التعلم';

  // ================================================
  // Load entities (filtered by active region)
  // ================================================
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      if (!activeEntity?.entityId) {
        setOptions([]);
        setLoading(false);
        return;
      }

      // ⭐ فلترة بـ parent_id = activeEntity.entityId + النوع
      const { data, error: fetchError } = await supabase
        .from('entities')
        .select(`
          id,
          name_en,
          name_ar,
          contact_info,
          entity_type:entity_types!inner ( code )
        `)
        .eq('entity_type.code', entityTypeCode)
        .eq('parent_id', activeEntity.entityId)
        .eq('is_active', true)
        .order('name_en');

      if (fetchError) {
        console.error('❌ Error loading entities:', fetchError);
        setLoading(false);
        return;
      }

      const list: EntityOption[] = (data || []).map((e: any) => ({
        id: e.id,
        name_en: e.name_en,
        name_ar: e.name_ar,
        phone: e.contact_info?.phone || null,
        manager_name: e.contact_info?.manager_name || null,
      }));

      console.log(`✅ Loaded ${list.length} ${entityTypeCode} for region:`, activeEntity.entityName);

      setOptions(list);
      setLoading(false);
    };

    load();
  }, [activeEntity?.entityId, entityTypeCode]);

  // ================================================
  // Filter
  // ================================================
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.name_en.toLowerCase().includes(q) ||
        o.name_ar.toLowerCase().includes(q) ||
        (o.manager_name && o.manager_name.toLowerCase().includes(q))
    );
  }, [options, search]);

  const selected = options.find((o) => o.id === value);

  // ================================================
  // Render
  // ================================================
  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-text">
        {label}
        {required && <span className="text-danger mr-1">*</span>}
      </label>

      {helpText && (
        <p className="text-xs text-text-muted">{helpText}</p>
      )}

      {/* Region Badge */}
      {activeEntity && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <MapPin className="w-3 h-3" />
          <span>المنطقة: {activeEntity.entityName}</span>
          <span className="text-primary font-medium">
            ({options.length} {entityTypeName})
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="w-full px-4 py-3 rounded-lg border border-border bg-bg-secondary text-text-muted text-sm">
          جاري تحميل {entityTypeName}...
        </div>
      )}

      {/* No options */}
      {!loading && options.length === 0 && (
        <div className="px-4 py-3 rounded-lg border border-warning bg-warning/5 text-warning text-sm">
          ⚠️ لا توجد {entityTypeName} مُعرَّفة في هذه المنطقة
        </div>
      )}

      {/* Combobox */}
      {!loading && options.length > 0 && (
        <div className="relative">
          {/* Trigger */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`
              w-full px-4 py-2.5 rounded-lg border bg-surface text-right
              flex items-center gap-2 transition-all
              ${
                error
                  ? 'border-danger'
                  : 'border-border hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
              }
            `}
          >
            <ChevronDown
              className={`w-4 h-4 text-text-muted transition-transform flex-shrink-0 ${
                open ? 'rotate-180' : ''
              }`}
            />
            <span className="flex-1 text-right truncate">
              {selected ? (
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-text font-medium">
                    {selected.name_en}
                  </span>
                </span>
              ) : (
                <span className="text-text-muted">
                  — اختر {entityTypeName} —
                </span>
              )}
            </span>
            {selected && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="p-1 hover:bg-bg-secondary rounded-md"
              >
                <X className="w-3.5 h-3.5 text-text-muted" />
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`ابحث في ${entityTypeName}...`}
                    className="w-full pr-10 pl-3 py-2 rounded-md border border-border bg-bg-secondary text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                </div>
              </div>

              {/* Options */}
              <div className="max-h-64 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="text-center py-6 text-sm text-text-muted">
                    لا توجد نتائج مطابقة
                  </div>
                ) : (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={`
                        w-full text-right px-4 py-2.5 hover:bg-bg-secondary transition-colors
                        flex items-start gap-2
                        ${
                          opt.id === value
                            ? 'bg-primary/5 text-primary'
                            : 'text-text'
                        }
                      `}
                    >
                      <Building2 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{opt.name_en}</div>
                        {opt.manager_name && (
                          <div className="text-xs text-text-muted truncate">
                            👤 {opt.manager_name}
                          </div>
                        )}
                      </div>
                      {opt.id === value && (
                        <span className="text-primary text-sm">✓</span>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              {filteredOptions.length > 0 && (
                <div className="px-4 py-2 text-xs text-text-muted border-t border-border bg-bg-secondary">
                  {filteredOptions.length} من {options.length}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-danger flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}