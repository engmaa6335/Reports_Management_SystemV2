import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  ComputedRecipient,
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  RecipientIntent,
  SendManualResult,
} from '../types/notifications.types';
import { EMPTY_INTENT } from '../types/notifications.types';
import {
  generateIdempotencyKey,
  notificationsService,
  NotificationError,
} from '../services/notifications.service';

// ════════════════════════════════════════════════════════════
// الحالة
// ════════════════════════════════════════════════════════════

interface ComposerState {
  // ── الرسالة ──
  title: string;
  body: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  isImportant: boolean;
  category: NotificationCategory;

  // ── النية ──
  intent: RecipientIntent;

  // ── النتيجة المحسوبة ──
  recipients: ComputedRecipient[];
  computingRecipients: boolean;
  computeError: string | null;

  // ── الإرسال ──
  idempotencyKey: string | null;
  sending: boolean;
  sendError: string | null;
  lastResult: SendManualResult | null;

  // ── التراجع ──
  undoSnapshot: Partial<ComposerState> | null;

  // ── Actions: الرسالة ──
  setTitle: (v: string) => void;
  setBody: (v: string) => void;
  setChannel: (v: NotificationChannel) => void;
  setPriority: (v: NotificationPriority) => void;
  setIsImportant: (v: boolean) => void;
  setCategory: (v: NotificationCategory) => void;

  // ── Actions: النية ──
  addEntity: (id: string) => void;
  removeEntity: (id: string) => void;
  setEntityExclusions: (entityId: string, userIds: string[]) => void;

  addRole: (id: string) => void;
  removeRole: (id: string) => void;

  addManualUser: (userId: string) => void;
  removeManualUser: (userId: string) => void;

  excludeUser: (userId: string) => void;
  restoreUser: (userId: string) => void;

  clearAllSources: () => void;

  // ── Actions: الحساب ──
  refreshRecipients: (scopeUserId: string) => Promise<void>;

  // ── Actions: الإرسال ──
  send: () => Promise<SendManualResult | null>;

  // ── Actions: إدارة ──
  reset: () => void;
  takeSnapshot: () => void;
  restoreSnapshot: () => void;
}

// ════════════════════════════════════════════════════════════
// الحالة الابتدائية
// ════════════════════════════════════════════════════════════

const INITIAL = {
  title: '',
  body: '',
  channel: 'internal' as NotificationChannel,
  priority: 'normal' as NotificationPriority,
  isImportant: false,
  category: 'custom' as NotificationCategory,

  intent: { ...EMPTY_INTENT, entity_exclusions: {} } as RecipientIntent,

  recipients: [] as ComputedRecipient[],
  computingRecipients: false,
  computeError: null as string | null,

  idempotencyKey: null as string | null,
  sending: false,
  sendError: null as string | null,
  lastResult: null as SendManualResult | null,

  undoSnapshot: null as Partial<ComposerState> | null,
};

// ════════════════════════════════════════════════════════════
// Store
// ════════════════════════════════════════════════════════════

export const useNotificationComposerStore = create<ComposerState>()(
  subscribeWithSelector((set, get) => ({
    ...INITIAL,

    // ── الرسالة ────────────────────────────────────────────
    setTitle: (v) => set({ title: v }),
    setBody: (v) => set({ body: v }),
    setChannel: (v) => set({ channel: v }),
    setPriority: (v) => set({ priority: v }),
    setIsImportant: (v) => set({ isImportant: v }),
    setCategory: (v) => set({ category: v }),

    // ── التراجع ────────────────────────────────────────────
    takeSnapshot: () =>
      set((s) => ({
        undoSnapshot: {
          intent: JSON.parse(JSON.stringify(s.intent)) as RecipientIntent,
          recipients: s.recipients,
        },
      })),

    restoreSnapshot: () =>
      set((s) => {
        if (!s.undoSnapshot) return {};
        return {
          intent: s.undoSnapshot.intent ?? s.intent,
          recipients: s.undoSnapshot.recipients ?? s.recipients,
          undoSnapshot: null,
        };
      }),

    // ── الكيانات ───────────────────────────────────────────
    addEntity: (id) =>
      set((s) => {
        if (s.intent.entity_ids.includes(id)) return {};
        return {
          intent: {
            ...s.intent,
            entity_ids: [...s.intent.entity_ids, id],
          },
        };
      }),

    removeEntity: (id) =>
      set((s) => {
        const { [id]: _removed, ...restExcl } = s.intent.entity_exclusions;
        return {
          intent: {
            ...s.intent,
            entity_ids: s.intent.entity_ids.filter((x) => x !== id),
            entity_exclusions: restExcl,
          },
        };
      }),

    setEntityExclusions: (entityId, userIds) =>
      set((s) => ({
        intent: {
          ...s.intent,
          entity_exclusions: {
            ...s.intent.entity_exclusions,
            [entityId]: userIds,
          },
        },
      })),

    // ── الأدوار ────────────────────────────────────────────
    addRole: (id) =>
      set((s) => {
        if (s.intent.role_ids.includes(id)) return {};
        return {
          intent: { ...s.intent, role_ids: [...s.intent.role_ids, id] },
        };
      }),

    removeRole: (id) =>
      set((s) => ({
        intent: {
          ...s.intent,
          role_ids: s.intent.role_ids.filter((x) => x !== id),
        },
      })),

    // ── الإضافة اليدوية ────────────────────────────────────
    addManualUser: (userId) =>
      set((s) => {
        const alreadyManual = s.intent.manual_user_ids.includes(userId);
        const excluded = s.intent.excluded_user_ids.includes(userId);
        if (alreadyManual && !excluded) return {};
        return {
          intent: {
            ...s.intent,
            manual_user_ids: alreadyManual
              ? s.intent.manual_user_ids
              : [...s.intent.manual_user_ids, userId],
            excluded_user_ids: s.intent.excluded_user_ids.filter(
              (x) => x !== userId
            ),
          },
        };
      }),

    removeManualUser: (userId) =>
      set((s) => ({
        intent: {
          ...s.intent,
          manual_user_ids: s.intent.manual_user_ids.filter(
            (x) => x !== userId
          ),
        },
      })),

    // ── الاستثناءات ────────────────────────────────────────
    excludeUser: (userId) =>
      set((s) => ({
        intent: {
          ...s.intent,
          manual_user_ids: s.intent.manual_user_ids.filter(
            (x) => x !== userId
          ),
          excluded_user_ids: s.intent.excluded_user_ids.includes(userId)
            ? s.intent.excluded_user_ids
            : [...s.intent.excluded_user_ids, userId],
        },
      })),

    restoreUser: (userId) =>
      set((s) => ({
        intent: {
          ...s.intent,
          excluded_user_ids: s.intent.excluded_user_ids.filter(
            (x) => x !== userId
          ),
        },
      })),

    clearAllSources: () =>
      set({
        intent: { ...EMPTY_INTENT, entity_exclusions: {} },
        recipients: [],
      }),

    // ── الحساب ─────────────────────────────────────────────
    refreshRecipients: async (scopeUserId) => {
      set({ computingRecipients: true, computeError: null });
      try {
        const list = await notificationsService.computeRecipients(
          get().intent,
          scopeUserId
        );
        set({ recipients: list, computingRecipients: false });
      } catch (e) {
        const msg =
          e instanceof NotificationError ? e.message : 'فشل حساب المستلمين';
        set({ computingRecipients: false, computeError: msg });
      }
    },

    // ── الإرسال ────────────────────────────────────────────
    send: async () => {
      const s = get();
      set({ sending: true, sendError: null });

      try {
        const key = s.idempotencyKey ?? generateIdempotencyKey();

        const result = await notificationsService.sendManual({
          title: s.title.trim(),
          body: s.body.trim(),
          channel: s.channel,
          priority: s.priority,
          is_important: s.isImportant,
          intent: s.intent,
          idempotency_key: key,
          category: s.category,
        });

        set({
          sending: false,
          idempotencyKey: key,
          lastResult: result,
        });

        return result;
      } catch (e) {
        const msg =
          e instanceof NotificationError ? e.message : 'فشل إرسال التنبيه';
        set({ sending: false, sendError: msg });
        return null;
      }
    },

    // ── إعادة التعيين ──────────────────────────────────────
    reset: () =>
      set({
        ...INITIAL,
        intent: { ...EMPTY_INTENT, entity_exclusions: {} },
      }),
  }))
);

// ════════════════════════════════════════════════════════════
// Selectors مساعدة
// ════════════════════════════════════════════════════════════

export const selectRecipientCount = (s: ComposerState) => s.recipients.length;

export const selectHasSources = (s: ComposerState) =>
  s.intent.entity_ids.length > 0 ||
  s.intent.role_ids.length > 0 ||
  s.intent.manual_user_ids.length > 0;

export const selectExcludedCount = (s: ComposerState) =>
  s.intent.excluded_user_ids.length;

export const selectIsStep1Valid = (s: ComposerState) =>
  s.title.trim().length > 0 &&
  s.body.trim().length > 0 &&
  (s.channel === 'internal' || s.channel === 'email' || s.channel === 'both');

export const selectIsStep2Valid = (s: ComposerState) =>
  s.recipients.length > 0;

export const selectIsSendable = (s: ComposerState) =>
  selectIsStep1Valid(s) && selectIsStep2Valid(s) && !s.sending;