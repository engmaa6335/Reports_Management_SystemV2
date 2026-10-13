import type { PeriodType, CalculatedPeriod } from '../types/aggregates';

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthName(date: Date): string {
  return date.toLocaleDateString('ar-EG', {
    month: 'long',
    year: 'numeric',
  });
}

function getLastDayOfMonth(year: number, month: number): number {
  // month: 0-11 (JS) → day 0 = آخر يوم من الشهر التالي
  return new Date(year, month + 1, 0).getDate();
}

// ═══════════════════════════════════════════════════════════
// Bi-weekly Calculator
// ═══════════════════════════════════════════════════════════

function calculateBiweekly(): CalculatedPeriod {
  const today = new Date();
  const day = today.getDate();

  // ⭐ الحالة 1: تاريخ اليوم قبل السابع
  // → 15 الشهر السابق → آخر يوم الشهر السابق
  if (day < 7) {
    const prevMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );
    const lastDay = getLastDayOfMonth(
      prevMonth.getFullYear(),
      prevMonth.getMonth()
    );

    return {
      start: formatDate(
        new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15)
      ),
      end: formatDate(
        new Date(prevMonth.getFullYear(), prevMonth.getMonth(), lastDay)
      ),
      label: `النصف الثاني من ${getMonthName(prevMonth)} (15 → ${lastDay})`,
      isComplete: true,
    };
  }

  // ⭐ الحالة 2: تاريخ اليوم بعد الرابع عشر
  // → 1 الشهر الحالي → 14 الشهر الحالي
  if (day > 14) {
    return {
      start: formatDate(
        new Date(today.getFullYear(), today.getMonth(), 1)
      ),
      end: formatDate(new Date(today.getFullYear(), today.getMonth(), 14)),
      label: `النصف الأول من ${getMonthName(today)} (1 → 14)`,
      isComplete: true,
    };
  }

  // ⭐ الحالة 3: بين 7 و 14 → فترة غير مكتملة
  // نعرض النصف الثاني من الشهر السابق
  const prevMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );
  const lastDay = getLastDayOfMonth(
    prevMonth.getFullYear(),
    prevMonth.getMonth()
  );

  return {
    start: formatDate(
      new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15)
    ),
    end: formatDate(
      new Date(prevMonth.getFullYear(), prevMonth.getMonth(), lastDay)
    ),
    label: `⚠️ الفترة الحالية لم تكتمل بعد. استخدم النصف الثاني من ${getMonthName(prevMonth)}`,
    isComplete: false,
  };
}

// ═══════════════════════════════════════════════════════════
// Monthly Calculator
// ═══════════════════════════════════════════════════════════

function calculateMonthly(): CalculatedPeriod {
  const today = new Date();

  // الشهر السابق بالكامل
  const prevMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );
  const lastDay = getLastDayOfMonth(
    prevMonth.getFullYear(),
    prevMonth.getMonth()
  );

  return {
    start: formatDate(
      new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1)
    ),
    end: formatDate(
      new Date(prevMonth.getFullYear(), prevMonth.getMonth(), lastDay)
    ),
    label: `شهر ${getMonthName(prevMonth)} (1 → ${lastDay})`,
    isComplete: true,
  };
}

// ═══════════════════════════════════════════════════════════
// Custom Calculator
// ═══════════════════════════════════════════════════════════

function calculateCustom(
  customStart?: string,
  customEnd?: string
): CalculatedPeriod {
  const hasStart = !!customStart?.trim();
  const hasEnd = !!customEnd?.trim();
  const isComplete = hasStart && hasEnd;

  // تحقق من الترتيب
  let label = 'فترة مخصصة';
  let finalIsComplete = isComplete;

  if (isComplete) {
    if (customStart! > customEnd!) {
      label = '⚠️ تاريخ البداية يجب أن يكون قبل تاريخ النهاية';
      finalIsComplete = false;
    } else {
      const startDate = new Date(customStart!);
      const endDate = new Date(customEnd!);

      label = `${startDate.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })} → ${endDate.toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`;
    }
  } else if (hasStart || hasEnd) {
    label = '⚠️ الرجاء تحديد الفترة كاملة (من + إلى)';
  }

  return {
    start: customStart || '',
    end: customEnd || '',
    label,
    isComplete: finalIsComplete,
  };
}

// ═══════════════════════════════════════════════════════════
// Main Calculator
// ═══════════════════════════════════════════════════════════

export function calculatePeriod(
  type: PeriodType,
  customStart?: string,
  customEnd?: string
): CalculatedPeriod {
  switch (type) {
    case 'biweekly':
      return calculateBiweekly();
    case 'monthly':
      return calculateMonthly();
    case 'custom':
      return calculateCustom(customStart, customEnd);
    default:
      return calculateBiweekly();
  }
}

// ═══════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════

/**
 * ⭐ عرض الفترة بتنسيق جميل
 */
export function formatPeriodDisplay(start: string, end: string): string {
  if (!start || !end) return '—';

  try {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const startStr = startDate.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
    });

    const endStr = endDate.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `من ${startStr} إلى ${endStr}`;
  } catch {
    return `${start} → ${end}`;
  }
}

/**
 * ⭐ تسميات أنواع الفترات
 */
export function getPeriodTypeLabel(type: PeriodType): string {
  const labels: Record<PeriodType, string> = {
    biweekly: 'نصف شهري',
    monthly: 'شهري',
    custom: 'مخصص',
  };
  return labels[type] || type;
}

/**
 * ⭐ خيارات أنواع الفترات
 */
export function getPeriodTypeOptions(): Array<{
  value: PeriodType;
  label: string;
  description: string;
}> {
  return [
    {
      value: 'biweekly',
      label: 'نصف شهري',
      description: 'النصف الأول أو الثاني من الشهر تلقائياً',
    },
    {
      value: 'monthly',
      label: 'شهري',
      description: 'الشهر السابق بالكامل',
    },
    {
      value: 'custom',
      label: 'مخصص',
      description: 'تحديد فترة مخصصة يدوياً',
    },
  ];
}