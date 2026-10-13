import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[""'']/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/&/g, 'and');
}

interface ManagerInput {
  email: string;
  full_name: string;
  employee_number?: string;
  phone?: string;
  entity_name: string;
  entity_type: 'school' | 'tls_center';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
        { error: 'Only tech_support can bulk-import managers' },
        403
      );
    }

    const body = await req.json();
    const { managers, schoolPassword, tlsPassword } = body as {
      managers: ManagerInput[];
      schoolPassword: string;
      tlsPassword: string;
    };

    if (!Array.isArray(managers) || managers.length === 0) {
      return jsonResponse({ error: 'No managers provided' }, 400);
    }

    const { data: rolesData } = await adminClient
      .from('roles')
      .select('id, code')
      .in('code', ['school_manager', 'tls_manager']);

    const roleMap = new Map<string, string>(
      (rolesData || []).map((r: any) => [r.code, r.id])
    );

    if (!roleMap.get('school_manager') || !roleMap.get('tls_manager')) {
      return jsonResponse({ error: 'Required roles not found' }, 500);
    }

    const { data: allEntities } = await adminClient
      .from('entities')
      .select(`
        id, name_ar, name_en,
        entity_type:entity_types!inner ( code )
      `)
      .in('entity_type.code', ['school', 'tls_center']);

    const entityByName = new Map<string, any>();
    (allEntities || []).forEach((e: any) => {
      const keyAr = normalizeName(e.name_ar || '');
      const keyEn = normalizeName(e.name_en || '');

      if (keyAr) entityByName.set(keyAr, e);
      if (keyEn && keyEn !== keyAr) entityByName.set(keyEn, e);
    });

    console.log(`📚 Loaded ${entityByName.size} entities for matching`);

    const today = new Date().toISOString().split('T')[0];

    const results: Array<{
      email: string;
      full_name: string;
      entity_name: string;
      entity_type: string;
      status: 'created' | 'skipped' | 'failed';
      user_id?: string;
      entity_id?: string;
      error?: string;
    }> = [];

    for (const m of managers) {
      try {
        const emailLower = m.email.toLowerCase().trim();
        const entityKey = normalizeName(m.entity_name);

        const entity = entityByName.get(entityKey);

        if (!entity) {
          results.push({
            email: m.email,
            full_name: m.full_name,
            entity_name: m.entity_name,
            entity_type: m.entity_type,
            status: 'failed',
            error: `Entity "${m.entity_name}" not found`,
          });
          continue;
        }

        const roleId =
          m.entity_type === 'school'
            ? roleMap.get('school_manager')!
            : roleMap.get('tls_manager')!;

        const { data: existingUser } = await adminClient
          .from('users')
          .select('id')
          .eq('email', emailLower)
          .maybeSingle();

        if (existingUser) {
          const { data: existingAssignment } = await adminClient
            .from('user_entity_roles')
            .select('id')
            .eq('user_id', existingUser.id)
            .eq('entity_id', entity.id)
            .eq('role_id', roleId)
            .is('ended_at', null)
            .maybeSingle();

          if (existingAssignment) {
            results.push({
              email: m.email,
              full_name: m.full_name,
              entity_name: m.entity_name,
              entity_type: m.entity_type,
              status: 'skipped',
              user_id: existingUser.id,
              entity_id: entity.id,
              error: 'Already exists',
            });
            continue;
          }

          await adminClient.from('user_entity_roles').insert({
            user_id: existingUser.id,
            role_id: roleId,
            entity_id: entity.id,
            is_primary: true,
            started_at: today,
            assigned_by: callerProfile.id,
          });

          results.push({
            email: m.email,
            full_name: m.full_name,
            entity_name: m.entity_name,
            entity_type: m.entity_type,
            status: 'created',
            user_id: existingUser.id,
            entity_id: entity.id,
          });
          continue;
        }

        const tempPassword =
          m.entity_type === 'school' ? schoolPassword : tlsPassword;

        const { data: authData, error: createAuthError } =
          await adminClient.auth.admin.createUser({
            email: emailLower,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: m.full_name },
          });

        if (createAuthError || !authData.user) {
          results.push({
            email: m.email,
            full_name: m.full_name,
            entity_name: m.entity_name,
            entity_type: m.entity_type,
            status: 'failed',
            error: createAuthError?.message || 'Auth creation failed',
          });
          continue;
        }

        const authUserId = authData.user.id;

        const { data: publicUser, error: puError } = await adminClient
          .from('users')
          .insert({
            auth_user_id: authUserId,
            username: emailLower.split('@')[0],
            email: emailLower,
            full_name: m.full_name,
            phone: m.phone || null,
            is_active: true,
            metadata: {
              employee_number: m.employee_number || null,
            },
          })
          .select('id')
          .single();

        if (puError || !publicUser) {
          await adminClient.auth.admin.deleteUser(authUserId);
          results.push({
            email: m.email,
            full_name: m.full_name,
            entity_name: m.entity_name,
            entity_type: m.entity_type,
            status: 'failed',
            error: puError?.message || 'Profile creation failed',
          });
          continue;
        }

        const publicUserId = publicUser.id;

        const { error: assignError } = await adminClient
          .from('user_entity_roles')
          .insert({
            user_id: publicUserId,
            role_id: roleId,
            entity_id: entity.id,
            is_primary: true,
            started_at: today,
            assigned_by: callerProfile.id,
          });

        if (assignError) {
          results.push({
            email: m.email,
            full_name: m.full_name,
            entity_name: m.entity_name,
            entity_type: m.entity_type,
            status: 'failed',
            user_id: publicUserId,
            error: `Assignment failed: ${assignError.message}`,
          });
          continue;
        }

        results.push({
          email: m.email,
          full_name: m.full_name,
          entity_name: m.entity_name,
          entity_type: m.entity_type,
          status: 'created',
          user_id: publicUserId,
          entity_id: entity.id,
        });
      } catch (err) {
        results.push({
          email: m.email,
          full_name: m.full_name,
          entity_name: m.entity_name,
          entity_type: m.entity_type,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return jsonResponse({ success: true, results }, 200);
  } catch (err) {
    console.error('bulk-import-managers error:', err);
    return jsonResponse(
      {
        error: err instanceof Error ? err.message : 'Internal error',
      },
      500
    );
  }
});