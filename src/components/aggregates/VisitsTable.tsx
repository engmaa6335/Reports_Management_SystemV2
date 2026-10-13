import type { VisitRow } from '../../types/aggregates';

interface VisitsTableProps {
  visits: VisitRow[];
  entityLabel: string;
  loading?: boolean;
}

export function VisitsTable({
  visits,
  entityLabel,
  loading = false,
}: VisitsTableProps) {
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

  return (
    <div className="space-y-3">
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

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1100px] border-collapse bg-surface text-sm">
          <thead>
            <tr className="bg-bg-secondary border-b-2 border-border">
              <th className="px-3 py-3 text-center font-bold text-text w-12">
                م
              </th>
              <th className="px-3 py-3 text-center font-bold text-text w-24">
                التاريخ
              </th>
              <th className="px-3 py-3 text-right font-bold text-text min-w-[180px]">
                {entityLabel}
              </th>
              <th className="px-3 py-3 text-center font-bold text-text w-20">
                الصف
              </th>
              <th className="px-3 py-3 text-right font-bold text-text min-w-[140px]">
                اسم المعلم
              </th>
              <th className="px-3 py-3 text-center font-bold text-text w-28">
                المادة
              </th>
              <th className="px-3 py-3 text-right font-bold text-text min-w-[200px]">
                أبرز نقاط القوة
              </th>
              <th className="px-3 py-3 text-right font-bold text-text min-w-[200px]">
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
                <td className="px-3 py-3 text-center font-semibold text-text-muted">
                  {visit.index}
                </td>
                <td className="px-3 py-3 text-center text-text whitespace-nowrap">
                  {visit.visit_date}
                </td>
                <td className="px-3 py-3 text-right text-text font-medium">
                  {visit.entity_name || '—'}
                </td>
                <td className="px-3 py-3 text-center text-text">
                  {visit.class_grade || '—'}
                </td>
                <td className="px-3 py-3 text-right text-text">
                  {visit.teacher_name || '—'}
                </td>
                <td className="px-3 py-3 text-center text-text">
                  {visit.subject || '—'}
                </td>
                <td className="px-3 py-3 text-right text-text-secondary align-top whitespace-pre-wrap break-words leading-relaxed">
                  {visit.strengths || '—'}
                </td>
                <td className="px-3 py-3 text-right text-text-secondary align-top whitespace-pre-wrap break-words leading-relaxed">
                  {visit.improvements || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VisitsTable;