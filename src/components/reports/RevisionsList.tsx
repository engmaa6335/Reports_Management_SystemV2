import {
  History,
  User as UserIcon,
  Clock,
  Edit,
  ArrowLeft,
} from 'lucide-react';
import type { ReportRevision } from '../../stores/reports-store';
import { Card } from '../ui';

// ================================================
// Helpers
// ================================================

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 30) return `منذ ${diffDay} يوم`;
  return formatDateTime(dateStr);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '— فارغ —';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ================================================
// Types
// ================================================

interface RevisionsListProps {
  revisions: ReportRevision[];
  fieldLabels: Record<string, string>;
}

// ================================================
// Component
// ================================================

export function RevisionsList({
  revisions,
  fieldLabels,
}: RevisionsListProps) {
  if (revisions.length === 0) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-bg-secondary rounded-full mb-4">
            <History className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">
            لا توجد تعديلات سابقة
          </h3>
          <p className="text-text-secondary text-sm">
            لم يتم تعديل هذا التقرير بعد
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {revisions.map((revision, index) => {
        const changedKeys = Object.keys(revision.changed_fields || {});
        const isFirst = index === 0;

        return (
          <Card
            key={revision.id}
            padding="md"
            className="print-avoid-break"
          >
            <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                    ${
                      isFirst
                        ? 'bg-primary/10 text-primary'
                        : 'bg-info/10 text-info'
                    }
                  `}
                >
                  {isFirst ? (
                    <Edit className="w-5 h-5" />
                  ) : (
                    <History className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-text">
                      تعديل #{revision.revision_number}
                    </h4>
                    {isFirst && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        الأحدث
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      <span>
                        {revision.user?.full_name || 'مستخدم محذوف'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span title={formatDateTime(revision.created_at)}>
                        {timeAgo(revision.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-text-muted text-left">
                <div className="font-medium text-text-secondary">
                  {changedKeys.length} حقل
                </div>
                <div>تم تعديله</div>
              </div>
            </div>

            {changedKeys.length > 0 ? (
              <div className="space-y-3">
                {changedKeys.map((key) => {
                  const change = revision.changed_fields[key];
                  const label = fieldLabels[key] || key;

                  if (key === '_period') {
                    return (
                      <div
                        key={key}
                        className="bg-warning/5 border border-warning/20 rounded-lg p-3"
                      >
                        <div className="text-xs font-medium text-warning mb-2">
                          📅 فترة التقرير
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-text-muted">من:</span>
                            <span className="text-text line-through">
                              {formatValue(
                                (change.from as Record<string, unknown>)?.type
                              )}{' '}
                              |{' '}
                              {formatValue(
                                (change.from as Record<string, unknown>)?.start
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4 text-warning" />
                            <span className="text-text font-medium">
                              {formatValue(
                                (change.to as Record<string, unknown>)?.type
                              )}{' '}
                              |{' '}
                              {formatValue(
                                (change.to as Record<string, unknown>)?.start
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className="bg-bg-secondary rounded-lg p-3"
                    >
                      <div className="text-xs font-medium text-text-muted mb-2">
                        {label}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-text-muted flex-shrink-0">
                            من:
                          </span>
                          <span className="text-text line-through break-all">
                            {formatValue(change.from)}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <ArrowLeft className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span className="text-text font-medium break-all">
                            {formatValue(change.to)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-text-muted text-center py-4">
                لا توجد تفاصيل متاحة
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}