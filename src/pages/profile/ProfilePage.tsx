import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Mail,
  Shield,
  Globe,
  CheckCircle2,
  XCircle,
  Languages,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { supabase } from '../../lib/supabase';
import { ThemePicker } from '../../components/ThemePicker';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [savingLang, setSavingLang] = useState(false);

  if (!user) return null;

  const currentLang = i18n.language || 'ar';

  const handleChangeLanguage = async (lang: 'ar' | 'en') => {
    if (lang === currentLang) return;
    setSavingLang(true);
    try {
      // 1. تغيير اللغة (i18n سيتولى تغيير الاتجاه تلقائياً بفضل listener)
      await i18n.changeLanguage(lang);

      // 2. حفظ التفضيل في قاعدة البيانات
      if (user.id) {
        await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id: user.id,
              language: lang,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
      }
    } catch (err) {
      console.error('Failed to change language:', err);
    } finally {
      setSavingLang(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">{t('profile.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {t('profile.subtitle')}
        </p>
      </div>

      {/* البيانات الشخصية — القيم تبقى بلغتها الأصلية */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          {t('profile.personal_info')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow
            icon={<User className="w-4 h-4" />}
            label={t('profile.full_name')}
            value={user.fullName}
          />
          <InfoRow
            icon={<Mail className="w-4 h-4" />}
            label={t('profile.email')}
            value={user.email}
          />
          <InfoRow
            icon={<Shield className="w-4 h-4" />}
            label={t('profile.username')}
            value={user.username}
          />
          <InfoRow
            icon={<Globe className="w-4 h-4" />}
            label={t('profile.preferred_language')}
            value={
              i18n.language === 'ar'
                ? 'العربية'
                : i18n.language === 'en'
                ? 'English'
                : i18n.language
            }
          />
          <InfoRow
            icon={
              user.isActive ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <XCircle className="w-4 h-4 text-danger" />
              )
            }
            label={t('profile.status')}
            value={user.isActive ? t('profile.active') : t('profile.inactive')}
          />
        </div>
      </div>

      {/* اختيار اللغة */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
          <Languages className="w-4 h-4 text-primary" />
          {t('profile.display_language')}
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          {t('profile.language_description')}
        </p>
        <div className="flex flex-wrap gap-3">
          <LanguageButton
            active={currentLang === 'ar'}
            onClick={() => handleChangeLanguage('ar')}
            disabled={savingLang}
            label="العربية"
            subLabel="Arabic"
          />
          <LanguageButton
            active={currentLang === 'en'}
            onClick={() => handleChangeLanguage('en')}
            disabled={savingLang}
            label="English"
            subLabel="الإنجليزية"
          />
        </div>
      </div>

      {/* الثيمات */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <ThemePicker
          title={t('profile.themes')}
          description={t('profile.themes_description')}
          resetLabel={t('profile.reset_theme')}
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-text-muted">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-text-muted">{label}</div>
        <div className="text-sm text-text truncate">{value}</div>
      </div>
    </div>
  );
}

function LanguageButton({
  active,
  onClick,
  disabled,
  label,
  subLabel,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
  subLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition ${
        active
          ? 'border-primary bg-primary/5 shadow-soft'
          : 'border-border bg-surface hover:border-primary/50'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className="text-right">
        <div className="text-sm font-bold text-text">{label}</div>
        <div className="text-xs text-text-muted">{subLabel}</div>
      </div>
      {active && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3" />
        </div>
      )}
    </button>
  );
}