import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { ActiveEntityContext, RoleCode } from '../types/app.types';

// ================================================
// Types
// ================================================

export interface UserEntity {
  id: string;
  entityId: string;
  entityName: string;
  entityCode: string | null;
  entityTypeCode: string;
  entityTypeName: string;
  entityIcon: string | null;
  regionId: string | null;
  roleCode: RoleCode;
  roleName: string;
  isPrimary: boolean;
}

interface EntityState {
  entities: UserEntity[];
  activeEntity: ActiveEntityContext | null;
  loading: boolean;
  initialized: boolean;

  loadUserEntities: (userId: string) => Promise<void>;
  setActiveEntity: (entity: UserEntity) => void;
  switchEntity: (entityId: string) => void;
  restoreActiveEntity: () => void;
  clearEntities: () => void;
}

// ================================================
// Store
// ================================================

export const useEntityStore = create<EntityState>((set, get) => ({
  entities: [],
  activeEntity: null,
  loading: false,
  initialized: false,

  loadUserEntities: async (userId) => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('user_entity_roles')
        .select(
          `
          id,
          entity_id,
          is_primary,
          entity:entities!inner (
            id,
            name_ar,
            code,
            region_id,
            is_active,
            entity_type:entity_types!inner (
              code,
              name_ar,
              icon
            )
          ),
          role:roles!inner (
            code,
            name_ar
          )
        `
        )
        .eq('user_id', userId)
        .is('ended_at', null)
        .eq('entity.is_active', true);

      if (error) {
        console.error('Error loading entities:', error);
        throw error;
      }

      const entities: UserEntity[] = (data || []).map((item: any) => ({
        id: item.id,
        entityId: item.entity.id,
        entityName: item.entity.name_ar,
        entityCode: item.entity.code,
        entityTypeCode: item.entity.entity_type.code,
        entityTypeName: item.entity.entity_type.name_ar,
        entityIcon: item.entity.entity_type.icon,
        regionId: item.entity.region_id,
        roleCode: item.role.code as RoleCode,
        roleName: item.role.name_ar,
        isPrimary: item.is_primary,
      }));

      set({
        entities,
        loading: false,
        initialized: true,
      });

      // 🔑 استرجاع الكيان النشط من localStorage
      const savedEntityId = localStorage.getItem('active_entity_id');
      if (savedEntityId) {
        const savedEntity = entities.find((e) => e.entityId === savedEntityId);
        if (savedEntity) {
          get().setActiveEntity(savedEntity);
          console.log('✅ Restored active entity:', savedEntity.entityName);
          return;
        }
      }

      // إذا كان هناك كيان واحد فقط → اجعله نشطاً تلقائياً
      if (entities.length === 1) {
        get().setActiveEntity(entities[0]);
        console.log('✅ Auto-selected single entity:', entities[0].entityName);
      }
    } catch (err) {
      console.error('loadUserEntities error:', err);
      set({ loading: false, initialized: true });
    }
  },

  setActiveEntity: (entity: UserEntity) => {
    const activeEntity: ActiveEntityContext = {
      entityId: entity.entityId,
      entityName: entity.entityName,
      entityType: entity.entityTypeCode,
      roleCode: entity.roleCode,
      roleName: entity.roleName,
      isPrimary: entity.isPrimary,
    };

    set({ activeEntity });

    // 🔑 حفظ في localStorage
    localStorage.setItem('active_entity_id', entity.entityId);
    localStorage.setItem('active_entity_context', JSON.stringify(activeEntity));

    console.log('✅ Active entity set:', entity.entityName);
  },

  switchEntity: (entityId: string) => {
    const { entities } = get();
    const entity = entities.find((e) => e.entityId === entityId);
    if (entity) {
      get().setActiveEntity(entity);
    }
  },

  restoreActiveEntity: () => {
    const savedContext = localStorage.getItem('active_entity_context');
    if (savedContext) {
      try {
        const activeEntity = JSON.parse(savedContext) as ActiveEntityContext;
        set({ activeEntity });
        console.log('✅ Restored active entity context');
      } catch (err) {
        console.error('restoreActiveEntity error:', err);
      }
    }
  },

  clearEntities: () => {
    localStorage.removeItem('active_entity_id');
    localStorage.removeItem('active_entity_context');
    set({
      entities: [],
      activeEntity: null,
      initialized: false,
    });
  },
}));