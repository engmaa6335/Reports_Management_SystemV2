// supabase/functions/admin-create-user/index.ts
// @ts-nocheck
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized: missing token' }, 401);
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
      return jsonResponse({ error: 'Unauthorized: invalid token' }, 401);
    }

    // التحقق من caller
    const { data: callerProfile, error: profileError } = await adminClient
      .from('users')
      .select('id, is_active')
      .eq('auth_user_id', caller.id)
      .maybeSingle();

    if (profileError) {
      return jsonResponse(
        { error: 'Internal error: profile lookup failed' },
        500
      );
    }
    if (!callerProfile) {
      return jsonResponse({ error: 'Forbidden: profile not found' }, 403);
    }
    if (!callerProfile.is_active) {
      return jsonResponse({ error: 'Forbidden: account disabled' }, 403);
    }

    // التحقق من tech_support
    const { data: hasRole, error: roleError } = await adminClient
      .from('user_entity_roles')
      .select('id, roles!inner(code)')
      .eq('user_id', callerProfile.id)
      .eq('roles.code', 'tech_support')
      .is('ended_at', null)
      .maybeSingle();

    if (roleError) {
      return jsonResponse({ error: 'Internal error: role check failed' }, 500);
    }
    if (!hasRole) {
      return jsonResponse(
        { error: 'Forbidden: only tech_support can create users' },
        403
      );
    }

    // قراءة البيانات — ⭐ employee_number مضاف
    const body = await req.json();
    const {
      email,
      password,
      username,
      full_name,
      phone,
      employee_number,
      role_id,
      entity_id,
    } = body;

    if (!email || !password || !username || !full_name) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return jsonResponse({ error: 'Invalid email format' }, 400);
    }
    if (password.length < 8) {
      return jsonResponse(
        { error: 'Password must be at least 8 characters' },
        400
      );
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return jsonResponse(
        { error: 'Username must contain only letters, numbers, _, ., -' },
        400
      );
    }
    if (!role_id || !entity_id) {
      return jsonResponse({ error: 'Role and entity are required' }, 400);
    }

    // تحقق التكرار
    const { data: existingEmail } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existingEmail) {
      return jsonResponse({ error: 'Email already in use' }, 400);
    }

    const { data: existingUsername } = await adminClient
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (existingUsername) {
      return jsonResponse({ error: 'Username already in use' }, 400);
    }

    // إنشاء auth user
    const { data: authData, error: createAuthError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (createAuthError || !authData.user) {
      return jsonResponse(
        {
          error: 'Failed to create auth account',
          details: createAuthError?.message,
        },
        400
      );
    }
    const newAuthId = authData.user.id;

    // إنشاء public.users — ⭐ employee_number مضاف
    const { data: publicUser, error: puError } = await adminClient
      .from('users')
      .insert({
        auth_user_id: newAuthId,
        username,
        email,
        full_name,
        phone: phone || null,
        employee_number: employee_number || null,
        is_active: true,
      })
      .select('id')
      .single();

    if (puError || !publicUser) {
      await adminClient.auth.admin.deleteUser(newAuthId);
      return jsonResponse(
        { error: 'Failed to create profile', details: puError?.message },
        400
      );
    }
    const newUserId = publicUser.id;

    // تعيين الدور
    const { error: roleAssignError } = await adminClient
      .from('user_entity_roles')
      .insert({
        user_id: newUserId,
        role_id,
        entity_id,
        started_at: new Date().toISOString().split('T')[0],
        is_primary: true,
        assigned_by: callerProfile.id,
      });

    if (roleAssignError) {
      await adminClient.from('users').delete().eq('id', newUserId);
      await adminClient.auth.admin.deleteUser(newAuthId);
      return jsonResponse(
        { error: 'Failed to assign role', details: roleAssignError.message },
        400
      );
    }

    return jsonResponse(
      { success: true, user_id: newUserId, auth_user_id: newAuthId },
      200
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return jsonResponse(
      {
        error: 'Internal error',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      500
    );
  }
});