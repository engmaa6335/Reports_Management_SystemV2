import { supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface AuthUser {
  id: string;
  authUserId: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  preferredLanguage: string;
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════
// Auth Functions
// ═══════════════════════════════════════════════════════════

/**
 * تسجيل الدخول بالبريد وكلمة المرور
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Sign in error:', error.message);
    throw new Error(getArabicError(error.message));
  }

  return data;
}

/**
 * تسجيل الخروج
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('❌ Sign out error:', error.message);
    throw error;
  }
}

/**
 * جلب جلسة المستخدم الحالي
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('❌ Get session error:', error.message);
    return null;
  }
  return session;
}

/**
 * جلب بيانات المستخدم من جدول public.users
 */
export async function fetchUserProfile(authUserId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('❌ Fetch user profile error:', error.message);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    authUserId: data.auth_user_id,
    username: data.username,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    preferredLanguage: data.preferred_language,
    isActive: data.is_active,
  };
}

/**
 * الاستماع لتغييرات المصادقة
 */
export function onAuthStateChange(callback: (user: SupabaseUser | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

/**
 * ترجمة أخطاء Supabase Auth إلى العربية
 */
function getArabicError(message: string): string {
  const errors: Record<string, string> = {
    'Invalid login credentials': 'بيانات الدخول غير صحيحة',
    'Email not confirmed': 'البريد الإلكتروني غير مؤكد',
    'User not found': 'المستخدم غير موجود',
    'Too many requests': 'محاولات كثيرة — انتظر قليلاً',
    'Network error': 'خطأ في الشبكة — تحقق من الاتصال',
  };

  return errors[message] || message;
}