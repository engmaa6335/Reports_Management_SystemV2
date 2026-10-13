import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ================================================
// Types
// ================================================

export interface NotificationType {
  id: string;
  code: string;
  name_ar: string;
  category: string | null;
  icon: string | null;
  color: string | null;
}

export interface NotificationWithDetails {
  // Recipient data
  recipient_id: string;
  is_read: boolean;
  read_at: string | null;
  channel: string;
  created_at: string;

  // Notification data
  notification_id: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  priority: string;
  notification_created_at: string;

  // Type data
  notification_type: NotificationType | null;
}

interface NotificationsState {
  notifications: NotificationWithDetails[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  realtimeChannel: RealtimeChannel | null;

  loadNotifications: (userId: string) => Promise<void>;
  markAsRead: (recipientId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  subscribeToRealtime: (userId: string) => void;
  unsubscribe: () => void;
  clear: () => void;
}

// ================================================
// Store
// ================================================

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  realtimeChannel: null,

  // ================================================
  // Load Notifications
  // ================================================
  loadNotifications: async (userId) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('notification_recipients')
        .select(
          `
          id,
          is_read,
          read_at,
          channel,
          created_at,
          notification:notifications!inner (
            id,
            title,
            body,
            data,
            priority,
            created_at,
            notification_type:notification_types (
              id,
              code,
              name_ar,
              category,
              icon,
              color
            )
          )
          `
        )
        .eq('user_id', userId)
        .eq('channel', 'in_app')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading notifications:', error);
        throw error;
      }

      const notifications: NotificationWithDetails[] = (data || []).map(
        (item: any) => ({
          recipient_id: item.id,
          is_read: item.is_read,
          read_at: item.read_at,
          channel: item.channel,
          created_at: item.created_at,
          notification_id: item.notification.id,
          title: item.notification.title,
          body: item.notification.body,
          data: item.notification.data || {},
          priority: item.notification.priority,
          notification_created_at: item.notification.created_at,
          notification_type: item.notification.notification_type,
        })
      );

      const unreadCount = notifications.filter((n) => !n.is_read).length;

      set({ notifications, unreadCount, loading: false });
    } catch (err) {
      console.error('loadNotifications error:', err);
      set({
        loading: false,
        error:
          err instanceof Error ? err.message : 'خطأ في تحميل التنبيهات',
      });
    }
  },

  // ================================================
  // Mark as Read
  // ================================================
  markAsRead: async (recipientId) => {
    try {
      const { error } = await supabase
        .from('notification_recipients')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', recipientId);

      if (error) {
        console.error('Error marking as read:', error);
        throw error;
      }

      set((state) => {
        const updated = state.notifications.map((n) =>
          n.recipient_id === recipientId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        );
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.is_read).length,
        };
      });
    } catch (err) {
      console.error('markAsRead error:', err);
    }
  },

  // ================================================
  // Mark All as Read
  // ================================================
  markAllAsRead: async (userId) => {
    try {
      const { error } = await supabase
        .from('notification_recipients')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        throw error;
      }

      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('markAllAsRead error:', err);
    }
  },

  // ================================================
  // Subscribe to Realtime
  // ================================================
  subscribeToRealtime: (userId) => {
    // إزالة الاشتراك القديم
    const existing = get().realtimeChannel;
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_recipients',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('🔔 Realtime notification received:', payload);

          // جلب التنبيه الكامل
          const { data } = await supabase
            .from('notification_recipients')
            .select(
              `
              id,
              is_read,
              read_at,
              channel,
              created_at,
              notification:notifications!inner (
                id,
                title,
                body,
                data,
                priority,
                created_at,
                notification_type:notification_types (
                  id,
                  code,
                  name_ar,
                  category,
                  icon,
                  color
                )
              )
              `
            )
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const newNotif: NotificationWithDetails = {
              recipient_id: data.id,
              is_read: data.is_read,
              read_at: data.read_at,
              channel: data.channel,
              created_at: data.created_at,
              notification_id: (data.notification as any).id,
              title: (data.notification as any).title,
              body: (data.notification as any).body,
              data: (data.notification as any).data || {},
              priority: (data.notification as any).priority,
              notification_created_at: (data.notification as any).created_at,
              notification_type: (data.notification as any)
                .notification_type,
            };

            set((state) => ({
              notifications: [newNotif, ...state.notifications],
              unreadCount: state.unreadCount + 1,
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_recipients',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          set((state) => {
            const updated = state.notifications.map((n) =>
              n.recipient_id === payload.new.id
                ? {
                    ...n,
                    is_read: payload.new.is_read,
                    read_at: payload.new.read_at,
                  }
                : n
            );
            return {
              notifications: updated,
              unreadCount: updated.filter((n) => !n.is_read).length,
            };
          });
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime status:', status);
      });

    set({ realtimeChannel: channel });
  },

  // ================================================
  // Unsubscribe
  // ================================================
  unsubscribe: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ realtimeChannel: null });
    }
  },

  // ================================================
  // Clear
  // ================================================
  clear: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
    }
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      realtimeChannel: null,
    });
  },
}));