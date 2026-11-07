// src/components/common/RequirePermission.tsx
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { AccessDenied } from './AccessDenied';
import { Loading } from '../ui/Loading';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface RequirePermissionProps {
  /** الصلاحية المطلوبة (مثل 'settings.view') */
  permission: string;
  /** الكيان (اختياري) — لدعم overrides على مستوى الكيان */
  entityId?: string | null;
  /** المحتوى عند النجاح */
  children: ReactNode;
  /** طريقة العرض عند الرفض (افتراضي: صفحة كاملة) */
  mode?: 'page' | 'compact';
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function RequirePermission({
  permission,
  entityId,
  children,
  mode = 'page',
}: RequirePermissionProps) {
  const { t } = useTranslation();
  const { allowed, loading } = usePermission(permission, entityId);

  // ⭐ أثناء التحقق — لا وميض، فقط مؤشر
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            {t('common.loading') || 'جاري التحقق من الصلاحيات...'}
          </p>
        </div>
      </div>
    );
  }

  // ⭐ رفض الوصول — رسالة واضحة بدل redirect صامت
  if (!allowed) {
    return <AccessDenied permission={permission} compact={mode === 'compact'} />;
  }

  return <>{children}</>;
}

export default RequirePermission;