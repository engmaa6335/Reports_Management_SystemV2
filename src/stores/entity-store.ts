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
  regionModes: ('rl' | 'tls')[];
}

interface RawAssignment {
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
  availableEntities: RawAssignment[];
  initialized: boolean;

  loadUserEntities: (userId: string) => Promise<void>;
  setActiveEntity: (entityId: string) => void;
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

          const rawAssignments: RawAssignment[] = (assignments || [])
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
            .filter(Boolean) as RawAssignment[];

          set({ availableEntities: rawAssignments, initialized: true });

          const current = get().activeEntity;
          let targetEntityId: string | null = null;

          if (current) {
            targetEntityId = current.entityId;
          } else if (rawAssignments.length > 0) {
            targetEntityId = rawAssignments[0].entityId;
          }

          if (targetEntityId) {
            const allForEntity = rawAssignments.filter(
              (a) => a.entityId === targetEntityId
            );
            if (allForEntity.length > 0) {
              const primary = allForEntity[0];
              const regionModes = Array.from(
                new Set(
                  allForEntity
                    .map((a) => a.regionMode)
                    .filter(Boolean) as ('rl' | 'tls')[]
                )
              );
              set({
                activeEntity: {
                  ...primary,
                  regionModes,
                },
              });
            } else {
              set({ activeEntity: null });
            }
          } else {
            set({ activeEntity: null });
          }
        } catch (err) {
          console.error('loadUserEntities error:', err);
          set({ availableEntities: [], activeEntity: null, initialized: true });
        }
      },

      setActiveEntity: (entityId: string) => {
        const allAssignments = get().availableEntities.filter(
          (a) => a.entityId === entityId
        );
        if (allAssignments.length === 0) return;

        const primary = allAssignments[0];
        const regionModes = Array.from(
          new Set(
            allAssignments
              .map((a) => a.regionMode)
              .filter(Boolean) as ('rl' | 'tls')[]
          )
        );

        set({
          activeEntity: {
            ...primary,
            regionModes,
          },
        });
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