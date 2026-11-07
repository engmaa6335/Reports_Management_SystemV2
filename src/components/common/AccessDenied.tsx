// src/components/common/AccessDenied.tsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, ArrowRight } from 'lucide-react';
import { Button, Card } from '../ui';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface AccessDeniedProps {
  /** الصلاحية المطلوبة (لعرضها للمستخدم) */
  permission?: string;
  /** عنوان مخصص (اختياري) */
  title?: string;
  /** وصف مخصص (اختياري) */
  description?: string;
  /** إظهار زر العودة للوحة التحكم */
  showBackButton?: boolean;
  /** حجم مصغّر (بدل الملء الكامل) */
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function AccessDenied({
  permission,
  title,
  description,
  showBackButton = true,
  compact = false,
}: AccessDeniedProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const defaultTitle = title || 'لا تملك صلاحية الوصول';
  const defaultDesc =
    description ||
    'هذه الصفحة تتطلب صلاحية خاصة. تواصل مع الدعم الفني لمنحك الصلاحية (فردياً أو عبر دورك).';

  const content = (
    <div className={compact ? 'p-6' : 'p-8'}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger/10 text-danger mb-4">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-text mb-2">{defaultTitle}</h2>

        <p className="text-text-secondary text-sm mb-4 max-w-md mx-auto">
          {defaultDesc}
        </p>

        {permission && (
          <div className="mb-6">
            <p className="text-xs text-text-muted mb-2">
              الصلاحية المطلوبة:
            </p>
            <code className="inline-block px-3 py-1.5 rounded-lg bg-bg-secondary text-primary font-mono text-sm border border-border">
              {permission}
            </code>
          </div>
        )}

        {showBackButton && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate(-1)}
            >
              العودة
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/dashboard')}
            >
              لوحة التحكم
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <Card padding="none" className="border-danger/30">
        {content}
      </Card>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <Card padding="none">{content}</Card>
    </div>
  );
}

export default AccessDenied;