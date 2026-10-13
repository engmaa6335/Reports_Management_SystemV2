import * as XLSX from 'xlsx';
import { bulkImportManagers, type BulkManagerInput } from '../lib/bulk-managers';

// @ts-ignore — Vite raw import
import schoolsXlsx from '../data/schools.xlsx?url';
// @ts-ignore — Vite raw import
import tlsXlsx from '../data/tls.xlsx?url';

// ⚠️ كلمات المرور
const SCHOOL_MANAGER_PASSWORD = 'S@12345678';
const TLS_MANAGER_PASSWORD = 'Tls@12345678';

// ⭐ حجم الدفعة
const BATCH_SIZE = 20;

async function readExcel(fileUrl: string, sheetName: string) {
  const response = await fetch(fileUrl);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(
      `Sheet "${sheetName}" not found. Available: ${workbook.SheetNames.join(', ')}`
    );
  }

  return XLSX.utils.sheet_to_json<any>(sheet);
}

async function parseSchools(): Promise<BulkManagerInput[]> {
  const rows = await readExcel(schoolsXlsx, 'Schools_R.L');

  return rows
    .filter((row) => row['Email'] && row['Emp_Name'] && row['School Name'])
    .map((row) => ({
      email: String(row['Email']).trim(),
      full_name: String(row['Emp_Name']).trim(),
      employee_number: row['Emp_Num'] ? String(row['Emp_Num']) : undefined,
      phone: row['Mob No'] ? String(row['Mob No']) : undefined,
      entity_name: String(row['School Name']).trim(),
      entity_type: 'school' as const,
    }));
}

async function parseTls(): Promise<BulkManagerInput[]> {
  const rows = await readExcel(tlsXlsx, 'ECs_TLS');

  return rows
    .filter((row) => row['Email'] && row['Emp_Name'] && row['EC Name'])
    .map((row) => ({
      email: String(row['Email']).trim(),
      full_name: String(row['Emp_Name']).trim(),
      employee_number: row['Emp_Num'] ? String(row['Emp_Num']) : undefined,
      phone: row['Mob No'] ? String(row['Mob No']) : undefined,
      entity_name: String(row['EC Name']).trim(),
      entity_type: 'tls_center' as const,
    }));
}

export async function runImportManagers() {
  console.log('\n═══════════════════════════════════════');
  console.log('🚀 بدء استيراد المديرين');
  console.log('═══════════════════════════════════════\n');

  console.log('📂 قراءة schools.xlsx...');
  const schools = await parseSchools();
  console.log(`   ✅ ${schools.length} مدير مدرسة\n`);

  console.log('📂 قراءة tls.xlsx...');
  const tlsCenters = await parseTls();
  console.log(`   ✅ ${tlsCenters.length} مدير مساحة تعلم\n`);

  const allManagers = [...schools, ...tlsCenters];
  console.log(`📊 إجمالي: ${allManagers.length} مدير\n`);

  const batches: BulkManagerInput[][] = [];
  for (let i = 0; i < allManagers.length; i += BATCH_SIZE) {
    batches.push(allManagers.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 عدد الدفعات: ${batches.length} (كل دفعة ${BATCH_SIZE})\n`);

  const allResults: any[] = [];

  for (let i = 0; i < batches.length; i++) {
    console.log(`⏳ دفعة ${i + 1} / ${batches.length}...`);

    try {
      const results = await bulkImportManagers(
        batches[i],
        SCHOOL_MANAGER_PASSWORD,
        TLS_MANAGER_PASSWORD
      );

      allResults.push(...results);

      const created = results.filter((r) => r.status === 'created').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;
      const failed = results.filter((r) => r.status === 'failed').length;

      console.log(`   ✅ ${created} | ⏭️ ${skipped} | ❌ ${failed}`);

      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error(`   ❌ فشل الدفعة ${i + 1}:`, err);
    }
  }

  const created = allResults.filter((r) => r.status === 'created');
  const skipped = allResults.filter((r) => r.status === 'skipped');
  const failed = allResults.filter((r) => r.status === 'failed');

  console.log('\n═══════════════════════════════════════════');
  console.log('📋 النتائج النهائية:');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ created: ${created.length}`);
  console.log(`⏭️  skipped: ${skipped.length}`);
  console.log(`❌ failed: ${failed.length}`);
  console.log(`📊 المجموع: ${allResults.length} / ${allManagers.length}`);

  if (failed.length > 0) {
    console.log('\n❌ الأخطاء (أول 20):');
    failed.slice(0, 20).forEach((r) => {
      console.log(`   ${r.email}: ${r.error}`);
    });
  }

  console.log('\n📄 النتائج الكاملة:');
  console.table(allResults);

  return allResults;
}

// اجعله متاحاً عالمياً
if (typeof window !== 'undefined') {
  (window as any).runImportManagers = runImportManagers;
}