// src/hooks/usePermission.ts
// ═══════════════════════════════════════════════════════════════════════
// usePermission — يمرّر activeEntity تلقائياً (إلا إذا مُرِّر صراحةً)
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  usePermissionsRefresh,
  initPermissionsRealtime,
} from '../stores/permissions-refresh-store';
import { useEntityStore } from '../stores/entity-store';

export function usePermission(code: string, entityId?: string | null) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const version = usePermissionsRefresh((s) => s.version);
  const initRef = useRef(false);

  // ⭐ احصل على activeEntity من store
  const activeEntityId = useEntityStore((s) => s.activeEntity?.entityId);

  // ⭐ إذا مُرِّر entityId صراحةً (حتى لو null) → استخدمه
  //    وإلا → استخدم activeEntity
  const finalEntityId =
    entityId !== undefined ? entityId : activeEntityId ?? null;

  // init مرة واحدة
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      initPermissionsRealtime();
    }
  }, []);

  // إعادة الفحص عند تغيير code / entity / version
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