import { useState } from 'react';
import { AlertTriangle, CheckCircle2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui';
import type { EntitySuggestion } from '../../lib/permissions-api';

export interface ConfirmationItem {
  rowNumber: number;
  rawValue: string;
  field: 'region_rl' | 'region_tls';
  suggestions: EntitySuggestion[];
  selected: string[];
}

interface ConfirmationModalProps {
  open: boolean;
  items: ConfirmationItem[];
  onConfirm: (updatedItems: ConfirmationItem[]) => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  open,
  items: initialItems,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [items, setItems] = useState<ConfirmationItem[]>(initialItems);
  const [expanded, setExpanded] = useState<Set<number>>(
    new Set(initialItems.map((i) => i.rowNumber))
  );

  if (!open) return null;

  const toggleExpanded = (rowNumber: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  const toggleEntity = (rowNumber: number, entityId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.rowNumber !== rowNumber) return item;
        const has = item.selected.includes(entityId);
        return {
          ...item,
          selected: has
            ? item.selected.filter((id) => id !== entityId)
            : [...item.selected, entityId],
        };
      })
    );
  };

  const selectAll = (rowNumber: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowNumber === rowNumber
          ? { ...item, selected: item.suggestions.map((s) => s.entity_id) }
          : item
      )
    );
  };

  const clearAll = (rowNumber: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.rowNumber === rowNumber ? { ...item, selected: [] } : item
      )
    );
  };

  const handleConfirm = () => {
    const invalid = items.filter((i) => i.selected.length === 0);
    if (invalid.length > 0) {
      alert(
        `يجب اختيار كيان واحد على الأقل لكل صف. الصفوف الناقصة: ${invalid
          .map((i) => i.rowNumber)
          .join(', ')}`
      );
      return;
    }
    onConfirm(items);
  };

  const totalSelected = items.reduce(
    (sum, item) => sum + item.selected.length,
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="w-full max-w-3xl bg-surface rounded-xl shadow-2xl border border-border max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-warning/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20 text-warning">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text">
                تأكيد المناطق الإدارية
              </h3>
              <p className="text-xs text-text-muted">
                {items.length} صف يحتاج تأكيد — {totalSelected} كيان مختار
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-bg-secondary rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-primary">
            💡 الأسماء الإدارية (رفح، غزة، الوسطى، خان يونس، شمال غزة) تُطابق
            عدة كيانات. يرجى تحديد الكيانات المقصودة لكل صف.
          </div>

          {items.map((item) => {
            const isExpanded = expanded.has(item.rowNumber);
            const fieldLabel = item.field === 'region_rl' ? 'R.L' : 'TLS';
            return (
              <div
                key={item.rowNumber}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Row Header */}
                <div
                  className="flex items-center justify-between p-3 bg-bg-secondary cursor-pointer hover:bg-bg-secondary/80"
                  onClick={() => toggleExpanded(item.rowNumber)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium flex-shrink-0">
                      صف {item.rowNumber}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-warning/10 text-warning font-medium flex-shrink-0">
                      {fieldLabel}
                    </span>
                    <span className="text-sm font-medium text-text truncate">
                      "{item.rawValue}"
                    </span>
                    <span className="text-xs text-text-muted flex-shrink-0">
                      ({item.suggestions.length} كيان مقترح)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        item.selected.length === 0
                          ? 'bg-danger/10 text-danger'
                          : 'bg-success/10 text-success'
                      }`}
                    >
                      {item.selected.length} مختار
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                </div>

                {/* Row Body */}
                {isExpanded && (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => selectAll(item.rowNumber)}
                        className="text-xs text-primary hover:underline"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-text-muted">·</span>
                      <button
                        onClick={() => clearAll(item.rowNumber)}
                        className="text-xs text-text-muted hover:underline"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {item.suggestions.map((suggestion) => {
                        const isSelected = item.selected.includes(
                          suggestion.entity_id
                        );
                        return (
                          <label
                            key={suggestion.entity_id}
                            className={`
                              flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                              ${
                                isSelected
                                  ? 'bg-success/5 border border-success/30'
                                  : 'bg-surface border border-border hover:bg-bg-secondary'
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleEntity(
                                  item.rowNumber,
                                  suggestion.entity_id
                                )
                              }
                              className="w-4 h-4"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-text">
                                {suggestion.name_ar}
                              </div>
                              {suggestion.name_en && (
                                <div className="text-xs text-text-muted font-mono truncate">
                                  {suggestion.name_en}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-bg-secondary flex items-center justify-between gap-3">
          <div className="text-xs text-text-muted">
            {totalSelected} كيان سيُسند
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleConfirm}
            >
              تأكيد ومتابعة
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}