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
 * تسجيل الدخول بالبريد أو اسم المستخدم وكلمة المرور
 */
export async function signIn(identifier: string, password: string) {
  const cleanIdentifier = identifier.trim().toLowerCase();
  let emailToAuth = cleanIdentifier;

  // إذا لم يكن بريداً إلكترونياً، فهو اسم مستخدم
  if (!cleanIdentifier.includes('@')) {
    // 🔑 استدعاء دالة RPC الآمنة للبحث عن البريد
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_email_by_username', { p_username: cleanIdentifier });

    if (rpcError) {
      console.error('❌ خطأ في البحث عن اسم المستخدم:', rpcError);
      throw new Error('حدث خطأ في الاتصال بقاعدة البيانات');
    }

    // التحقق مما إذا كانت الدالة قد أرجعت أي نتيجة
    if (!rpcData || rpcData.length === 0 || !rpcData[0].email) {
      throw new Error('اسم المستخدم غير موجود أو الحساب غير مفعل');
    }

    emailToAuth = rpcData[0].email;
  }

  // إرسال الطلب لـ Supabase بالبريد الإلكتروني
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToAuth,
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