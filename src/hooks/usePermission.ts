// src/hooks/usePermission.ts
// ═══════════════════════════════════════════════════════════════════════
// usePermission — يمرّر entityId فقط إذا مُرِّر صراحةً
// ⭐ لا يستخدم activeEntity افتراضياً (لتجنب كسر الإعدادات)
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  usePermissionsRefresh,
  initPermissionsRealtime,
} from '../stores/permissions-refresh-store';

export function usePermission(code: string, entityId?: string | null) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const version = usePermissionsRefresh((s) => s.version);
  const initRef = useRef(false);

  // ⭐ لا نستخدم activeEntity افتراضياً
  // إذا مُرِّر entityId صراحةً → استخدمه (حتى لو null)
  // وإلا → null (aggregate mode)
  const finalEntityId = entityId !== undefined ? entityId : null;

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      initPermissionsRealtime();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkPermission = async () => {
      try {
        const { data, error } = await supabase.rpc('check_user_has_permission', {
          perm_code: code,
          p_entity_id: finalEntityId,
        });
        if (!cancelled) setAllowed(error ? false : !!data);
      } catch {
        if (!cancelled) setAllowed(false);
      }
    };

    checkPermission();

    return () => {
      cancelled = true;
    };
  }, [code, finalEntityId, version]);

  return { allowed: allowed === true, loading: allowed === null };
}