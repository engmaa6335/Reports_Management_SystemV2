import { create } from 'zustand';
import {
  listUsers,
  getUserById,
  toggleUserActive,
  endRoleAssignment,
  addRoleAssignment,
  listRoles,
  listEntities,
  updateUserProfile,
  getUserActivity,
} from '../lib/users-api';
import type {
  UserWithRoles,
  Role,
  Entity,
  UsersFilters,
  UserActivity,
} from '../types/users';

// ================================================
// Store
// ================================================

interface UsersState {
  // ⭐ كل المستخدمين (بدون فلتر) — للإحصائيات
  allUsers: UserWithRoles[];

  // المفلترة
  users: UserWithRoles[];
  selectedUser: UserWithRoles | null;
  roles: Role[];
  entities: Entity[];
  activity: UserActivity[];

  filters: UsersFilters;

  loading: boolean;
  loadingUser: boolean;
  loadingActivity: boolean;
  saving: boolean;
  error: string | null;

  loadUsers: (filters?: Partial<UsersFilters>) => Promise<void>;
  refreshAll: () => Promise<void>;
  loadUserById: (id: string) => Promise<void>;
  loadRoles: () => Promise<void>;
  loadEntities: () => Promise<void>;
  loadActivity: (userId: string) => Promise<void>;

  setFilters: (filters: Partial<UsersFilters>) => void;
  clearFilters: () => void;

  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  updateProfile: (
    userId: string,
    data: { full_name?: string; phone?: string | null }
  ) => Promise<void>;
  endRole: (assignmentId: string, userId: string) => Promise<void>;
  addRole: (
    userId: string,
    roleId: string,
    entityId: string,
    isPrimary?: boolean
  ) => Promise<void>;

  clearSelectedUser: () => void;
  clearError: () => void;
}

const initialFilters: UsersFilters = {
  search: '',
  roleCode: null,
  roleGroup: null,
  regionId: null,
  entityId: null,
  isActive: null,
};

// ⭐ فلترة محلية
function applyFilters(
  all: UserWithRoles[],
  filters: UsersFilters
): UserWithRoles[] {
  let result = all;

  // 1. Search
  if (filters.search && filters.search.trim()) {
    const s = filters.search.toLowerCase().trim();
    result = result.filter(
      (u) =>
        (u.full_name && u.full_name.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.username && u.username.toLowerCase().includes(s))
    );
  }

  // 2. Role group (تبويبات) — كل دور مستقل
  if (filters.roleGroup) {
    result = result.filter((u) =>
      u.roles.some((r) => r.role_code === filters.roleGroup)
    );
  }

  // 3. Role code (فلتر متقدم)
  if (filters.roleCode) {
    result = result.filter((u) =>
      u.roles.some((r) => r.role_code === filters.roleCode)
    );
  }

  // 4. Status
  if (filters.isActive !== null) {
    result = result.filter((u) => u.is_active === filters.isActive);
  }

  return result;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  allUsers: [],
  users: [],
  selectedUser: null,
  roles: [],
  entities: [],
  activity: [],
  filters: initialFilters,
  loading: false,
  loadingUser: false,
  loadingActivity: false,
  saving: false,
  error: null,

  // ================================================
  // Load Users
  // ================================================
  loadUsers: async (newFilters) => {
    const filters = { ...get().filters, ...(newFilters || {}) };
    set({ loading: true, error: null, filters });

    try {
      const allUsers = await listUsers({
        search: '',
        roleCode: null,
        roleGroup: null,
        regionId: null,
        entityId: null,
        isActive: null,
      });

      const filtered = applyFilters(allUsers, filters);

      set({
        allUsers,
        users: filtered,
        loading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل المستخدمين';
      set({ error: msg, loading: false, users: [], allUsers: [] });
      console.error('loadUsers error:', err);
    }
  },

  refreshAll: async () => {
    const filters = get().filters;
    await get().loadUsers(filters);
  },

  // ================================================
  // Load Single User
  // ================================================
  loadUserById: async (id) => {
    set({ loadingUser: true, error: null });
    try {
      const user = await getUserById(id);
      set({ selectedUser: user, loadingUser: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل المستخدم';
      set({ error: msg, loadingUser: false });
      console.error('loadUserById error:', err);
    }
  },

  // ================================================
  // Load Activity
  // ================================================
  loadActivity: async (userId) => {
    set({ loadingActivity: true });
    try {
      const activity = await getUserActivity(userId);
      set({ activity, loadingActivity: false });
    } catch (err) {
      console.error('loadActivity error:', err);
      set({ loadingActivity: false });
    }
  },

  // ================================================
  // Load Lookups
  // ================================================
  loadRoles: async () => {
    try {
      const roles = await listRoles();
      set({ roles });
    } catch (err) {
      console.error('loadRoles error:', err);
    }
  },

  loadEntities: async () => {
    try {
      const entities = await listEntities();
      set({ entities });
    } catch (err) {
      console.error('loadEntities error:', err);
    }
  },

  // ================================================
  // Filters
  // ================================================
  setFilters: (partial) => {
    const filters = { ...get().filters, ...partial };
    set({ filters });

    const filtered = applyFilters(get().allUsers, filters);
    set({ users: filtered });
  },

  clearFilters: () => {
    set({ filters: initialFilters });
    set({ users: get().allUsers });
  },

  // ================================================
  // Toggle Active
  // ================================================
  toggleActive: async (id, isActive) => {
    set({ saving: true, error: null });
    try {
      await toggleUserActive(id, isActive);
      set((state) => ({
        users: state.users.map((u) =>
          u.id === id ? { ...u, is_active: isActive } : u
        ),
        allUsers: state.allUsers.map((u) =>
          u.id === id ? { ...u, is_active: isActive } : u
        ),
        selectedUser:
          state.selectedUser?.id === id
            ? { ...state.selectedUser, is_active: isActive }
            : state.selectedUser,
        saving: false,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث الحالة';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  // ================================================
  // Update Profile
  // ================================================
  updateProfile: async (userId, data) => {
    set({ saving: true, error: null });
    try {
      await updateUserProfile(userId, data);
      await get().loadUserById(userId);
      await get().refreshAll();
      set({ saving: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل التحديث';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  // ================================================
  // End Role
  // ================================================
  endRole: async (assignmentId, userId) => {
    set({ saving: true, error: null });
    try {
      await endRoleAssignment(assignmentId);
      await get().loadUserById(userId);
      await get().refreshAll();
      await get().loadActivity(userId);
      set({ saving: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنهاء الدور';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  // ================================================
  // Add Role
  // ================================================
  addRole: async (userId, roleId, entityId, isPrimary = false) => {
    set({ saving: true, error: null });
    try {
      await addRoleAssignment(userId, roleId, entityId, isPrimary);
      await get().loadUserById(userId);
      await get().refreshAll();
      await get().loadActivity(userId);
      set({ saving: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إضافة الدور';
      set({ error: msg, saving: false });
      throw err;
    }
  },

  // ================================================
  // Clear
  // ================================================
  clearSelectedUser: () => set({ selectedUser: null, activity: [] }),
  clearError: () => set({ error: null }),
}));