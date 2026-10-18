import ExcelJS from 'exceljs';

// ═══════════════════════════════════════════════════════════
// الثوابت
// ═══════════════════════════════════════════════════════════

export const JOB_TITLES = [
  'Education Specialist',
  'QA Coordinator',
  'QA Chief',
  'School Principal',
  'TLS Manager',
  'Region Manager',
  'Region Assistant',
] as const;

export const JOB_TITLES_MAPPING: Record<string, string> = {
  'Education Specialist': 'edu_specialist',
  'QA Coordinator': 'qa_coordinator',
  'QA Chief': 'qa_chief',
  'School Principal': 'school_manager',
  'TLS Manager': 'tls_manager',
  'Region Manager': 'region_manager',
  'Region Assistant': 'region_assistant',
};

// ═══════════════════════════════════════════════════════════
// توليد القالب الشامل
// ═══════════════════════════════════════════════════════════

export async function downloadExcelTemplate(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EDC Platform';
  wb.created = new Date();

  // Sheet 1: البيانات
  const ws = wb.addWorksheet('البيانات', {
    views: [{ rightToLeft: true, state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  ws.columns = [
    { header: 'الرقم', key: 'num', width: 8 },
    { header: 'اسم الموظف', key: 'name', width: 30 },
    { header: 'البريد الإلكتروني', key: 'email', width: 32 },
    { header: 'المسمى الوظيفي', key: 'job_title', width: 25 },
    { header: 'الرقم الوظيفي', key: 'employee_number', width: 15 },
    { header: 'منطقة العمل R.L', key: 'region_rl', width: 30 },
    { header: 'منطقة العمل TLS', key: 'region_tls', width: 30 },
    { header: 'المدرسة/المركز', key: 'school_or_center', width: 35 },
    { header: 'رقم الجوال', key: 'phone', width: 15 },
    { header: 'التخصص', key: 'specialization', width: 18 },
    { header: 'ملاحظات', key: 'notes', width: 25 },
  ];

  // تنسيق الرأس
  const headerRow = ws.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNumber <= 5 ? 'FF2563EB' : colNumber <= 8 ? 'FF059669' : 'FF6B7280' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E40AF' } },
      bottom: { style: 'thin', color: { argb: 'FF1E40AF' } },
      left: { style: 'thin', color: { argb: 'FF1E40AF' } },
      right: { style: 'thin', color: { argb: 'FF1E40AF' } },
    };
  });

  // بيانات تجريبية
  const sampleData = [
    {
      num: 1,
      name: 'Husam Uthman El Sayyed',
      email: 'H.SAYYED@UNRWA.ORG',
      job_title: 'Education Specialist',
      employee_number: '10212107',
      region_rl: 'شرق غزة',
      region_tls: 'شرق غزة',
      school_or_center: '',
      phone: '592905789',
      specialization: 'رياضيات',
      notes: '',
    },
    {
      num: 2,
      name: 'Basel Mahammad Izaanin',
      email: 'B.Izaanin@unrwa-edu.org',
      job_title: 'School Principal',
      employee_number: '10210258',
      region_rl: '',
      region_tls: '',
      school_or_center: 'B/Hanoun Prep. Boys "B"',
      phone: '599639842',
      specialization: '',
      notes: '',
    },
    {
      num: 3,
      name: 'Hind Diyab Zaqqout',
      email: 'Hin.Zaqqout@unrwa-edu.org',
      job_title: 'TLS Manager',
      employee_number: '10215716',
      region_rl: '',
      region_tls: '',
      school_or_center: 'Daraj Elem. Coed "A, B, C & D" School - 1',
      phone: '568110967',
      specialization: '',
      notes: '',
    },
  ];

  sampleData.forEach((row) => ws.addRow(row));

  // القائمة المنسدلة للعمود D (المسمى الوظيفي)
  const jobTitlesList = JOB_TITLES.join(',');
  for (let i = 2; i <= 1000; i++) {
    ws.getCell(`D${i}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`"${jobTitlesList}"`],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'قيمة غير صالحة',
      error: 'يرجى اختيار مسمى وظيفي من القائمة المنسدلة',
      showInputMessage: true,
      promptTitle: 'المسمى الوظيفي',
      prompt: 'اختر من القائمة',
    };
  }

  // تنسيق البيانات
  for (let i = 2; i <= 500; i++) {
    const row = ws.getRow(i);
    row.height = 24;
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      if (colNumber === 3 || colNumber === 4 || colNumber === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    });
  }

  // Sheet 2: القيم المسموحة
  const wsValidation = wb.addWorksheet('القيم المسموحة', {
    views: [{ rightToLeft: true }],
  });

  wsValidation.columns = [
    { header: 'المسمى الوظيفي', key: 'title', width: 28 },
    { header: 'الدور في النظام', key: 'role', width: 28 },
    { header: 'ملاحظات', key: 'notes', width: 50 },
  ];

  const validationHeader = wsValidation.getRow(1);
  validationHeader.height = 28;
  validationHeader.eachCell((cell) => {
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const notes: Record<string, string> = {
    'Education Specialist': 'المختص التربوي — يملأ R.L و/أو TLS',
    'QA Coordinator': 'منسق ضمان الجودة — يملأ R.L و/أو TLS',
    'QA Chief': 'رئيس وحدة ضمان الجودة — يملأ R.L و/أو TLS',
    'School Principal': 'مدير مدرسة — يملأ عمود "المدرسة/المركز"',
    'TLS Manager': 'مدير مركز TLS — يملأ عمود "المدرسة/المركز"',
    'Region Manager': 'مدير منطقة — يملأ R.L (منطقة إدارية)',
    'Region Assistant': 'مساعد مدير منطقة — يملأ R.L (منطقة إدارية)',
  };

  Object.entries(JOB_TITLES_MAPPING).forEach(([title, role]) => {
    wsValidation.addRow({
      title,
      role,
      notes: notes[title] || '',
    });
  });

  // Sheet 3: التعليمات
  const wsInstructions = wb.addWorksheet('التعليمات', {
    views: [{ rightToLeft: true }],
  });

  wsInstructions.columns = [{ width: 100 }];

  const instructions = [
    { text: 'تعليمات استخدام القالب الشامل للاستيراد الجماعي', style: 'title' },
    { text: '', style: 'normal' },
    { text: '📌 الأعمدة الأساسية (لكل المستخدمين):', style: 'subtitle' },
    { text: '  • اسم الموظف — إلزامي', style: 'normal' },
    { text: '  • البريد الإلكتروني — إلزامي (مفتاح المطابقة الأساسي)', style: 'normal' },
    { text: '  • المسمى الوظيفي — إلزامي (قائمة منسدلة)', style: 'normal' },
    { text: '  • الرقم الوظيفي — احتياطي (يُستخدم إذا لم يُطابق البريد)', style: 'normal' },
    { text: '', style: 'normal' },
    { text: '📌 الأعمدة الإضافية (حسب المسمى الوظيفي):', style: 'subtitle' },
    { text: '  • منطقة العمل R.L — للمختصين والمنسقين (التعليم عن بعد)', style: 'normal' },
    { text: '  • منطقة العمل TLS — للمختصين والمنسقين (التعليم الوجاهي)', style: 'normal' },
    { text: '  • المدرسة/المركز — لمدراء المدارس والمراكز', style: 'normal' },
    { text: '', style: 'normal' },
    { text: '📌 أمثلة:', style: 'subtitle' },
    { text: '  • مختص R.L + TLS: يملأ عمودي R.L و TLS', style: 'highlight' },
    { text: '  • مختص R.L فقط: يملأ R.L ويترك TLS فارغاً', style: 'highlight' },
    { text: '  • مدير مدرسة: يملأ "المدرسة/المركز" باسم المدرسة', style: 'highlight' },
    { text: '  • مدير مركز: يملأ "المدرسة/المركز" باسم المركز', style: 'highlight' },
    { text: '', style: 'normal' },
    { text: '📌 قواعد المنطقة:', style: 'subtitle' },
    { text: '  • يمكن استخدام + لعدة مناطق (مثال: شرق خان يونس + غرب خان يونس)', style: 'normal' },
    { text: '  • الأسماء الإدارية (رفح، غزة، الوسطى...) تحتاج تأكيداً في الواجهة', style: 'warning' },
    { text: '  • لا تخلط بين R.L و TLS في نفس العمود', style: 'warning' },
    { text: '', style: 'normal' },
    { text: '📌 خطوات الاستخدام:', style: 'subtitle' },
    { text: '  1. املأ ورقة "البيانات"', style: 'normal' },
    { text: '  2. احفظ الملف', style: 'normal' },
    { text: '  3. ارفعه في صفحة "استيراد جماعي من Excel"', style: 'normal' },
    { text: '  4. اضغط "معاينة (Dry Run)" للتحقق', style: 'normal' },
    { text: '  5. اضغط "تنفيذ الاستيراد" بعد التأكد', style: 'normal' },
  ];

  instructions.forEach((item) => {
    const row = wsInstructions.addRow([item.text]);
    const cell = row.getCell(1);
    cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };

    if (item.style === 'title') {
      cell.font = { bold: true, size: 16, color: { argb: 'FF1E40AF' } };
      row.height = 32;
    } else if (item.style === 'subtitle') {
      cell.font = { bold: true, size: 13, color: { argb: 'FF2563EB' } };
      row.height = 26;
    } else if (item.style === 'highlight') {
      cell.font = { bold: true, color: { argb: 'FF059669' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' },
      };
    } else if (item.style === 'warning') {
      cell.font = { color: { argb: 'FF92400E' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      };
    } else {
      cell.font = { size: 11 };
    }
  });

  // تحميل الملف
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `قالب_شامل_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
// قراءة ملف Excel المرفوع
// ═══════════════════════════════════════════════════════════

export interface ParsedExcelRow {
  row_number: number;
  full_name: string;
  email: string;
  job_title: string;
  employee_number?: string;
  region_rl?: string;
  region_tls?: string;
  school_or_center?: string;
  phone?: string;
  specialization?: string;
  notes?: string;
}

export async function parseExcelFile(file: File): Promise<ParsedExcelRow[]> {
  const wb = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await wb.xlsx.load(buffer);

  const ws = wb.getWorksheet('البيانات') || wb.worksheets[0];
  if (!ws) {
    throw new Error('الملف لا يحتوي على ورقة عمل');
  }

  const rows: ParsedExcelRow[] = [];

  ws.eachRow((row, index) => {
    if (index === 1) return;

    const getValue = (col: number): string => {
      const cell = row.getCell(col);
      const value = cell.value;
      if (value === null || value === undefined) return '';
      if (typeof value === 'object' && 'text' in value) {
        return String((value as any).text || '').trim();
      }
      return String(value).trim();
    };

    const fullName = getValue(2);
    const email = getValue(3);
    const jobTitle = getValue(4);

    if (!fullName && !email && !jobTitle) return;

    rows.push({
      row_number: index,
      full_name: fullName,
      email: email,
      job_title: jobTitle,
      employee_number: getValue(5) || undefined,
      region_rl: getValue(6) || undefined,
      region_tls: getValue(7) || undefined,
      school_or_center: getValue(8) || undefined,
      phone: getValue(9) || undefined,
      specialization: getValue(10) || undefined,
      notes: getValue(11) || undefined,
    });
  });

  return rows;
}