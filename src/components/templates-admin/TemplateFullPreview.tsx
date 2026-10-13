import { useEffect, useMemo, useState } from 'react';
import { X, Edit2, AlertCircle, Info } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { DynamicField } from '../../components/reports/DynamicField';
import type { FormField } from '../../types/templates-admin';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface TemplateFullPreviewProps {
  isOpen: boolean;
  templateName: string;
  templateCode: string;
  fields: FormField[];
  onClose: () => void;
  onCreateReport?: () => void;   // ⭐ اختياري — للانتقال لإنشاء تقرير
}

// ═══════════════════════════════════════════════════════════
// Helpers — من CreateReportPage
// ═══════════════════════════════════════════════════════════

function isFullWidthField(field: any): boolean {
  if (['indicator_group', 'textarea'].includes(field.field_type)) {
    return true;
  }

  const opts = (field.options as any) || {};
  if (opts.full_width === true) {
    return true;
  }

  return false;
}

interface SectionData {
  key: string;
  title: string;
  icon: string;
  description?: string;
  accentColor: 'primary' | 'success' | 'warning' | 'info';
  order: number;
  fields: any[];
}

function extractSections(fields: any[]): SectionData[] {
  const map = new Map<string, SectionData>();

  fields.forEach((field) => {
    const opts = (field.options as any) || {};
    const sectionOpts = opts.section || {};

    const key = sectionOpts.key || 'default';
    const accent = sectionOpts.accent_color || 'primary';

    if (!map.has(key)) {
      map.set(key, {
        key,
        title: sectionOpts.title || '📌 حقول',
        icon: sectionOpts.icon || '📌',
        description: sectionOpts.description,
        accentColor: ['primary', 'success', 'warning', 'info'].includes(accent)
          ? accent
          : 'primary',
        order: sectionOpts.order ?? 9999,
        fields: [],
      });
    }

    map.get(key)!.fields.push(field);
  });

  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

// ⭐ قيم افتراضية للحقول
function getPreviewValue(field: FormField): any {
  const opts = (field.options as any) || {};

  // auto_filled
  if (field.field_type === 'auto_filled') {
    const source = opts.auto_source;
    switch (source) {
      case 'user.full_name':
        return 'مختص تربوي - تجريبي';
      case 'user.email':
        return 'specialist@edc.ps';
      case 'entity.name':
        return 'جنوب غزة';
      case 'entity.id':
        return '00000000-0000-0000-0000-000000000000';
      case 'date.today':
      case 'date.now':
        return new Date().toISOString().split('T')[0];
      case 'selected_entity.manager_name':
        return 'مدير الكيان';
      default:
        return '—';
    }
  }

  // indicator_group
  if (field.field_type === 'indicator_group') {
    const indicators = (opts.indicators as any[]) || [];
    const result: Record<string, string> = {};
    indicators.forEach((ind) => {
      result[String(ind.num)] = 'high';
    });
    return result;
  }

  // select/radio
  if (['select', 'radio'].includes(field.field_type)) {
    const options = (opts.options as any[]) || [];
    return options[0]?.value || '';
  }

  // checkbox
  if (field.field_type === 'checkbox') {
    return true;
  }

  // number
  if (field.field_type === 'number') {
    return 10;
  }

  // rating
  if (field.field_type === 'rating') {
    return 4;
  }

  // نص افتراضي
  if (field.field_type === 'textarea') {
    return 'هذا نص تجريبي للتوضيح فقط — لن يُحفظ.';
  }

  return 'قيمة تجريبية';
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function TemplateFullPreview({
  isOpen,
  templateName,
  templateCode,
  fields,
  onClose,
  onCreateReport,
}: TemplateFullPreviewProps) {
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});

  // ⭐ بناء البيانات الافتراضية
  useEffect(() => {
    if (!isOpen || fields.length === 0) return;

    const data: Record<string, unknown> = {};
    fields.forEach((field) => {
      data[field.field_key] = getPreviewValue(field);
    });
    setPreviewData(data);
  }, [isOpen, fields]);

  // ⭐ ترتيب الحقول
  const orderedFields = useMemo(() => {
    return [...fields].sort(
      (a, b) => (a.order_index || 0) - (b.order_index || 0)
    );
  }, [fields]);

  // ⭐ استخراج الأقسام
  const sections = useMemo(() => {
    return extractSections(orderedFields);
  }, [orderedFields]);

  // ⭐ Escape للإغلاق
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderField = (field: any) => {
    const fullWidth = isFullWidthField(field);
    return (
      <div key={field.id} className={fullWidth ? 'md:col-span-2' : ''}>
        <DynamicField
          field={field}
          value={previewData[field.field_key]}
          onChange={() => {}}
          error={undefined}
          templateCode={templateCode}
        />
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-5xl max-h-[95vh] bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══════ Header ═══════ */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-primary/5 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              👁️
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-text truncate">
                معاينة: {templateName}
              </h3>
              <p className="text-xs text-text-muted">
                معاينة تفاعلية — لن تُحفظ أي بيانات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors flex-shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* ═══════ Info Banner ═══════ */}
        <div className="p-3 sm:p-4 bg-info/5 border-b border-info/20 flex-shrink-0">
          <div className="flex items-start gap-2 text-xs sm:text-sm text-info">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>معاينة فقط:</strong> هذه هي الطريقة التي سيبدو بها التقرير
              للمستخدم. القيم الظاهرة تجريبية.
            </div>
          </div>
        </div>

        {/* ═══════ Content (Scrollable) ═══════ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg-secondary">
          {fields.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-bold text-text mb-2">
                لا توجد حقول
              </h3>
              <p className="text-text-secondary text-sm">
                أضف حقولاً للقالب لتظهر هنا
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Region Badge */}
              <Card padding="md" className="bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg">🗺️</span>
                  <span className="text-text-secondary">المنطقة الحالية:</span>
                  <span className="font-semibold text-primary">جنوب غزة</span>
                  <span className="text-text-muted text-xs">
                    (في المعاينة فقط)
                  </span>
                </div>
              </Card>

              {/* Sections */}
              {sections.map((section) => (
                <PreviewSection
                  key={section.key}
                  title={section.title}
                  icon={section.icon}
                  description={section.description}
                  accentColor={section.accentColor}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {section.fields.map(renderField)}
                  </div>
                </PreviewSection>
              ))}
            </div>
          )}
        </div>

        {/* ═══════ Footer ═══════ */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-border bg-bg-secondary flex-shrink-0">
          <div className="text-xs text-text-muted hidden sm:block">
            💡 لإنشاء تقرير فعلي، استخدم زر "بدء الإنشاء"
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              icon={<X className="w-4 h-4" />}
              onClick={onClose}
            >
              إغلاق
            </Button>
            {onCreateReport && (
              <Button
                variant="primary"
                icon={<Edit2 className="w-4 h-4" />}
                onClick={onCreateReport}
              >
                بدء الإنشاء
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Preview Section — نفس تصميم FormSection
// ═══════════════════════════════════════════════════════════

function PreviewSection({
  title,
  icon,
  description,
  accentColor = 'primary',
  children,
}: {
  title: string;
  icon: string;
  description?: string;
  accentColor?: 'primary' | 'success' | 'warning' | 'info';
  children: React.ReactNode;
}) {
  const styles = {
    primary: {
      border: 'border-primary/20',
      bg: 'bg-primary/5',
      text: 'text-primary',
    },
    success: {
      border: 'border-success/20',
      bg: 'bg-success/5',
      text: 'text-success',
    },
    warning: {
      border: 'border-warning/20',
      bg: 'bg-warning/5',
      text: 'text-warning',
    },
    info: {
      border: 'border-info/20',
      bg: 'bg-info/5',
      text: 'text-info',
    },
  }[accentColor];

  return (
    <div className={`rounded-xl border-2 ${styles.border} overflow-hidden bg-surface`}>
      <div className={`${styles.bg} px-4 sm:px-5 py-3 border-b-2 ${styles.border}`}>
        <div className="flex items-center gap-2 sm:gap-3">
          {icon && <span className="text-xl sm:text-2xl flex-shrink-0">{icon}</span>}
          <div className="min-w-0 flex-1">
            <h3 className={`text-sm sm:text-base font-bold ${styles.text}`}>
              {title}
            </h3>
            {description && (
              <p className="text-xs text-text-muted mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}