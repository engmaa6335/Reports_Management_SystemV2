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

function generateCode(nameEn: string, prefix: string): string {
  const slug = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
  return `${prefix}_${slug}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. تحقق من المُنادي
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      data: { user: caller },
    } = await adminClient.auth.getUser(token);

    if (!caller) {
      return jsonResponse({ error: 'Invalid token' }, 401);
    }

    // 2. تحقق من tech_support
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('id, is_active')
      .eq('auth_user_id', caller.id)
      .maybeSingle();

    if (!callerProfile?.is_active) {
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
      return jsonResponse({ error: 'Only tech_support' }, 403);
    }

    // 3. اقرأ البيانات
    const body = await req.json();
    const { entities } = body as {
      entities: Array<{
        name_en: string;
        type: string;
        region_code: string;
        phone?: string;
        email?: string;
        emp_name?: string;
        emp_num?: string;
      }>;
    };

    if (!Array.isArray(entities) || entities.length === 0) {
      return jsonResponse({ error: 'No entities' }, 400);
    }

    // 4. جلب الأنواع
    const { data: entityTypes } = await adminClient
      .from('entity_types')
      .select('id, code');

    const typeMap = new Map(
      (entityTypes || []).map((t) => [t.code, t.id])
    );

    // 5. اعالج كل كيان
    const results: Array<{
      name_en: string;
      status: 'created' | 'skipped' | 'failed';
      entity_id?: string;
      error?: string;
    }> = [];

    const regionCache = new Map<string, { id: string; region_id: string | null }>();

    for (const e of entities) {
      try {
        // احصل على region entity
        let regionInfo = regionCache.get(e.region_code);

        if (!regionInfo) {
          const { data: regionEntity } = await adminClient
            .from('entities')
            .select('id, region_id')
            .eq('code', e.region_code)
            .maybeSingle();

          if (!regionEntity) {
            results.push({
              name_en: e.name_en,
              status: 'failed',
              error: `Region not found: ${e.region_code}`,
            });
            continue;
          }

          regionInfo = {
            id: regionEntity.id,
            region_id: regionEntity.region_id,
          };
          regionCache.set(e.region_code, regionInfo);
        }

        // فحص إن كان موجوداً
        const { data: existing } = await adminClient
          .from('entities')
          .select('id')
          .eq('name_en', e.name_en)
          .eq('parent_id', regionInfo.id)
          .eq('entity_type_id', typeMap.get(e.type))
          .maybeSingle();

        if (existing) {
          results.push({
            name_en: e.name_en,
            status: 'skipped',
            entity_id: existing.id,
            error: 'Already exists',
          });
          continue;
        }

        // أنشئ الكيان
        const code = generateCode(e.name_en, e.type) + '_' + Date.now().toString(36).slice(-4);

        const { data: newEntity, error: insertError } = await adminClient
          .from('entities')
          .insert({
            entity_type_id: typeMap.get(e.type),
            code: code,
            name_en: e.name_en,
            name_ar: e.name_en,
            parent_id: regionInfo.id,
            region_id: regionInfo.region_id,
            contact_info: {
              phone: e.phone || null,
              email: e.email || null,
              manager_name: e.emp_name || null,
              manager_emp_num: e.emp_num || null,
            },
            is_active: true,
          })
          .select('id')
          .single();

        if (insertError || !newEntity) {
          results.push({
            name_en: e.name_en,
            status: 'failed',
            error: insertError?.message || 'Insert failed',
          });
          continue;
        }

        results.push({
          name_en: e.name_en,
          status: 'created',
          entity_id: newEntity.id,
        });
      } catch (err) {
        results.push({
          name_en: e.name_en,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown',
        });
      }
    }

    return jsonResponse({ success: true, results }, 200);
  } catch (err) {
    console.error('bulk-import-entities error:', err);
    return jsonResponse(
      {
        error: err instanceof Error ? err.message : 'Internal error',
      },
      500
    );
  }
});