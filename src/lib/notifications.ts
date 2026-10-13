import { supabase } from './supabase';

// ================================================
// Types
// ================================================

interface SendNotificationInput {
  triggerEvent: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  entityId?: string;
  regionId?: string;
  reportId?: string;
  aggregateId?: string;
  creatorId?: string;
}

interface ResolvedRecipient {
  user_id: string;
  channel: string;
}

interface CreatorContext {
  id: string;
  roleCode: string;
  entityId: string | null;
  regionId: string | null;
}

// ================================================
// Main Function
// ================================================

export async function sendNotification(
  input: SendNotificationInput
): Promise<{ success: boolean; recipientsCount: number; error?: string }> {
  try {
    console.log('🔔 sendNotification called:', input.triggerEvent);

    // ✅ input.creatorId هو public.users.id بالفعل (من reports-store)
    const resolvedCreatorId = input.creatorId;

    // 1. جلب قاعدة التنبيه
    const { data: rule, error: ruleError } = await supabase
      .from('notification_rules')
      .select(
        `
        *,
        notification_type:notification_types ( id, code, category )
        `
      )
      .eq('trigger_event', input.triggerEvent)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (ruleError || !rule) {
      console.log('⚠️ No rule found for:', input.triggerEvent);
      return { success: true, recipientsCount: 0 };
    }

    // 2. تحديد المستلمين
    const inputWithResolvedId = { ...input, creatorId: resolvedCreatorId };
    const recipients = await resolveRecipients(rule, inputWithResolvedId);

    if (recipients.length === 0) {
      console.log('⚠️ No recipients resolved');
      return { success: true, recipientsCount: 0 };
    }

    console.log('👥 Recipients resolved:', recipients.length);

    // 3. deduplication_key
    const dedupKey = generateDeduplicationKey(inputWithResolvedId);

    // 4. إنشاء التنبيه (مع created_by = public.users.id)
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        notification_type_id: rule.notification_type_id,
        rule_id: rule.id,
        deduplication_key: dedupKey,
        title: input.title,
        body: input.body,
        created_by: resolvedCreatorId,   // ✅ public.users.id (يطابق FK)
        data: {
          ...(input.data || {}),
          report_id: input.reportId,
          aggregate_id: input.aggregateId,
          url: input.reportId
            ? `/reports/${input.reportId}`
            : input.aggregateId
            ? `/aggregates/${input.aggregateId}`
            : undefined,
        },
        priority: input.priority || rule.priority || 'normal',
      })
      .select('id')
      .single();

    if (notifError) {
      if (notifError.code === '23505') {
        console.log('⚠️ Notification already exists (dedup)');
        return { success: true, recipientsCount: 0 };
      }
      console.error('❌ Error creating notification:', notifError);
      throw notifError;
    }

    console.log('✅ Notification created:', notification.id);

    // 5. ربط المستلمين
    const recipientRows = recipients.map((r) => ({
      notification_id: notification.id,
      user_id: r.user_id,
      channel: r.channel,
      is_read: false,
    }));

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipientRows);

    if (recipientsError) {
      console.error('❌ Error linking recipients:', recipientsError);
      await supabase.from('notifications').delete().eq('id', notification.id);
      throw recipientsError;
    }

    console.log('✅ Recipients linked:', recipients.length);

    return { success: true, recipientsCount: recipients.length };
  } catch (err) {
    console.error('❌ sendNotification error:', err);
    return {
      success: false,
      recipientsCount: 0,
      error: err instanceof Error ? err.message : 'خطأ في إرسال التنبيه',
    };
  }
}

// ================================================
// Creator Context
// ================================================

async function getCreatorContext(
  creatorId: string
): Promise<CreatorContext | null> {
  try {
    const { data } = await supabase
      .from('user_entity_roles')
      .select(
        `
        user_id,
        entity_id,
        role:roles!inner ( code ),
        entity:entities!inner ( region_id )
        `
      )
      .eq('user_id', creatorId)
      .is('ended_at', null)
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    return {
      id: data.user_id,
      roleCode: (data.role as unknown as { code: string })?.code || '',
      entityId: data.entity_id,
      regionId:
        (data.entity as unknown as { region_id: string })?.region_id || null,
    };
  } catch (err) {
    console.error('getCreatorContext error:', err);
    return null;
  }
}

// ================================================
// Recipient Resolution
// ================================================

async function resolveRecipients(
  rule: {
    notification_type_id: string;
    trigger_event: string;
    recipient_config: Record<string, unknown>;
    channels: string[];
  },
  input: SendNotificationInput
): Promise<ResolvedRecipient[]> {
  const userIds = new Set<string>();

  // ═══════════════════════════════════════════════════
  // 🔑 قاعدة خاصة: تقرير تجميعي
  // ═══════════════════════════════════════════════════
  if (rule.trigger_event === 'aggregate.created' && input.creatorId) {
    const creator = await getCreatorContext(input.creatorId);

    if (creator) {
      console.log('🎯 Creator context:', {
        roleCode: creator.roleCode,
        regionId: creator.regionId,
      });

      const globalRoles: string[] = ['edc_viewer'];
      const regionRoles: string[] = [];

      switch (creator.roleCode) {
        case 'edu_specialist':
          regionRoles.push('region_manager');
          break;

        case 'qa_coordinator':
          globalRoles.push('qa_chief');
          regionRoles.push('region_manager');
          break;

        case 'qa_chief':
          regionRoles.push('region_manager');
          break;

        case 'region_manager':
          break;

        default:
          regionRoles.push('region_manager');
      }

      console.log('🎯 Global roles:', globalRoles);
      console.log('🎯 Region roles:', regionRoles);

      // 1. جلب global users
      if (globalRoles.length > 0) {
        const { data: globalUsers } = await supabase
          .from('user_entity_roles')
          .select(
            `
            user_id,
            role:roles!inner ( code )
            `
          )
          .in('role.code', globalRoles)
          .is('ended_at', null);

        (globalUsers || []).forEach((u: any) => {
          if (u.user_id !== input.creatorId) {
            userIds.add(u.user_id);
          }
        });

        console.log('👥 Global users:', globalUsers?.length || 0);
      }

      // 2. جلب region users
      if (regionRoles.length > 0 && creator.regionId) {
        const { data: rolesData } = await supabase
          .from('roles')
          .select('id')
          .in('code', regionRoles);

        const roleIds = (rolesData || []).map((r) => r.id);

        if (roleIds.length > 0) {
          const { data: regionUsers } = await supabase
            .from('user_entity_roles')
            .select(
              `
              user_id,
              entity:entities!inner ( region_id )
              `
            )
            .in('role_id', roleIds)
            .eq('entity.region_id', creator.regionId)
            .is('ended_at', null);

          (regionUsers || []).forEach((u: any) => {
            if (u.user_id !== input.creatorId) {
              userIds.add(u.user_id);
            }
          });

          console.log(
            '👥 Region users in region',
            creator.regionId,
            ':',
            regionUsers?.length || 0
          );
        }
      }
    }

    const channels = rule.channels || ['in_app'];
    const result: ResolvedRecipient[] = [];

    userIds.forEach((user_id) => {
      channels.forEach((channel) => {
        result.push({ user_id, channel });
      });
    });

    return result;
  }

  // ═══════════════════════════════════════════════════
  // القواعد العامة
  // ═══════════════════════════════════════════════════
  const config = { ...(rule.recipient_config || {}) };

  // 1. حسب الأدوار
  if (Array.isArray(config.roles) && config.roles.length > 0) {
    const roles = config.roles as string[];

    let query = supabase
      .from('user_entity_roles')
      .select(
        `
        user_id,
        entity_id,
        role:roles!inner ( code ),
        entity:entities!inner ( region_id )
        `
      )
      .in('role.code', roles)
      .is('ended_at', null);

    if (input.regionId) {
      query = query.eq('entity.region_id', input.regionId);
    }

    const { data: users } = await query;

    (users || []).forEach((u: any) => {
      if (u.user_id !== input.creatorId) {
        userIds.add(u.user_id);
      }
    });

    console.log('👥 By roles:', roles, '→', users?.length || 0);
  }

  // 2. كيانات محددة
  if (Array.isArray(config.entities) && config.entities.length > 0) {
    const { data: users } = await supabase
      .from('user_entity_roles')
      .select('user_id')
      .in('entity_id', config.entities as string[])
      .is('ended_at', null);

    (users || []).forEach((u: any) => {
      if (u.user_id !== input.creatorId) {
        userIds.add(u.user_id);
      }
    });
  }

  // 3. مستخدمون محددون
  if (Array.isArray(config.users) && config.users.length > 0) {
    (config.users as string[]).forEach((id) => {
      if (id !== input.creatorId) {
        userIds.add(id);
      }
    });
  }

  // 4. مجموعات (معطّل — لا يوجد جدول user_group_members حالياً)
  // سيُضاف لاحقاً عند إنشاء جداول المجموعات

  // 5. include_report_creator
  if (config.include_report_creator === true && input.creatorId) {
    userIds.add(input.creatorId);
  }

  // 6. channels
  const channels = rule.channels || ['in_app'];

  const result: ResolvedRecipient[] = [];
  userIds.forEach((user_id) => {
    channels.forEach((channel) => {
      result.push({ user_id, channel });
    });
  });

  return result;
}

// ================================================
// Helpers
// ================================================

function generateDeduplicationKey(input: SendNotificationInput): string {
  const parts = [input.triggerEvent];

  if (input.reportId) {
    parts.push(input.reportId);
    if (input.triggerEvent === 'report.updated') {
      parts.push(String(Date.now()));
    }
  } else if (input.aggregateId) {
    parts.push(input.aggregateId);
  }

  return parts.join(':');
}