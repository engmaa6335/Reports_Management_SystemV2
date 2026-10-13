import { FileText, Settings, Users, Lock } from 'lucide-react';
import { Card } from '../../components/ui';
import type { TemplateWithRelations } from '../../types/templates-admin';

interface TemplateCardProps {
  template: TemplateWithRelations;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const category = template.category;
  const color = category?.color || '#2563eb';
  const isActive = template.is_active ?? false;

  return (
    <button
      onClick={onClick}
      className="text-right transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary rounded-xl w-full"
    >
      <Card
        padding="md"
        className={`h-full hover:shadow-hard transition-shadow ${
          !isActive ? 'opacity-60' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <FileText className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <div className="flex items-center gap-1.5">
            {template.is_locked && (
              <span title="مقفل">
                <Lock className="w-4 h-4 text-warning" />
              </span>
            )}
            {isActive ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                ✅
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                ⛔
              </span>
            )}
          </div>
        </div>

        {/* Name */}
        <h3 className="text-base sm:text-lg font-bold text-text mb-1 line-clamp-2">
          {template.name_ar}
        </h3>

        {template.name_en && (
          <p
            className="text-xs text-text-muted mb-2 sm:mb-3 line-clamp-1"
            dir="ltr"
          >
            {template.name_en}
          </p>
        )}

        {/* Description */}
        {template.description && (
          <p className="text-xs text-text-secondary mb-3 line-clamp-2">
            {template.description}
          </p>
        )}

        {/* Category Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-3">
          {category && (
            <span
              className="inline-block px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium"
              style={{
                backgroundColor: `${color}15`,
                color,
              }}
            >
              {category.icon && `${category.icon} `}
              {category.name_ar}
            </span>
          )}

          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono bg-bg-secondary text-text-secondary">
            {template.code}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] sm:text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <Settings className="w-3 h-3" />
            {template.fields_count ?? 0} حقل
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {template.reports_count ?? 0} تقرير
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs text-text-muted mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border">
          <span>v{template.current_version?.version_number || '—'}</span>
          <span className="font-mono">{template.id.slice(0, 6)}</span>
        </div>
      </Card>
    </button>
  );
}