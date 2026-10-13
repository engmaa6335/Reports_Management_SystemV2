import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ar from './ar.json';
import en from './en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    // 🔑 فرض العربية كلغة افتراضية
    lng: localStorage.getItem('i18nextLng') || 'ar',
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage'], // 🔑 لا نستخدم navigator
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// 🔑 تحديث الاتجاه عند البدء وعند أي تغيير
function updateDirection(lng: string) {
  const dir = lng === 'en' ? 'ltr' : 'rtl';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
  console.log(`🌐 Language: ${lng}, Direction: ${dir}`);
}

// عند البدء
updateDirection(i18n.language || 'ar');

// عند تغيير اللغة
i18n.on('languageChanged', updateDirection);

export default i18n;