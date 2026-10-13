import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. تحقق من المُنادي
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      data: { user: caller },
      error: authError,
    } = await adminClient.auth.getUser(token);

    if (authError || !caller) {
      return jsonResponse({ error: 'Invalid token' }, 401);
    }

    // 2. تحقق من tech_support
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('id, is_active')
      .eq('auth_user_id', caller.id)
      .maybeSingle();

    if (!callerProfile || !callerProfile.is_active) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const { data: hasRole } = await adminClient
      .from('user_entity_roles')
      .select('id, roles!inner(code)')
      .eq('user_id', callerProfile.id)
      .eq('roles.code', 'tech_support')
      .is('ended_at', null)
      .maybeSingle();

    if (!hasRole) {
      return jsonResponse(
        { error: 'Only tech_support can bulk-create users' },
        403
      );
    }

    // 3. اقرأ البيانات
    const body = await req.json();
    const { users } = body as {
      users: Array<{
        email: string;
        password: string;
        username: string;
        full_name: string;
        phone?: string;
        employee_number?: string;
        specialization_name?: string;
        regions: string[];
        subjects: string[];
      }>;
    };

    if (!Array.isArray(users) || users.length === 0) {
      return jsonResponse({ error: 'No users provided' }, 400);
    }

    const results: Array<{
      email: string;
      status: 'created' | 'skipped' | 'failed';
      user_id?: string;
      error?: string;
    }> = [];

    // 4. احصل على IDs الثابتة
    const { data: roleData } = await adminClient
      .from('roles')
      .select('id')
      .eq('code', 'edu_specialist')
      .single();

    const eduSpecialistRoleId = roleData?.id;

    if (!eduSpecialistRoleId) {
      return jsonResponse({ error: 'edu_specialist role not found' }, 500);
    }

    const { data: eduUnit } = await adminClient
      .from('entities')
      .select('id')
      .eq('code', 'edu_main')
      .single();

    const today = new Date().toISOString().split('T')[0];

    // 5. اعالج كل مستخدم
    for (const u of users) {
      try {
        const emailLower = u.email.toLowerCase();

        // تحقق إن كان موجوداً
        const { data: existingUser } = await adminClient
          .from('users')
          .select('id')
          .eq('email', emailLower)
          .maybeSingle();

        if (existingUser) {
          results.push({
            email: u.email,
            status: 'skipped',
            error: 'User already exists',
          });
          continue;
        }

        // 5.1. إنشاء auth user
        const { data: authData, error: createAuthError } =
          await adminClient.auth.admin.createUser({
            email: emailLower,
            password: u.password,
            email_confirm: true,
            user_metadata: { full_name: u.full_name },
          });

        if (createAuthError || !authData.user) {
          results.push({
            email: u.email,
            status: 'failed',
            error: createAuthError?.message || 'Auth creation failed',
          });
          continue;
        }

        const authUserId = authData.user.id;

        // 5.2. إنشاء public.users
        const { data: publicUser, error: puError } = await adminClient
          .from('users')
          .insert({
            auth_user_id: authUserId,
            username: u.username,
            email: emailLower,
            full_name: u.full_name,
            phone: u.phone || null,
            is_active: true,
            metadata: {
              employee_number: u.employee_number || null,
              specialization_name: u.specialization_name || null,
            },
          })
          .select('id')
          .single();

        if (puError || !publicUser) {
          await adminClient.auth.admin.deleteUser(authUserId);
          results.push({
            email: u.email,
            status: 'failed',
            error: puError?.message || 'Profile creation failed',
          });
          continue;
        }

        const publicUserId = publicUser.id;

        // 5.3. إسناد الوحدة التربوية (أساسي)
        if (eduUnit) {
          await adminClient.from('user_entity_roles').insert({
            user_id: publicUserId,
            role_id: eduSpecialistRoleId,
            entity_id: eduUnit.id,
            is_primary: true,
            started_at: today,
            assigned_by: callerProfile.id,
          });
        }

        // 5.4. إسناد المناطق
        for (const regionCode of u.regions || []) {
          const { data: region } = await adminClient
            .from('entities')
            .select('id')
            .eq('code', regionCode)
            .maybeSingle();

          if (region) {
            await adminClient.from('user_entity_roles').insert({
              user_id: publicUserId,
              role_id: eduSpecialistRoleId,
              entity_id: region.id,
              is_primary: false,
              started_at: today,
              assigned_by: callerProfile.id,
            });
          }
        }

        // 5.5. إسناد المواد
        for (const subjectCode of u.subjects || []) {
          await adminClient.from('user_subject_assignments').insert({
            user_id: publicUserId,
            subject_code: subjectCode,
            is_active: true,
            assigned_by: callerProfile.id,
          });
        }

        results.push({
          email: u.email,
          status: 'created',
          user_id: publicUserId,
        });
      } catch (err) {
        results.push({
          email: u.email,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return jsonResponse({ success: true, results }, 200);
  } catch (err) {
    console.error('bulk-create-users error:', err);
    return jsonResponse(
      {
        error: err instanceof Error ? err.message : 'Internal error',
      },
      500
    );
  }
});