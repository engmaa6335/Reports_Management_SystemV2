
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// الوضع الافتراضي للمراجعة فقط.
// غيّر DRY_RUN إلى false بعد مراجعة النتائج.
const DRY_RUN = process.env.DRY_RUN !== 'false';

const TARGET_ROLES = [
  'edu_specialist',
  'school_manager',
  'tls_manager',
];

const PAGE_SIZE = 500;
const results = [];

function assertNoError(error) {
  if (error) throw new Error(error.message);
}

async function fetchAll(buildQuery) {
  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery()
      .range(from, from + PAGE_SIZE - 1);

    assertNoError(error);
    rows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows;
}

async function main() {
  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error('تحقق من إعدادات ملف .env');
  }

  // 1. جلب معرفات الأدوار المستهدفة
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, code')
    .in('code', TARGET_ROLES);

  assertNoError(rolesError);

  const roleIds = (roles ?? []).map(role => role.id);

  if (!roleIds.length) {
    throw new Error(
      'لم يتم العثور على الأدوار المستهدفة. راجع أكواد roles.'
    );
  }

  console.log('الأدوار التي تم العثور عليها:', roles);

  // 2. جلب المستخدمين المسند إليهم أحد هذه الأدوار حاليًا
  // لا يوجد شرط is_active، لذلك يشمل الحسابات غير النشطة.
  const assignments = await fetchAll(() =>
    supabase
      .from('user_entity_roles')
      .select('user_id, role_id')
      .in('role_id', roleIds)
      .is('ended_at', null)
  );

  const userIds = [
    ...new Set(assignments.map(row => row.user_id).filter(Boolean)),
  ];

  if (!userIds.length) {
    console.log('لا يوجد مستخدمون ضمن الأدوار المحددة.');
    return;
  }

  // 3. جلب بيانات المستخدمين
  const users = await fetchAll(() =>
    supabase
      .from('users')
      .select(
        'id, auth_user_id, full_name, email, employee_number, is_active'
      )
      .in('id', userIds)
  );

  // منع إعادة ضبط حساب Auth نفسه أكثر من مرة
  const seenAuthIds = new Set();

  for (const user of users) {
    let status = 'جاهز للمراجعة';
    let detail = '';

    const employeeNumber = String(
      user.employee_number ?? ''
    ).trim();

    if (!user.auth_user_id) {
      status = 'تخطي';
      detail = 'لا يوجد auth_user_id';
    } else if (!employeeNumber) {
      status = 'تخطي';
      detail = 'رقم الموظف مفقود';
    } else if (seenAuthIds.has(user.auth_user_id)) {
      status = 'تخطي';
      detail = 'حساب Auth مكرر';
    } else {
      seenAuthIds.add(user.auth_user_id);

      const newPassword = `Tch@${employeeNumber}`;

      if (DRY_RUN) {
        detail = 'مراجعة فقط؛ لم تتغير كلمة المرور';
      } else {
        const { error } = await supabase.auth.admin
          .updateUserById(user.auth_user_id, {
            password: newPassword,
          });

        if (error) {
          status = 'فشل';
          detail = error.message;
        } else {
          status = 'تم التغيير';
          detail = 'تم تحديث كلمة المرور';
        }
      }
    }

    results.push({
      full_name: user.full_name ?? '',
      email: user.email ?? '',
      employee_number: employeeNumber,
      is_active: user.is_active ?? '',
      status,
      detail,
    });

    console.log(`${user.full_name ?? user.id}: ${status}`);
  }

  // تقرير دون تضمين كلمات المرور
  const columns = [
    'full_name',
    'email',
    'employee_number',
    'is_active',
    'status',
    'detail',
  ];

  const csvEscape = value =>
    `"${String(value ?? '').replaceAll('"', '""')}"`;

  const csv = [
    columns.join(','),
    ...results.map(row =>
      columns.map(column => csvEscape(row[column])).join(',')
    ),
  ].join('\n');

  fs.writeFileSync(
    'reset-password-results.csv',
    '\uFEFF' + csv,
    'utf8'
  );

  console.log('\nانتهت العملية.');
  console.log('وضع المراجعة فقط:', DRY_RUN);
  console.log('عدد السجلات:', results.length);
  console.log(
    'تم تغيير كلمات المرور:',
    results.filter(r => r.status === 'تم التغيير').length
  );
  console.log(
    'المتجاوزون أو الفاشلون:',
    results.filter(r =>
      ['تخطي', 'فشل'].includes(r.status)
    ).length
  );
  console.log('التقرير: reset-password-results.csv');
}

main().catch(error => {
  console.error('توقفت العملية:', error.message);
  process.exitCode = 1;
});
