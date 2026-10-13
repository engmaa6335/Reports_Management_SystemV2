import { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

// ================================================
// Types
// ================================================

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  emptyMessage?: string;
}

// ================================================
// Component
// ================================================

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '— اختر —',
  disabled = false,
  hasError = false,
  emptyMessage = 'لا توجد خيارات',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected option
  const selectedOption = options.find((o) => o.value === value);

  // Filter options
  const filteredOptions = options.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.label.toLowerCase().includes(q) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(q))
    );
  });

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Handlers
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`w-full px-4 py-2.5 rounded-lg border bg-surface text-right transition-all flex items-center gap-2 ${
          hasError ? 'border-danger' : 'border-border'
        } ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
        }`}
      >
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform flex-shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
        />
        <span className="flex-1 text-right truncate">
          {selectedOption ? (
            <span className="text-text">
              {selectedOption.icon && (
                <span className="ml-2">{selectedOption.icon}</span>
              )}
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="text-text-muted text-xs mr-2">
                  — {selectedOption.sublabel}
                </span>
              )}
            </span>
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </span>
        {selectedOption && !disabled && (
          <span
            onClick={handleClear}
            className="p-1 hover:bg-bg-secondary rounded-md transition-colors"
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
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث..."
                className="w-full pr-10 pl-3 py-2 rounded-md border border-border bg-bg-secondary text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-6 text-sm text-text-muted">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-right px-4 py-2.5 hover:bg-bg-secondary transition-colors flex items-center gap-2 ${
                    opt.value === value ? 'bg-primary/5 text-primary' : 'text-text'
                  }`}
                >
                  {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                  <span className="flex-1">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="text-text-muted text-xs">
                      {opt.sublabel}
                    </span>
                  )}
                  {opt.value === value && (
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
  );
}