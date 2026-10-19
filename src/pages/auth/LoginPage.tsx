import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, LogIn, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { Button, Input, Card } from '../../components/ui';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, loading, error, clearError, user, initialized } = useAuthStore();

  const [identifier, setIdentifier] = useState(''); // بريد أو اسم مستخدم
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (initialized && user) {
      navigate('/select-entity', { replace: true });
    }
  }, [initialized, user, navigate]);

  // التمييز لتغيير الأيقونة فقط
  const isEmail = identifier.includes('@');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    // تنظيف المدخلات (حذف المسافات وتحويلها لحروف صغيرة)
    const cleanIdentifier = identifier.trim().toLowerCase();

    if (!cleanIdentifier || !password) {
      setLocalError('الرجاء إدخال البريد/اسم المستخدم وكلمة المرور');
      return;
    }

    if (cleanIdentifier.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier)) {
      setLocalError('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }

    try {
      await signIn(cleanIdentifier, password);
    } catch {
      // الخطأ يظهر من الـ store
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary p-4">
      <div className="w-full max-w-md">
        {/* الشعار والعنوان */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-4 shadow-medium">
            <span className="text-4xl">🏛️</span>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            {t('common.app_name')}
          </h1>
          <p className="text-text-secondary">{t('auth.login_subtitle')}</p>
        </div>

        {/* بطاقة تسجيل الدخول */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text mb-6 text-center">
            {t('auth.login_title')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="text"
              label="البريد الإلكتروني أو اسم المستخدم"
              placeholder="example@edc.ps أو username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              icon={
                isEmail ? (
                  <Mail className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )
              }
              required
              autoComplete="username"
              autoFocus
              dir="ltr"
              className="text-left"
            />

            <div className="relative" dir="ltr">
              <Input
                type={showPassword ? 'text' : 'password'}
                label={t('auth.password')}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
                required
                autoComplete="current-password"
                dir="ltr"
                className="text-left pl-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute left-3 top-[36px] text-text-muted hover:text-text transition-colors z-10"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {displayError && (
              <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <span className="text-lg leading-none">⚠️</span>
                <span>{displayError}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={!loading ? <LogIn className="w-5 h-5" /> : undefined}
            >
              {loading ? t('auth.signing_in') : t('auth.sign_in')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-text-muted">
              {t('auth.no_account')}
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-text-muted mt-6">
          © 2026 EDC Platform — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}