import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, User, X, Loader2, AlertCircle } from 'lucide-react';
import { notificationsService } from '../../services/notifications.service';
import type { UserSearchResult } from '../../types/notifications.types';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

interface UserSearchComboboxProps {
  /** المستخدمون المُضافون فعليًا (لإظهار "مضاف") */
  addedUserIds?: Set<string>;
  /** المستثنون (لإظهار "مستثنى") */
  excludedUserIds?: Set<string>;
  /** عند اختيار مستخدم */
  onSelect: (user: UserSearchResult) => void;
  /** عناصر مقترحة سريعة (اختياري) */
  placeholder?: string;
  /** عدد الحروف الأدنى لبدء البحث */
  minChars?: number;
  /** تأخير debounce بالمللي ثانية */
  debounceMs?: number;
}

// ════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════

export function UserSearchCombobox({
  addedUserIds = new Set(),
  excludedUserIds = new Set(),
  onSelect,
  placeholder = 'ابحث بالاسم، البريد، أو اسم الدخول...',
  minChars = 2,
  debounceMs = 250,
}: UserSearchComboboxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // ── استعلام debounced ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < minChars) {
      setResults([]);
      setError(null);
      setLoading(false);
      setOpen(false);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      const thisRequest = ++requestIdRef.current;

      try {
        const data = await notificationsService.searchUsers(trimmed, 20, 0);
        if (requestIdRef.current !== thisRequest) return;

        setResults(data);
        setOpen(true);
        setHighlightedIndex(data.length > 0 ? 0 : -1);
      } catch (e: any) {
        if (requestIdRef.current !== thisRequest) return;
        setError(e?.message ?? 'فشل البحث');
        setResults([]);
        setOpen(true);
      } finally {
        if (requestIdRef.current === thisRequest) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, minChars, debounceMs]);

  // ── إغلاق عند النقر خارجًا ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── اختيار ──
  const pick = useCallback(
    (user: UserSearchResult) => {
      onSelect(user);
      setQuery('');
      setResults([]);
      setOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onSelect]
  );

  // ── لوحة المفاتيح ──
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => (i - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          pick(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setQuery('');
        break;
    }
  };

  // ── تمييز النص المطابق ──
  const highlightMatch = (text: string, q: string) => {
    if (!q || q.length < 2) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-warning/30 text-inherit px-0.5 rounded">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  // ── لصق قائمة بريدية ──
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    // نتحقق إن كان النص يحتوي على فاصلة أو ; أو أكثر من @ (قائمة بريدية)
    const parts = text
      .split(/[\s,;،\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length > 1 || (parts.length === 1 && parts[0].includes('@'))) {
      e.preventDefault();
      // نضع النص كاملًا في الحقل، والمستخدم يستطيع المطابقة عبر زر منفصل لاحقًا
      setQuery(text);
    }
  };

  const showDropdown = open && query.trim().length >= minChars;

  return (
    <div ref={containerRef} className="relative">
      {/* حقل البحث */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={() => query.trim().length >= minChars && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="
            w-full pr-10 pl-10 py-2.5 rounded-lg border border-border
            bg-surface text-text placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
          "
        />
        {loading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-danger"
            aria-label="مسح"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* القائمة المنسدلة */}
      {showDropdown && (
        <div
          className="
            absolute top-full right-0 left-0 mt-1
            bg-surface border border-border rounded-lg shadow-hard
            max-h-80 overflow-y-auto z-50
          "
        >
          {error && (
            <div className="p-3 text-sm text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {!error && results.length === 0 && !loading && (
            <div className="p-6 text-center text-sm text-text-muted">
              لا توجد نتائج مطابقة
            </div>
          )}

          {!error &&
            results.map((u, idx) => {
              const isAdded = addedUserIds.has(u.user_id);
              const isExcluded = excludedUserIds.has(u.user_id);
              const isDisabled = !u.is_active || !u.is_in_scope;
              const isHighlighted = idx === highlightedIndex;

              return (
                <button
                  key={u.user_id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && pick(u)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`
                    w-full flex items-center gap-3 p-3 text-right
                    border-b border-border last:border-0
                    transition-colors
                    ${isDisabled ? 'opacity-50 cursor-not-allowed bg-bg-secondary' : ''}
                    ${isHighlighted && !isDisabled ? 'bg-primary/5' : ''}
                    ${!isDisabled ? 'hover:bg-bg-secondary' : ''}
                  `}
                >
                  {/* الأفاتار */}
                  <div
                    className="
                      w-9 h-9 rounded-full bg-primary/10 text-primary
                      flex items-center justify-center flex-shrink-0
                    "
                  >
                    <User className="w-4 h-4" />
                  </div>

                  {/* المعلومات */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-text truncate">
                      {highlightMatch(u.full_name, query.trim())}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {highlightMatch(u.email, query.trim())}
                      {u.username && ` · ${highlightMatch(u.username, query.trim())}`}
                    </div>
                    {u.entity_names && (
                      <div className="text-xs text-text-muted truncate mt-0.5">
                        {u.entity_names}
                      </div>
                    )}
                  </div>

                  {/* الحالة */}
                  <div className="flex-shrink-0">
                    {isAdded && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                        مضاف
                      </span>
                    )}
                    {isExcluded && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/10 text-danger font-medium">
                        مستثنى
                      </span>
                    )}
                    {!u.is_active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-text-muted/10 text-text-muted font-medium">
                        معطّل
                      </span>
                    )}
                    {!u.is_in_scope && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                        خارج النطاق
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}