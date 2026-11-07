// src/stores/permissions-refresh-store.ts
// ═══════════════════════════════════════════════════════════════════════
// Permissions Refresh Store — single Realtime channel
// ⭐ يُحدّث permissions + pages عند أي تغيير
// ═══════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface PermissionsRefreshState {
  version: number;
  bump: () => void;
}

export const usePermissionsRefresh = create<PermissionsRefreshState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

let _channelInitialized = false;
let _channel: ReturnType<typeof supabase.channel> | null = null;

async function refreshAll() {
  usePermissionsRefresh.getState().bump();

  // أعد تحميل الصفحات أيضاً
  try {
    const { usePagesStore } = await import('./pages-store');
    await usePagesStore.getState().refreshPages();
  } catch (err) {
    console.error('❌ [refresh-store] failed to refresh pages:', err);
  }
}

export function initPermissionsRealtime() {
  if (_channelInitialized) return;
  _channelInitialized = true;

  _channel = supabase
    .channel('permissions-global')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'role_permissions' },
      () => {
        console.log('🔄 role_permissions changed');
        refreshAll();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_entity_roles' },
      () => {
        console.log('🔄 user_entity_roles changed');
        refreshAll();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'permission_overrides' },
      () => {
        console.log('🔄 permission_overrides changed');
        refreshAll();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pages' },
      () => {
        console.log('🔄 pages changed');
        refreshAll();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Permissions realtime subscribed');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Permissions realtime error');
      }
    });
}

export function cleanupPermissionsRealtime() {
  if (_channel) {
    supabase.removeChannel(_channel);
    _channel = null;
    _channelInitialized = false;
  }
}