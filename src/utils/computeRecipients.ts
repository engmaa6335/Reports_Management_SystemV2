import type {
  ComputedRecipient,
  RecipientIntent,
  RecipientSource,
} from '../types/notifications.types';

// ════════════════════════════════════════════════════════════
// أنواع مساعدة للسياق
// ════════════════════════════════════════════════════════════

export interface EntityLite {
  id: string;
  name_ar: string;
}

export interface RoleLite {
  id: string;
  name_ar: string;
}

export interface UserLite {
  id: string;
  full_name: string;
  email: string;
  username: string;
  is_active: boolean | null;
  entity_ids: string[]; // الكيانات النشطة
  role_ids: string[]; // الأدوار النشطة (من user_entity_roles)
}

export interface ComputeContext {
  users: UserLite[];
  entities: EntityLite[];
  roles: RoleLite[];
}

// ════════════════════════════════════════════════════════════
// الدالة النقية
// ════════════════════════════════════════════════════════════

/**
 * نسخة JS مطابقة لـ compute_notification_recipients في PostgreSQL.
 *
 * ⚠️ هذه النسخة **للعرض الفوري فقط**.
 *    المرجع النهائي عند الإرسال هو الدالة على الخادم.
 *    أي اختلاف بينهما خطأ يجب إصلاحه في الاثنين.
 *
 * المعادلة:
 *   المستلمون = (مستخدمو الكيانات + مستخدمو الأدوار + المضافون يدويًا)
 *              − المستثنون صراحةً
 *   مع إزالة التكرار بمفتاح user_id.
 */
export function computeRecipients(
  intent: RecipientIntent,
  ctx: ComputeContext
): ComputedRecipient[] {
  const sourceMap = new Map<string, RecipientSource>();
  const userSources = new Map<string, Set<string>>();

  const registerSource = (s: RecipientSource): string => {
    const key = `${s.type}:${s.id ?? 'null'}:${s.label}`;
    if (!sourceMap.has(key)) sourceMap.set(key, s);
    return key;
  };

  const addToUser = (userId: string, sourceKey: string) => {
    if (!userSources.has(userId)) userSources.set(userId, new Set());
    userSources.get(userId)!.add(sourceKey);
  };

  const userById = new Map(ctx.users.map((u) => [u.id, u]));
  const entityById = new Map(ctx.entities.map((e) => [e.id, e]));
  const roleById = new Map(ctx.roles.map((r) => [r.id, r]));

  // ── 1) من الكيانات ──
  for (const entityId of intent.entity_ids) {
    const entity = entityById.get(entityId);
    if (!entity) continue;

    const excluded = new Set(intent.entity_exclusions[entityId] ?? []);
    const sourceKey = registerSource({
      type: 'entity',
      id: entityId,
      label: entity.name_ar,
    });

    for (const u of ctx.users) {
      if (u.is_active !== true) continue;
      if (!u.entity_ids.includes(entityId)) continue;
      if (excluded.has(u.id)) continue;
      addToUser(u.id, sourceKey);
    }
  }

  // ── 2) من الأدوار ──
  for (const roleId of intent.role_ids) {
    const role = roleById.get(roleId);
    if (!role) continue;

    const sourceKey = registerSource({
      type: 'role',
      id: roleId,
      label: role.name_ar,
    });

    for (const u of ctx.users) {
      if (u.is_active !== true) continue;
      if (!u.role_ids.includes(roleId)) continue;
      addToUser(u.id, sourceKey);
    }
  }

  // ── 3) المضافون يدويًا ──
  for (const userId of intent.manual_user_ids) {
    const u = userById.get(userId);
    if (!u || u.is_active !== true) continue;

    const sourceKey = registerSource({
      type: 'manual',
      id: null,
      label: 'إضافة يدوية',
    });
    addToUser(userId, sourceKey);
  }

  // ── 4) الاستثناءات الصريحة ──
  const excludedSet = new Set(intent.excluded_user_ids);
  for (const uid of excludedSet) {
    userSources.delete(uid);
  }

  // ── 5) البناء النهائي ──
  const result: ComputedRecipient[] = [];
  for (const [userId, sourceKeys] of userSources.entries()) {
    const u = userById.get(userId);
    if (!u) continue;

    const sources: RecipientSource[] = [];
    for (const key of sourceKeys) {
      const s = sourceMap.get(key);
      if (s) sources.push(s);
    }

    result.push({
      user_id: userId,
      full_name: u.full_name,
      email: u.email,
      username: u.username,
      sources,
      source_labels: sources.map((s) => s.label).join(' + '),
    });
  }

  return result.sort((a, b) =>
    a.full_name.localeCompare(b.full_name, 'ar')
  );
}