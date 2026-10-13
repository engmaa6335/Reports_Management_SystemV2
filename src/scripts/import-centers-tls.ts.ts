import * as XLSX from 'xlsx';
import { bulkImportEntities, type BulkEntityInput } from '../lib/bulk-entities';

// @ts-ignore — Vite raw import
import centersXlsx from '../data/tls.xlsx?url';

const AREA_MAP: Record<string, string> = {
  'East Gaza': 'region_east_gaza',
  'East Middle': 'region_east_middle',
  'Jabalia': 'region_jabalia',
  'South Gaza': 'region_south_gaza',
  'South Rafah': 'region_south_rafah',
  'West Gaza': 'region_west_gaza',
  'West Khan Younis': 'region_west_khan_younis',
  'West Middle': 'region_west_middle',
};

// ⭐ حجم الدفعة — 50 كيان لكل طلب
const BATCH_SIZE = 50;

export async function runImportCenters() {
  console.log('🚀 بدء استيراد مراكز TLS...');

  const response = await fetch(centersXlsx);
  const arrayBuffer = await response.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets['ECs_TLS'];

  if (!sheet) {
    console.error('❌ Sheet ECs_TLS not found. Available:', workbook.SheetNames);
    throw new Error('Sheet ECs_TLS not found');
  }

  const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

  const entities: BulkEntityInput[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1]) continue;

    const areaEn = String(row[0]).trim();
    const regionCode = AREA_MAP[areaEn];

    if (!regionCode) {
      console.warn('⚠️ Unknown area:', areaEn, '— row', i + 1);
      continue;
    }

    entities.push({
      name_en: String(row[1]).trim(),
      type: 'tls_center',
      region_code: regionCode,
      phone: String(row[4] || '').trim(),
      email: String(row[5] || '').trim(),
      emp_name: String(row[3] || '').trim(),
      emp_num: String(row[2] || '').trim(),
    });
  }

  console.log('📊 إجمالي الكيانات:', entities.length);

  // ⭐ تقسيم على دفعات
  const batches: BulkEntityInput[][] = [];
  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    batches.push(entities.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 عدد الدفعات: ${batches.length} (كل دفعة ${BATCH_SIZE})`);

  const allResults: any[] = [];

  for (let i = 0; i < batches.length; i++) {
    console.log(`\n⏳ دفعة ${i + 1} / ${batches.length}...`);

    try {
      const results = await bulkImportEntities(batches[i]);
      allResults.push(...results);

      const created = results.filter((r) => r.status === 'created').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;
      const failed = results.filter((r) => r.status === 'failed').length;

      console.log(`   ✅ ${created} | ⏭️ ${skipped} | ❌ ${failed}`);

      // انتظار قصير بين الدفعات
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error(`   ❌ فشل الدفعة ${i + 1}:`, err);
      // نستمر
    }
  }

  // ═══ ملخص نهائي ═══
  const created = allResults.filter((r) => r.status === 'created');
  const skipped = allResults.filter((r) => r.status === 'skipped');
  const failed = allResults.filter((r) => r.status === 'failed');

  console.log('\n═══════════════════════════════════════════');
  console.log('📋 النتائج النهائية:');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ created: ${created.length}`);
  console.log(`⏭️  skipped: ${skipped.length}`);
  console.log(`❌ failed: ${failed.length}`);
  console.log(`📊 المجموع: ${allResults.length} / ${entities.length}`);

  if (failed.length > 0) {
    console.log('\n❌ الأخطاء:');
    failed.slice(0, 20).forEach((r) => {
      console.log(`   ${r.name_en}: ${r.error}`);
    });
  }

  return allResults;
}

if (typeof window !== 'undefined') {
  (window as any).runImportCenters = runImportCenters;
}