import { Check, RotateCcw, Loader2 } from 'lucide-react';
import { useThemeStore } from '../stores/theme-store';
import { useAuthStore } from '../stores/auth-store';

interface ThemePickerProps {
  title?: string;
  description?: string;
  resetLabel?: string;
}

export function ThemePicker({
  title = 'الثيمات المتاحة',
  description = 'اختر الثيم المفضّل لك — يُطبَّق فوراً ويُحفظ لحسابك',
  resetLabel = 'إعادة تعيين للافتراضي',
}: ThemePickerProps) {
  const { themes, currentCode, selectTheme, resetToDefault, loading } =
    useThemeStore();
  const userId = useAuthStore((s) => s.user?.id);

  if (!userId) return null;

  const isDefault = currentCode === 'light';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-text">{title}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        </div>
        {!isDefault && (
          <button
            onClick={() => resetToDefault(userId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary text-text-secondary hover:bg-border text-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {resetLabel}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {themes.map((t) => {
            const active = t.code === currentCode;
            return (
              <button
                key={t.id}
                onClick={() => selectTheme(userId, t.code)}
                className={`relative rounded-xl border-2 p-3 text-right transition ${
                  active
                    ? 'border-primary shadow-soft'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div
                  className="h-16 rounded-lg mb-2 flex items-end p-2"
                  style={{
                    background: t.colors?.['--color-primary'] || '#1a3a6b',
                    color: t.colors?.['--color-bg'] || '#ffffff',
                  }}
                >
                  <span className="text-xs font-bold">{t.name_ar}</span>
                </div>
                <div className="text-sm font-medium text-text truncate">
                  {t.name_ar}
                </div>
                {active && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}