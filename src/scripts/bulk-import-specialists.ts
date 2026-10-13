import { bulkCreateUsers, type BulkUserInput } from '../lib/bulk-users';

// ⚠️ كلمة المرور الموحدة
const PASSWORD = 'Sp@123456789';

// 🎯 قائمة المختصين
const SPECIALISTS: BulkUserInput[] = [
  {
    email: 'H.MADHOUN@UNRWA.ORG',
    password: PASSWORD,
    username: 'hanan_madhoun',
    full_name: 'Hanan Khalil El Madhoun',
    phone: '592905516',
    employee_number: '10213487',
    specialization_name: 'مرحلة دنيا',
    regions: ['region_east_gaza'],
    subjects: ['arabic', 'math', 'science'],
  },
  {
    email: 'S.ElAthamna@UNRWA.ORG',
    password: PASSWORD,
    username: 'sufyan_elathamna',
    full_name: 'Sufyan Mohd El Athamna',
    phone: '592905299',
    employee_number: '10220939',
    specialization_name: 'مرحلة دنيا',
    regions: ['region_south_rafah', 'region_north_rafah'],
    subjects: ['arabic', 'math', 'science'],
  },
  {
    email: 'W.KHALIFA@UNRWA.ORG',
    password: PASSWORD,
    username: 'wasima_khalifa',
    full_name: 'Wasima Mousa Khalifa',
    phone: '592905809',
    employee_number: '10223573',
    specialization_name: 'مرحلة دنيا',
    regions: ['region_east_khan_younis', 'region_west_khan_younis'],
    subjects: ['arabic', 'math', 'science'],
  },
  {
    email: 'I.Fraij@UNRWA.ORG',
    password: PASSWORD,
    username: 'intisar_fraij',
    full_name: 'Intisar Husain Fraij',
    phone: '592905776',
    employee_number: '10235752',
    specialization_name: 'مرحلة دنيا',
    regions: ['region_jabalia'],
    subjects: ['arabic', 'math', 'science'],
  },
  {
    email: 'S.ALQATRAWI@UNRWA.ORG',
    password: PASSWORD,
    username: 'samar_alqatrawi',
    full_name: 'Samar A Razeq El Qatrawi',
    phone: '592905728',
    employee_number: '10246426',
    specialization_name: 'علوم عامة',
    regions: ['region_east_middle', 'region_west_middle'],
    subjects: ['science'],
  },
  {
    email: 'E.ELMADHOUN@UNRWA.ORG',
    password: PASSWORD,
    username: 'imad_madhoun',
    full_name: 'Imad Mohd Madhoun',
    phone: '592905778',
    employee_number: '10248195',
    specialization_name: 'مرحلة دنيا',
    regions: ['region_west_gaza', 'region_south_gaza'],
    subjects: ['arabic', 'math', 'science'],
  },
  {
    email: 'D.ELGHOUL@UNRWA.ORG',
    password: PASSWORD,
    username: 'diyaeddin_elghoul',
    full_name: 'Diyaeddin H El Ghoul',
    phone: '592905727',
    employee_number: '10249089',
    specialization_name: 'لغة عربية',
    regions: ['region_north_rafah', 'region_south_rafah'],
    subjects: ['arabic'],
  },
  {
    email: 'S.SAYMA@UNRWA.ORG',
    password: PASSWORD,
    username: 'samar_sayma',
    full_name: 'Samar A Munem Sayma',
    phone: '592905201',
    employee_number: '10211279',
    specialization_name: 'مرحلة دنيا',
    regions: ['region_east_middle', 'region_west_middle'],
    subjects: ['arabic', 'math', 'science'],
  },
  {
    email: 'H.GHUNAIM@UNRWA.ORG',
    password: PASSWORD,
    username: 'hanan_ghunaim',
    full_name: 'Hanan Ahmad Ghunaim',
    phone: '592905443',
    employee_number: '10248144',
    specialization_name: 'لغة عربية',
    regions: ['region_east_khan_younis'],
    subjects: ['arabic'],
  },
  {
    email: 'A.AbuSHAHLA@UNRWA.ORG',
    password: PASSWORD,
    username: 'ashraf_abushahla',
    full_name: 'Ashraf Mahd Abu Shahla',
    phone: '592905517',
    employee_number: '10210041',
    specialization_name: 'علوم عامة',
    regions: ['region_north_rafah'],
    subjects: ['science'],
  },
  {
    email: 'He.JUMA@UNRWA.ORG',
    password: PASSWORD,
    username: 'heba_juma',
    full_name: 'Heba Izzat Juma',
    phone: '592905519',
    employee_number: '10214256',
    specialization_name: 'علوم عامة',
    regions: ['region_south_rafah'],
    subjects: ['science'],
  },
  {
    email: 'N.SAID@UNRWA.ORG',
    password: PASSWORD,
    username: 'nader_said',
    full_name: 'Nader Fathi Said',
    phone: '592905786',
    employee_number: '10215641',
    specialization_name: 'رياضيات',
    regions: ['region_jabalia', 'region_beit_lahia'],
    subjects: ['math'],
  },
  {
    email: 'Na.ALI@UNRWA.ORG',
    password: PASSWORD,
    username: 'naima_ali',
    full_name: 'Naima Mousa Ali',
    phone: '592905319',
    employee_number: '10240241',
    specialization_name: 'لغة انجليزية',
    regions: ['region_east_khan_younis', 'region_west_khan_younis'],
    subjects: ['english'],
  },
  {
    email: 'Y.Naser@UNRWA.ORG',
    password: PASSWORD,
    username: 'yehya_naser',
    full_name: 'Yehya Rabah Naser',
    phone: '597920142',
    employee_number: '10245421',
    specialization_name: 'مرحلة دنيا',
    regions: ['region_beit_lahia'],
    subjects: ['arabic', 'math', 'science'],
  },
  {
    email: 'A.MESMEH@UNRWA.ORG',
    password: PASSWORD,
    username: 'ayman_mesmeh',
    full_name: 'Ayman Sulaiman Mesmeh',
    phone: '592905785',
    employee_number: '10248701',
    specialization_name: 'لغة عربية',
    regions: ['region_east_middle', 'region_west_middle'],
    subjects: ['arabic'],
  },
  {
    email: 'M.MOJABER@UNRWA.ORG',
    password: PASSWORD,
    username: 'mohammad_mujabber',
    full_name: 'Mohammad Ahmad El Mujabber',
    phone: '592905524',
    employee_number: '10248708',
    specialization_name: 'علوم عامة',
    regions: ['region_jabalia', 'region_beit_lahia'],
    subjects: ['science'],
  },
  {
    email: 'N.SABHA@UNRWA.ORG',
    password: PASSWORD,
    username: 'nidal_abusabha',
    full_name: 'Nidal Husain Abu Sabha',
    phone: '592905781',
    employee_number: '10249518',
    specialization_name: 'لغة عربية',
    regions: ['region_west_khan_younis'],
    subjects: ['arabic'],
  },
  {
    email: 'N.ZAHER@UNRWA.ORG',
    password: PASSWORD,
    username: 'naser_abuzaher',
    full_name: 'Naser Ahmad Abu Zaher',
    phone: '592905783',
    employee_number: '10249541',
    specialization_name: 'لغة عربية',
    regions: ['region_jabalia', 'region_beit_lahia'],
    subjects: ['arabic'],
  },
  {
    email: 'I.AbuSHARBIN@UNRWA.ORG',
    password: PASSWORD,
    username: 'islam_abusharbin',
    full_name: 'Islam Husni Abu Sharbin',
    phone: '592905513',
    employee_number: '10213027',
    specialization_name: 'لغة انجليزية',
    regions: ['region_jabalia', 'region_beit_lahia'],
    subjects: ['english'],
  },
  {
    email: 'G.Badrasawi@UNRWA.ORG',
    password: PASSWORD,
    username: 'ghaysoub_badrasawi',
    full_name: 'Ghaysoub Mohd Badrasawi',
    phone: '592905779',
    employee_number: '10243572',
    specialization_name: 'علوم عامة',
    regions: ['region_west_khan_younis'],
    subjects: ['science'],
  },
  {
    email: 'Ma.QADOURA@UNRWA.ORG',
    password: PASSWORD,
    username: 'marwan_qadoura',
    full_name: 'Marwan Abdalla Qadoura',
    phone: '598881139',
    employee_number: '10210455',
    specialization_name: 'رياضيات',
    regions: ['region_west_khan_younis', 'region_east_khan_younis'],
    subjects: ['math'],
  },
  {
    email: 'F.AbuZinada@UNRWA.ORG',
    password: PASSWORD,
    username: 'fadi_abuzinada',
    full_name: 'Fadi Samir Abu Zinada',
    phone: '592905725',
    employee_number: '10211614',
    specialization_name: 'رياضيات',
    regions: ['region_south_gaza'],
    subjects: ['math'],
  },
  {
    email: 'Si.SHARIF@UNRWA.ORG',
    password: PASSWORD,
    username: 'sireen_sharif',
    full_name: 'Sireen Walid El Sharif',
    phone: '599363856',
    employee_number: '10212028',
    specialization_name: 'لغة انجليزية',
    regions: ['region_south_rafah', 'region_north_rafah'],
    subjects: ['english'],
  },
  {
    email: 'H.SAYYED@UNRWA.ORG',
    password: PASSWORD,
    username: 'husam_sayyed',
    full_name: 'Husam Uthman El Sayyed',
    phone: '592905789',
    employee_number: '10212107',
    specialization_name: 'رياضيات',
    regions: ['region_west_gaza', 'region_east_gaza'],
    subjects: ['math'],
  },
  {
    email: 'M.ElHabbash@UNRWA.ORG',
    password: PASSWORD,
    username: 'mahmoud_habbash',
    full_name: 'Mahmoud Ali El Habbash',
    phone: '592905817',
    employee_number: '10212535',
    specialization_name: 'لغة عربية',
    regions: ['region_east_gaza', 'region_west_gaza', 'region_south_gaza'],
    subjects: ['arabic'],
  },
  {
    email: 'Ma.GHAZALI@UNRWA.ORG',
    password: PASSWORD,
    username: 'mahd_ghazali',
    full_name: 'Mahd Yusuf El Ghazali',
    phone: '592905769',
    employee_number: '10244419',
    specialization_name: 'علوم عامة',
    regions: ['region_east_gaza', 'region_west_gaza', 'region_south_gaza'],
    subjects: ['science'],
  },
  {
    email: 'M.ISEAFAN@UNRWA.ORG',
    password: PASSWORD,
    username: 'mohammed_iseafan',
    full_name: 'Mohammed Yunis Iseafan',
    phone: '597920522',
    employee_number: '10245470',
    specialization_name: 'لغة انجليزية',
    regions: ['region_east_middle', 'region_west_middle'],
    subjects: ['english'],
  },
  {
    email: 'W.JOUDA@UNRWA.ORG',
    password: PASSWORD,
    username: 'wajdi_jouda',
    full_name: 'Wajdi Shukri Jouda',
    phone: '592905497',
    employee_number: '10249167',
    specialization_name: 'علوم عامة',
    regions: ['region_east_khan_younis'],
    subjects: ['science'],
  },
  {
    email: 'A.Shukur@unrwa-edu.org',
    password: PASSWORD,
    username: 'ahmad_shukur',
    full_name: 'Ahmad Shukur',
    phone: '599634384',
    employee_number: '10210743',
    specialization_name: 'رياضيات',
    regions: ['region_west_middle', 'region_east_middle'],
    subjects: ['math'],
  },
];

export async function runBulkImport() {
  console.log('🚀 بدء إضافة المختصين...');
  console.log('📊 العدد الإجمالي:', SPECIALISTS.length);

  try {
    const results = await bulkCreateUsers(SPECIALISTS);

    console.log('\n📋 النتائج:');
    console.log('═══════════════════════════════════════════');

    const created = results.filter((r) => r.status === 'created');
    const skipped = results.filter((r) => r.status === 'skipped');
    const failed = results.filter((r) => r.status === 'failed');

    console.log(`✅ تم إنشاء: ${created.length}`);
    console.log(`⏭️  تم تخطي: ${skipped.length}`);
    console.log(`❌ فشل: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ الأخطاء:');
      failed.forEach((r) => {
        console.log(`   ${r.email}: ${r.error}`);
      });
    }

    console.log('\n📄 النتائج الكاملة:');
    console.table(results);

    return results;
  } catch (err) {
    console.error('❌ فشل:', err);
    throw err;
  }
}

// اجعله متاحاً عالمياً
if (typeof window !== 'undefined') {
  (window as any).runBulkImport = runBulkImport;
}