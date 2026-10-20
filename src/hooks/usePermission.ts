import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * يتحقق من صلاحية عبر has_capability (نفس مصدر الحقيقة في RLS)
 */
export function usePermission(code: string, entityId?: string | null) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('has_capability', {
        p_permission_code: code,
        p_entity_id: entityId ?? null,
      });
      if (!cancelled) setAllowed(error ? false : !!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, entityId]);

  return { allowed: allowed === true, loading: allowed === null };
}