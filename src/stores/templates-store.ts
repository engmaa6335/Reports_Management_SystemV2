import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  TemplateCategory,
  FormTemplate,
  FormField,
} from '../types/database.types';

// ================================================
// Types
// ================================================

interface TemplatesState {
  categories: TemplateCategory[];
  templates: FormTemplate[];
  selectedTemplate: FormTemplate | null;
  fields: FormField[];
  loading: boolean;
  error: string | null;

  loadCategories: () => Promise<void>;
  loadAvailableTemplates: (roleCode: string) => Promise<void>;
  selectTemplate: (templateId: string) => Promise<void>;
  clearSelection: () => void;
  reset: () => void;
}

// ================================================
// Store
// ================================================

export const useTemplatesStore = create<TemplatesState>((set) => ({
  categories: [],
  templates: [],
  selectedTemplate: null,
  fields: [],
  loading: false,
  error: null,

  // ================================================
  // Load Categories
  // ================================================
  loadCategories: async () => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('template_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;

      set({
        categories: (data || []) as TemplateCategory[],
        loading: false,
      });
    } catch (err) {
      console.error('loadCategories error:', err);
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'خطأ',
      });
    }
  },

  // ================================================
  // Load Available Templates (with role-based filtering)
  // ================================================
  loadAvailableTemplates: async (roleCode) => {
    try {
      set({ loading: true, error: null, templates: [] });

      console.log('🔍 [templates-store] Loading for role:', roleCode);

      // 🔑 الأدوار الإدارية — ترى كل القوالب
      const canViewAllTemplates = ['tech_support', 'edc_viewer'].includes(
        roleCode
      );

      let templateIds: string[] = [];

      // 1. إذا لم يكن admin → جلب القوالب المرتبطة بدوره
      if (!canViewAllTemplates) {
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('code', roleCode)
          .single();

        if (roleError || !roleData) {
          throw new Error('الدور غير موجود');
        }

        const { data: templateRoles, error: trError } = await supabase
          .from('template_creator_roles')
          .select('template_id')
          .eq('role_id', roleData.id);

        if (trError) throw trError;

        templateIds = (templateRoles || []).map((tr) => tr.template_id);

        console.log(
          '🔍 [templates-store] template IDs for role:',
          templateIds
        );

        // لا توجد قوالب لهذا الدور
        if (templateIds.length === 0) {
          console.log('❌ [templates-store] No templates for this role');
          set({ templates: [], loading: false });
          return;
        }
      } else {
        console.log(
          '🔑 [templates-store] Admin role — loading ALL templates'
        );
      }

      // 2. جلب القوالب (مع entity_type للفلترة الدقيقة)
      let query = supabase
        .from('form_templates')
        .select(`
          *,
          category:template_categories ( id, code, name_ar, name_en, icon, color, order_index ),
          entity_type:entity_types ( id, code, name_ar )
        `) // ⭐ تمت إضافة entity_type
        .eq('is_active', true)
        .eq('report_kind', 'visit')
        .order('created_at', { ascending: true });

      if (!canViewAllTemplates) {
        query = query.in('id', templateIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log(
        '✅ [templates-store] Loaded templates:',
        data?.length || 0
      );
      console.log(
        '✅ [templates-store] Template names:',
        (data || []).map((t: any) => t.name_ar)
      );

      set({
        templates: (data || []) as FormTemplate[],
        loading: false,
      });
    } catch (err) {
      console.error(
        '❌ [templates-store] loadAvailableTemplates error:',
        err
      );
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'خطأ',
        templates: [],
      });
    }
  },

  // ================================================
  // Select Template (load its fields)
  // ================================================
  selectTemplate: async (templateId) => {
    try {
      set({ loading: true, error: null });

      const { data: template, error: templateError } = await supabase
        .from('form_templates')
        .select(`
          *,
          category:template_categories ( id, code, name_ar, name_en, icon, color, order_index ),
          entity_type:entity_types ( id, code, name_ar )
        `) // ⭐ تمت إضافة entity_type
        .eq('id', templateId)
        .single();

      if (templateError || !template) {
        throw new Error('القالب غير موجود');
      }

      if (!template.current_version_id) {
        throw new Error('القالب لا يحتوي على نسخة صالحة');
      }

      const { data: fields, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('version_id', template.current_version_id)
        .order('order_index', { ascending: true });

      if (fieldsError) {
        console.error('Error loading fields:', fieldsError);
      }

      set({
        selectedTemplate: template as FormTemplate,
        fields: (fields || []) as FormField[],
        loading: false,
      });
    } catch (err) {
      console.error('selectTemplate error:', err);
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'خطأ',
      });
    }
  },

  // ================================================
  // Clear Selection
  // ================================================
  clearSelection: () => {
    set({
      selectedTemplate: null,
      fields: [],
      error: null,
    });
  },

  // ================================================
  // Reset
  // ================================================
  reset: () => {
    set({
      categories: [],
      templates: [],
      selectedTemplate: null,
      fields: [],
      loading: false,
      error: null,
    });
  },
}));