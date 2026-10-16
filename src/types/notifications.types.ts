// ════════════════════════════════════════════════════════════
// أنواع وحدة إدارة التنبيهات
// ════════════════════════════════════════════════════════════

export type SourceType = 'entity' | 'role' | 'manual';

export interface RecipientSource {
  type: SourceType;
  id: string | null;
  label: string;
}

export interface RecipientIntent {
  entity_ids: string[];
  entity_exclusions: Record<string, string[]>;
  role_ids: string[];
  manual_user_ids: string[];
  excluded_user_ids: string[];
}

export const EMPTY_INTENT: RecipientIntent = {
  entity_ids: [],
  entity_exclusions: {},
  role_ids: [],
  manual_user_ids: [],
  excluded_user_ids: [],
};

export interface ComputedRecipient {
  user_id: string;
  full_name: string;
  email: string;
  username: string;
  sources: RecipientSource[];
  source_labels: string;
}

export interface RawComputedRecipient {
  out_user_id: string;
  out_full_name: string;
  out_email: string;
  out_username: string;
  out_sources: RecipientSource[];
  out_source_labels: string;
}

export function mapRawComputedRecipient(r: RawComputedRecipient): ComputedRecipient {
  return {
    user_id: r.out_user_id,
    full_name: r.out_full_name,
    email: r.out_email,
    username: r.out_username,
    sources: r.out_sources,
    source_labels: r.out_source_labels,
  };
}

export interface UserSearchResult {
  user_id: string;
  full_name: string;
  email: string;
  username: string;
  entity_names: string | null;
  is_active: boolean;
  is_in_scope: boolean;
  total_count: number;
}

export type NotificationChannel = 'internal' | 'email' | 'both';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationCategory = 'report' | 'aggregate' | 'admin' | 'custom';

export interface SendManualPayload {
  title: string;
  body: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  is_important: boolean;
  intent: RecipientIntent;
  idempotency_key: string;
  category?: NotificationCategory;
}

export interface SendManualResult {
  status: 'ok' | 'duplicate';
  notification_id: string;
  recipient_count?: number;
  message?: string;
}

export interface NotificationLogEntry {
  id: string;
  title: string;
  body: string | null;
  source: 'manual' | 'automatic';
  category: string | null;
  priority: string | null;
  channel: string;
  is_important: boolean;
  created_at: string;
  sent_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  notification_type_name: string | null;
  recipient_count: number;
  read_count: number;
  total_count: number;
  snapshot: SnapshotEntry[] | null;
  intent: RecipientIntent | null;
}

export interface SnapshotEntry {
  user_id: string;
  name: string;
  email: string;
  username?: string;
  sources: RecipientSource[];
}

export interface NotificationDetail {
  notification: {
    id: string;
    title: string;
    body: string | null;
    priority: string | null;
    created_at: string;
    sent_at: string | null;
    created_by: string | null;
    created_by_name: string | null;
    source: 'manual' | 'automatic';
    category: string | null;
    channel: string;
    is_important: boolean;
    intent: RecipientIntent | null;
    snapshot: SnapshotEntry[] | null;
    idempotency_key: string | null;
  };
  recipients: NotificationDetailRecipient[];
}

export interface NotificationDetailRecipient {
  recipient_id: string;
  user_id: string;
  full_name: string;
  email: string;
  username: string;
  is_read: boolean;
  read_at: string | null;
  delivery_status: string | null;
  delivered_at: string | null;
  error_message: string | null;
}

export type ComposerStep = 1 | 2 | 3;

export interface ComposerStepDef {
  id: ComposerStep;
  label: string;
  description: string;
}

export const COMPOSER_STEPS: ComposerStepDef[] = [
  { id: 1, label: 'الرسالة', description: 'العنوان والنص والقناة' },
  { id: 2, label: 'المستلمون', description: 'كيانات، أدوار، إضافة يدوية' },
  { id: 3, label: 'المراجعة والإرسال', description: 'تأكيد القائمة النهائية' },
];