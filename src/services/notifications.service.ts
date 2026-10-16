import { supabase } from '../lib/supabase';
import {
  mapRawComputedRecipient,
  type ComputedRecipient,
  type NotificationDetail,
  type NotificationLogEntry,
  type RawComputedRecipient,
  type RecipientIntent,
  type SendManualPayload,
  type SendManualResult,
  type UserSearchResult,
} from '../types/notifications.types';

// ════════════════════════════════════════════════════════════
// معالجة الأخطاء
// ════════════════════════════════════════════════════════════

export class NotificationError extends Error {
  code: string;
  original?: unknown;

  constructor(code: string, message: string, original?: unknown) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
    this.original = original;
  }
}

function parsePgError(error: { message?: string; code?: string }): NotificationError {
  const msg = error.message ?? 'خطأ غير معروف';
  const match = msg.match(/^([A-Z_]+):\s*(.*)$/);
  if (match) {
    return new NotificationError(match[1], match[2], error);
  }
  return new NotificationError(error.code ?? 'UNKNOWN', msg, error);
}

// ════════════════════════════════════════════════════════════
// Service
// ════════════════════════════════════════════════════════════

export const notificationsService = {
  // ──────────────────────────────────────────────────────────
  // البحث عن المستخدمين
  // ──────────────────────────────────────────────────────────
  async searchUsers(
    query: string,
    limit = 20,
    offset = 0
  ): Promise<UserSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const { data, error } = await supabase.rpc('search_users_for_notification', {
      p_query: query.trim(),
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw parsePgError(error);
    return (data ?? []) as UserSearchResult[];
  },

  // ──────────────────────────────────────────────────────────
  // حساب المستلمين
  // ──────────────────────────────────────────────────────────
  async computeRecipients(
    intent: RecipientIntent,
    scopeUserId: string
  ): Promise<ComputedRecipient[]> {
    const { data, error } = await supabase.rpc('compute_notification_recipients', {
      p_intent: intent,
      p_scope_user_id: scopeUserId,
    });

    if (error) throw parsePgError(error);
    return ((data ?? []) as RawComputedRecipient[]).map(mapRawComputedRecipient);
  },

  // ──────────────────────────────────────────────────────────
  // إرسال تنبيه مخصص
  // ──────────────────────────────────────────────────────────
  async sendManual(payload: SendManualPayload): Promise<SendManualResult> {
    const { data, error } = await supabase.rpc('send_manual_notification', {
      p_title: payload.title,
      p_body: payload.body,
      p_channel: payload.channel,
      p_priority: payload.priority,
      p_is_important: payload.is_important,
      p_intent: payload.intent,
      p_idempotency_key: payload.idempotency_key,
      p_category: payload.category ?? 'custom',
    });

    if (error) throw parsePgError(error);
    return data as SendManualResult;
  },

  // ──────────────────────────────────────────────────────────
  // سجل التنبيهات
  // ──────────────────────────────────────────────────────────
  async listLog(params: {
    source?: 'manual' | 'automatic';
    category?: string;
    search?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<NotificationLogEntry[]> {
    const { data, error } = await supabase.rpc('list_notifications_log', {
      p_source: params.source ?? null,
      p_category: params.category ?? null,
      p_search: params.search ?? null,
      p_from: params.from ?? null,
      p_to: params.to ?? null,
      p_limit: params.limit ?? 30,
      p_offset: params.offset ?? 0,
    });

    if (error) throw parsePgError(error);
    return (data ?? []) as NotificationLogEntry[];
  },

  // ──────────────────────────────────────────────────────────
  // تفاصيل تنبيه واحد
  // ──────────────────────────────────────────────────────────
  async getDetail(id: string): Promise<NotificationDetail | null> {
    const { data, error } = await supabase.rpc('get_notification_detail', {
      p_id: id,
    });

    if (error) throw parsePgError(error);
    return (data ?? null) as NotificationDetail | null;
  },
};

// ════════════════════════════════════════════════════════════
// معرّف فريد للإرسال (Idempotency Key)
// ════════════════════════════════════════════════════════════

export function generateIdempotencyKey(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `manual-${ts}-${rand}`;
}