import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { RoleCode } from '../types/app.types';

// ================================================
// Types
// ================================================

export interface ActiveEntity {
  entityId: string;
  entityName: string;
  entityTypeCode: string;
  roleCode: RoleCode;
  roleId: string;
  assignmentId: string;
  regionMode?: 'rl' | 'tls' | null;
}

interface EntityState {
  activeEntity: ActiveEntity | null;
  availableEntities: ActiveEntity[];
  initialized: boolean;

  loadUserEntities: (userId: string) => Promise<void>;
  setActiveEntity: (entity: ActiveEntity) => void;
  clearEntities: () => void;
}

// ================================================
// Store
// ================================================

export const useEntityStore = create<EntityState>()(
  persist(
    (set, get) => ({
      activeEntity: null,
      availableEntities: [],
      initialized: false,

      loadUserEntities: async (userId: string) => {
        try {
          // 1. جلب الإسنادات النشطة
          const { data: assignments, error } = await supabase
            .from('user_entity_roles')
            .select(`
              id,
              role_id,
              entity_id,
              region_mode,
              roles ( code ),
              entities (
                id, name_ar, name_en, entity_type_id,
                entity_types ( code, name_ar )
              )
            `)
            .eq('user_id', userId)
            .is('ended_at', null);

          if (error) throw error;

          // 2. تحويل إلى ActiveEntity
          const availableEntities: ActiveEntity[] = (assignments || [])
            .map((ua: any) => {
              if (!ua.entities) return null;

              return {
                entityId: ua.entity_id,
                entityName: ua.entities.name_ar,
                entityTypeCode: ua.entities.entity_types?.code || '',
                roleCode: ua.roles?.code as RoleCode,
                roleId: ua.role_id,
                assignmentId: ua.id,
                regionMode: ua.region_mode || null,
              };
            })
            .filter(Boolean) as ActiveEntity[];

          set({ availableEntities, initialized: true });

          // 3. تعيين activeEntity تلقائياً
          const current = get().activeEntity;
          const stillValid = current
            ? availableEntities.find(
                (e) => e.assignmentId === current.assignmentId
              )
            : null;

          if (stillValid) {
            set({ activeEntity: stillValid });
          } else if (availableEntities.length > 0) {
            set({ activeEntity: availableEntities[0] });
          } else {
            set({ activeEntity: null });
          }
        } catch (err) {
          console.error('loadUserEntities error:', err);
          set({ availableEntities: [], activeEntity: null, initialized: true });
        }
      },

      setActiveEntity: (entity: ActiveEntity) => {
        set({ activeEntity: entity });
      },

      clearEntities: () => {
        set({
          activeEntity: null,
          availableEntities: [],
          initialized: false,
        });
      },
    }),
    {
      name: 'entity-store',
      partialize: (state) => ({
        activeEntity: state.activeEntity,
      }),
    }
  )
);