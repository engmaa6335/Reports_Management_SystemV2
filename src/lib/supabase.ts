import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing Supabase environment variables.\n' +
    'Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ════════════════════════════════════════════════════════════
// Helper للتأكد من الاتصال
// ════════════════════════════════════════════════════════════

export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('roles').select('id').limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err);
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// ⚠️ للتطوير فقط — يُعرّض supabase لـ DevTools Console
// يُمكّن الاختبار السريع من Console (window.__supabase)
// لا يعمل في بيئة الإنتاج (production build)
// ════════════════════════════════════════════════════════════

if (import.meta.env.DEV) {
  (window as any).__supabase = supabase;
  console.log('🔧 [DEV] window.__supabase جاهز للاستخدام في Console');
}