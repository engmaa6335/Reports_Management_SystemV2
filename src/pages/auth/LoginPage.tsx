import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { Button, Input, Card } from '../../components/ui';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, loading, error, clearError, user, initialized } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // 🔑 التوجيه داخل useEffect (ليس في render)
  useEffect(() => {
    if (initialized && user) {
      navigate('/select-entity', { replace: true });
    }
  }, [initialized, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError('الرجاء إدخال البريد وكلمة المرور');
      return;
    }

    try {
      await signIn(email, password);
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
              type="email"
              label={t('auth.email')}
              placeholder="example@edc.ps"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-5 h-5" />}
              required
              autoComplete="email"
              autoFocus
              dir="ltr"
              className="text-left"
            />

            <Input
              type="password"
              label={t('auth.password')}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-5 h-5" />}
              required
              autoComplete="current-password"
              dir="ltr"
              className="text-left"
            />

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