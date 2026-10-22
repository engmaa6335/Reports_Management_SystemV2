import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function usePermission(code: string, entityId?: string | null) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: any = null;

    const checkPermission = async () => {
      try {
        // استدعاء الدالة في قاعدة البيانات التي تتجاوز RLS
        const { data, error } = await supabase.rpc('check_user_has_permission', {
          perm_code: code,
        });
        
        if (!cancelled) {
          setAllowed(error ? false : !!data);
        }
      } catch (err) {
        if (!cancelled) setAllowed(false);
      }
    };

    // 1. الفحص الأولي
    checkPermission();

    // 2. الاستماع لأي تغيير في الصلاحيات (لتحديث الواجهة فوراً)
    const uniqueChannelName = `perm_${code}_${Math.random().toString(36).substring(7)}`;
    
    channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'role_permissions' },
        () => checkPermission()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_entity_roles' },
        () => checkPermission()
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [code, entityId]);

  return { allowed: allowed === true, loading: allowed === null };
}