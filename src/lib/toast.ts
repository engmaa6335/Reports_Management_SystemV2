// src/lib/toast.ts
// استخدام مؤقت بسيط — استبدله بمكتبة toast الموجودة في مشروعك

export const toast = {
  success: (msg: string) => console.log('✅', msg),
  error: (msg: string) => console.error('❌', msg),
  info: (msg: string) => console.info('ℹ️', msg),
};