import type { VisitRow } from '../../types/aggregates';

// ═══════════════════════════════════════════════════════════
// VisitsTable — جدول الزيارات (متجاوب + قابل للطباعة)
// ═══════════════════════════════════════════════════════════

interface VisitsTableProps {
  visits: VisitRow[];
  entityLabel: string;
  loading?: boolean;
}

// ⭐ نمط كسر النص الطويل
const breakableCellStyle: React.CSSProperties = {
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
  maxWidth: '100%',
};

export function VisitsTable({
  visits,
  entityLabel,
  loading = false,
}: VisitsTableProps) {
  // ═══════════════════════════════════════════
  // Loading
  // ═══════════════════════════════════════════
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
            <p className="text-sm text-text-secondary">جاري جلب الزيارات...</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Empty
  // ═══════════════════════════════════════════
  if (visits.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border bg-bg-secondary p-8 text-center">
        <div className="mb-2 text-4xl">📭</div>
        <p className="text-sm text-text-secondary">
          لا توجد زيارات في هذه الفترة
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // Table
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-3">
      {/* Count Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span>📊</span>
            <span>{visits.length} زيارة</span>
          </span>
        </div>
        <span className="text-xs text-text-muted">
          مرتبة حسب تاريخ الزيارة (الأقدم أولاً)
        </span>
      </div>

      {/* Table Wrapper — تمرير أفقي عند الحاجة */}
      <div className="w-full overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] table-fixed border-collapse bg-surface text-sm">
          <thead>
            <tr className="bg-bg-secondary border-b-2 border-border">
              <th className="w-10 px-2 py-3 text-center font-bold text-text">
                م
              </th>
              <th className="w-24 px-2 py-3 text-center font-bold text-text">
                التاريخ
              </th>
              <th className="w-32 px-2 py-3 text-right font-bold text-text">
                {entityLabel}
              </th>
              <th className="w-20 px-2 py-3 text-center font-bold text-text">
                الصف
              </th>
              <th className="w-28 px-2 py-3 text-right font-bold text-text">
                اسم المعلم
              </th>
              <th className="w-24 px-2 py-3 text-center font-bold text-text">
                المادة
              </th>
              <th className="px-2 py-3 text-right font-bold text-text">
                أبرز نقاط القوة
              </th>
              <th className="px-2 py-3 text-right font-bold text-text">
                جوانب بحاجة إلى تحسين
              </th>
            </tr>
          </thead>
          <tbody>
            {visits.map((visit, idx) => (
              <tr
                key={visit.report_id}
                className={`border-b border-border transition-colors hover:bg-bg-secondary/50 ${
                  idx % 2 === 0 ? 'bg-surface' : 'bg-bg-secondary/30'
                }`}
              >
                <td className="px-2 py-3 text-center align-top font-semibold text-text-muted">
                  {visit.index}
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-center align-top text-xs text-text">
                  {visit.visit_date}
                </td>
                <td
                  className="px-2 py-3 text-right align-top text-text font-medium"
                  style={breakableCellStyle}
                >
                  {visit.entity_name || '—'}
                </td>
                <td className="px-2 py-3 text-center align-top text-text">
                  {visit.class_grade || '—'}
                </td>
                <td
                  className="px-2 py-3 text-right align-top text-text"
                  style={breakableCellStyle}
                >
                  {visit.teacher_name || '—'}
                </td>
                <td className="px-2 py-3 text-center align-top text-text">
                  {visit.subject || '—'}
                </td>
                <td
                  className="px-2 py-3 text-right align-top text-text-secondary leading-relaxed"
                  style={breakableCellStyle}
                >
                  {visit.strengths || '—'}
                </td>
                <td
                  className="px-2 py-3 text-right align-top text-text-secondary leading-relaxed"
                  style={breakableCellStyle}
                >
                  {visit.improvements || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ⭐ تلميح التمرير */}
      <p className="text-center text-xs text-text-muted print:hidden">
        ← يمكنك التمرير أفقياً لرؤية جميع الأعمدة →
      </p>
    </div>
  );
}

export default VisitsTable;