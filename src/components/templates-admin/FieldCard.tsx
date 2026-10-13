import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  Clock,
  ListChecks,
  CircleDot,
  CheckSquare,
  Star,
  Lock,
  BarChart3,
  BookOpen,
  School,
  Building2,
  GripVertical,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card } from '../../components/ui';
import type { FormField } from '../../types/templates-admin';

// ═══════════════════════════════════════════════════════════
// Field Type Icons
// ═══════════════════════════════════════════════════════════

function getFieldIcon(fieldType: string): React.ReactNode {
  const iconClass = 'w-5 h-5';
  switch (fieldType) {
    case 'text':
      return <Type className={iconClass} />;
    case 'textarea':
      return <AlignLeft className={iconClass} />;
    case 'number':
      return <Hash className={iconClass} />;
    case 'date':
      return <Calendar className={iconClass} />;
    case 'datetime':
      return <Clock className={iconClass} />;
    case 'select':
      return <ListChecks className={iconClass} />;
    case 'radio':
      return <CircleDot className={iconClass} />;
    case 'checkbox':
      return <CheckSquare className={iconClass} />;
    case 'rating':
      return <Star className={iconClass} />;
    case 'auto_filled':
      return <Lock className={iconClass} />;
    case 'indicator_group':
      return <BarChart3 className={iconClass} />;
    case 'subject_select':
      return <BookOpen className={iconClass} />;
    case 'school_select':
      return <School className={iconClass} />;
    case 'center_select':
      return <Building2 className={iconClass} />;
    default:
      return <Type className={iconClass} />;
  }
}

function getFieldTypeColor(fieldType: string): string {
  switch (fieldType) {
    case 'auto_filled':
      return '#06b6d4';
    case 'indicator_group':
      return '#f59e0b';
    case 'subject_select':
      return '#8b5cf6';
    case 'school_select':
    case 'center_select':
      return '#10b981';
    case 'date':
    case 'datetime':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
}

function getFieldTypeLabel(fieldType: string): string {
  const labels: Record<string, string> = {
    text: 'نص',
    textarea: 'نص طويل',
    number: 'رقم',
    date: 'تاريخ',
    datetime: 'تاريخ ووقت',
    select: 'قائمة منسدلة',
    radio: 'اختيار واحد',
    checkbox: 'مربع اختيار',
    rating: 'تقييم بالنجوم',
    auto_filled: 'حقل تلقائي',
    indicator_group: 'مجموعة مؤشرات',
    subject_select: 'اختيار مادة',
    school_select: 'اختيار مدرسة',
    center_select: 'اختيار مركز',
  };
  return labels[fieldType] || fieldType;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

interface FieldCardProps {
  field: FormField;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function FieldCard({
  field,
  onEdit,
  onDelete,
  isDeleting,
}: FieldCardProps) {
  const color = getFieldTypeColor(field.field_type);
  const isRequired = !!(field.validation_rules as any)?.required;
  const isFullWidth = (field.options as any)?.full_width === true;

  // هل الحقل داخل قسم؟
  const section = (field.options as any)?.section;
  const hasSection = !!section?.key;

  return (
    <Card padding="md" className="hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {getFieldIcon(field.field_type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-text truncate">
                  {field.label_ar}
                </h3>
                {isRequired && (
                  <span className="text-danger text-xs font-bold flex-shrink-0">
                    *
                  </span>
                )}
              </div>

              {/* Field Key */}
              <p className="text-xs text-text-muted font-mono mt-0.5 truncate" dir="ltr">
                {field.field_key}
              </p>
            </div>

            {/* Order Badge */}
            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-md bg-bg-secondary text-text-secondary font-mono">
              #{field.order_index}
            </span>
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {/* Type Badge */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {getFieldTypeLabel(field.field_type)}
            </span>

            {/* Full Width Badge */}
            {isFullWidth && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-warning/10 text-warning">
                <Eye className="w-3 h-3" />
                عرض كامل
              </span>
            )}

            {/* Section Badge */}
            {hasSection && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-primary/10 text-primary">
                📂 {section.title || section.key}
              </span>
            )}

            {/* Auto Source Badge */}
            {field.field_type === 'auto_filled' &&
              (field.options as any)?.auto_source && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono bg-info/10 text-info">
                  🔒 {(field.options as any).auto_source}
                </span>
              )}

            {/* Indicators Count */}
            {field.field_type === 'indicator_group' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-warning/10 text-warning">
                <BarChart3 className="w-3 h-3" />
                {((field.options as any)?.indicators || []).length} مؤشر
              </span>
            )}

            {/* Select Options Count */}
            {(field.field_type === 'select' ||
              field.field_type === 'radio') &&
              ((field.options as any)?.options || []).length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-success/10 text-success">
                  {((field.options as any).options || []).length} خيار
                </span>
              )}
          </div>

          {/* Description (Placeholder / Help Text) */}
          {field.placeholder && (
            <p className="text-xs text-text-muted line-clamp-1 mb-2">
              💬 {field.placeholder}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
            <button
              onClick={onEdit}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md py-1.5 transition-colors disabled:opacity-50"
            >
              <Edit2 className="w-3.5 h-3.5" />
              تعديل
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-danger hover:bg-danger/10 rounded-md py-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              حذف
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}