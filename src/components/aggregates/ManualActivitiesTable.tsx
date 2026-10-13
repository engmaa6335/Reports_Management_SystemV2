import { Trash2, Plus } from 'lucide-react';
import type { ManualActivityRow } from '../../types/aggregates';
import { SmartTextarea } from '../ui/SmartTextarea';
import { Button } from '../ui';

// ═══════════════════════════════════════════════════════════
// ManualActivitiesTable — جدول الأنشطة الإشرافية (يدوي)
// ═══════════════════════════════════════════════════════════

interface ManualActivitiesTableProps {
  activities: ManualActivityRow[];
  onChange: (activities: ManualActivityRow[]) => void;
  readOnly?: boolean;
}

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function ManualActivitiesTable({
  activities,
  onChange,
  readOnly = false,
}: ManualActivitiesTableProps) {
  // ═══════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════

  const handleAdd = () => {
    const newActivity: ManualActivityRow = {
      id: generateLocalId(),
      date: new Date().toISOString().split('T')[0],
      activity: '',
      topic: '',
      target_group: '',
    };
    onChange([...activities, newActivity]);
  };

  const handleUpdate = (
    id: string,
    field: keyof ManualActivityRow,
    value: string
  ) => {
    onChange(
      activities.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleRemove = (id: string) => {
    onChange(activities.filter((a) => a.id !== id));
  };

  // ═══════════════════════════════════════════
  // Style — كسر النص الطويل
  // ═══════════════════════════════════════════

  const breakableStyle: React.CSSProperties = {
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
    maxWidth: '100%',
  };

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 px-3 py-1 text-xs font-medium text-info">
            <span>📝</span>
            <span>{activities.length} نشاط</span>
          </span>
        </div>

        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleAdd}
          >
            إضافة نشاط
          </Button>
        )}
      </div>

      {/* Empty */}
      {activities.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-border bg-bg-secondary p-8 text-center">
          <div className="mb-2 text-4xl">📝</div>
          <p className="mb-4 text-sm text-text-secondary">
            لا توجد أنشطة إشرافية أخرى
          </p>
          {!readOnly && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleAdd}
            >
              إضافة أول نشاط
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {activities.length > 0 && (
        <div className="w-full overflow-x-auto rounded-lg border border-border">
          <table className="w-full table-fixed border-collapse bg-surface text-sm">
            <thead>
              <tr className="bg-bg-secondary border-b-2 border-border">
                <th className="w-12 px-3 py-3 text-center font-bold text-text">
                  م
                </th>
                <th className="w-32 px-3 py-3 text-center font-bold text-text">
                  التاريخ
                </th>
                <th className="px-3 py-3 text-right font-bold text-text">
                  النشاط
                </th>
                <th className="px-3 py-3 text-right font-bold text-text">
                  الموضوع
                </th>
                <th className="px-3 py-3 text-right font-bold text-text">
                  الفئة المستهدفة
                </th>
                {!readOnly && (
                  <th className="w-16 px-3 py-3 text-center font-bold text-text">
                    حذف
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, idx) => (
                <tr
                  key={activity.id}
                  className={`border-b border-border ${
                    idx % 2 === 0 ? 'bg-surface' : 'bg-bg-secondary/30'
                  }`}
                >
                  <td className="px-3 py-2 text-center font-semibold text-text-muted align-top">
                    {idx + 1}
                  </td>

                  {/* Date */}
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <span className="block text-center text-text whitespace-nowrap text-xs">
                        {activity.date}
                      </span>
                    ) : (
                      <input
                        type="date"
                        value={activity.date}
                        onChange={(e) =>
                          handleUpdate(activity.id, 'date', e.target.value)
                        }
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    )}
                  </td>

                  {/* Activity */}
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <div className="text-text" style={breakableStyle}>
                        {activity.activity || '—'}
                      </div>
                    ) : (
                      <SmartTextarea
                        value={activity.activity}
                        onChange={(v) =>
                          handleUpdate(activity.id, 'activity', v)
                        }
                        placeholder="اكتب النشاط..."
                        minRows={2}
                      />
                    )}
                  </td>

                  {/* Topic */}
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <div className="text-text" style={breakableStyle}>
                        {activity.topic || '—'}
                      </div>
                    ) : (
                      <SmartTextarea
                        value={activity.topic}
                        onChange={(v) =>
                          handleUpdate(activity.id, 'topic', v)
                        }
                        placeholder="اكتب الموضوع..."
                        minRows={2}
                      />
                    )}
                  </td>

                  {/* Target Group */}
                  <td className="px-3 py-2 align-top">
                    {readOnly ? (
                      <div className="text-text" style={breakableStyle}>
                        {activity.target_group || '—'}
                      </div>
                    ) : (
                      <SmartTextarea
                        value={activity.target_group}
                        onChange={(v) =>
                          handleUpdate(activity.id, 'target_group', v)
                        }
                        placeholder="الفئة المستهدفة..."
                        minRows={2}
                      />
                    )}
                  </td>

                  {/* Remove */}
                  {!readOnly && (
                    <td className="px-3 py-2 text-center align-top">
                      <button
                        onClick={() => handleRemove(activity.id)}
                        className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger/10"
                        title="حذف النشاط"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ManualActivitiesTable;