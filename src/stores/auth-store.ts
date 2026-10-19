import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { AuthUser } from '../lib/supabase-auth';
import {
  signIn as authSignIn,
  signOut as authSignOut,
  fetchUserProfile,
  getCurrentSession,
} from '../lib/supabase-auth';
import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════
// Store Types
// ═══════════════════════════════════════════════════════════

interface AuthState {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>; // identifier: بريد أو اسم مستخدم
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

let authInitialized = false;
let authUnsubscribe: (() => void) | null = null;

// ═══════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: false,
  initialized: false,
  error: null,

  initialize: async () => {
    if (authInitialized) {
      console.log('✅ Auth already initialized');
      return;
    }
    authInitialized = true;

    try {
      set({ loading: true });

      const session = await getCurrentSession();

      if (session?.user) {
        const user = await fetchUserProfile(session.user.id);
        if (user) {
          set({ session, user });
        } else {
          await supabase.auth.signOut();
          set({ session: null, user: null });
        }
      }

      set({ initialized: true, loading: false });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔄 Auth event:', event);

          if (event === 'SIGNED_IN' && session?.user) {
            const currentUser = get().user;
            if (currentUser?.authUserId === session.user.id) {
              return;
            }

            const user = await fetchUserProfile(session.user.id);
            if (user) {
              set({ session, user });
            }
          } else if (event === 'SIGNED_OUT') {
            set({ session: null, user: null });
          } else if (event === 'TOKEN_REFRESHED' && session) {
            set({ session });
          }
        }
      );

      authUnsubscribe = () => subscription.unsubscribe();
    } catch (err) {
      console.error('❌ Initialize error:', err);
      set({
        initialized: true,
        loading: false,
        error: err instanceof Error ? err.message : 'خطأ في التهيئة',
      });
    }
  },

  /**
   * تسجيل الدخول باستخدام البريد أو اسم المستخدم
   */
  signIn: async (identifier, password) => {
    try {
      set({ loading: true, error: null });

      const { user: authUser } = await authSignIn(identifier, password);
      if (!authUser) throw new Error('فشل تسجيل الدخول');

      const user = await fetchUserProfile(authUser.id);
      if (!user) {
        await supabase.auth.signOut();
        throw new Error('حسابك غير مُفعّل — تواصل مع الدعم الفني');
      }

      // تحديث آخر دخول
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);

      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطأ في تسجيل الدخول';
      set({ error: message, loading: false });
      throw err;
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      await authSignOut();
      set({ session: null, user: null, loading: false, error: null });
    } catch (err) {
      console.error('❌ Sign out error:', err);
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),

  refreshUser: async () => {
    const { session } = get();
    if (!session?.user) return;
    const user = await fetchUserProfile(session.user.id);
    if (user) set({ user });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    authUnsubscribe?.();
  });
}