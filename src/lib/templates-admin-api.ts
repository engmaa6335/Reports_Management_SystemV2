import { supabase } from './supabase';
import type {
  TemplateCategory,
  TemplateWithRelations,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  TemplateFilters,
  FormField,
  CreateFieldPayload,
  UpdateFieldPayload,
  RoleOption,
  EntityTypeOption,
  DeleteTemplateCheck,
} from '../types/templates-admin';

// ================================================
// Categories
// ================================================

export async function listCategories(): Promise<TemplateCategory[]> {
  const { data, error } = await supabase
    .from('template_categories')
    .select('*')
    .eq('is_active', true)
    .order('order_index');

  if (error) throw error;
  return (data || []) as TemplateCategory[];
}

// ================================================
// Templates — List
// ================================================

export async function listTemplates(
  filters: TemplateFilters
): Promise<TemplateWithRelations[]> {
  let query = supabase
    .from('form_templates')
    .select(`
      *,
      category:template_categories ( id, code, name_ar, icon, color ),
      current_version:form_template_versions!fk_templates_current_version ( id, version_number )
    `)
    .order('created_at', { ascending: false });

  if (filters.search) {
    query = query.or(
      `name_ar.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,code.ilike.%${filters.search}%`
    );
  }

  if (filters.isActive !== null) {
    query = query.eq('is_active', filters.isActive);
  }

  const { data, error } = await query;
  if (error) throw error;

  let templates = (data || []).map((row: any) => ({
    ...row,
    category: row.category || null,
    current_version: row.current_version || null,
  })) as TemplateWithRelations[];

  // فلترة محلية حسب category_code
  if (filters.categoryCode) {
    templates = templates.filter(
      (t) => t.category?.code === filters.categoryCode
    );
  }

  return templates;
}

// ================================================
// Templates — Single
// ================================================

export async function getTemplateById(
  id: string
): Promise<TemplateWithRelations | null> {
  const { data, error } = await supabase
    .from('form_templates')
    .select(`
      *,
      category:template_categories ( id, code, name_ar, icon, color ),
      current_version:form_template_versions!fk_templates_current_version ( id, version_number )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as any;

  // إحصائيات
  const [fieldsRes, reportsRes] = await Promise.all([
    supabase
      .from('form_fields')
      .select('id', { count: 'exact', head: true })
      .eq('version_id', row.current_version_id),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', id)
      .eq('is_deleted', false),
  ]);

  return {
    ...row,
    category: row.category || null,
    current_version: row.current_version || null,
    fields_count: fieldsRes.count || 0,
    reports_count: reportsRes.count || 0,
  } as TemplateWithRelations;
}

// ================================================
// Templates — Create
// ================================================

export async function createTemplate(
  payload: CreateTemplatePayload
): Promise<{ id: string }> {
  // 1. تحقق من الكود
  const { count } = await supabase
    .from('form_templates')
    .select('id', { count: 'exact', head: true })
    .eq('code', payload.code.trim());

  if (count && count > 0) {
    throw new Error(`الكود "${payload.code}" مستخدم بالفعل`);
  }

  // 2. إنشاء القالب
  const { data, error } = await supabase
    .from('form_templates')
    .insert({
      code: payload.code.trim(),
      name_ar: payload.name_ar.trim(),
      name_en: payload.name_en?.trim() || null,
      description: payload.description?.trim() || null,
      category_id: payload.category_id,
      entity_type_id: payload.entity_type_id,
      creator_role_id: payload.creator_role_id,
      report_kind: payload.report_kind,
      is_active: payload.is_active,
      is_locked: false,
    })
    .select('id')
    .single();

  if (error) throw error;

  // 3. إنشاء نسخة أولى فارغة
  const { data: version, error: versionError } = await supabase
    .from('form_template_versions')
    .insert({
      template_id: data.id,
      version_number: 1,
      schema_snapshot: {},
      change_log: 'النسخة الأولى',
    })
    .select('id')
    .single();

  if (versionError) {
    // Rollback: احذف القالب
    await supabase.from('form_templates').delete().eq('id', data.id);
    throw versionError;
  }

  // 4. اربط النسخة بالقالب
  const { error: updateError } = await supabase
    .from('form_templates')
    .update({ current_version_id: version.id })
    .eq('id', data.id);

  if (updateError) throw updateError;

  return { id: data.id };
}

// ================================================
// Templates — Update
// ================================================

export async function updateTemplate(
  id: string,
  payload: UpdateTemplatePayload
): Promise<void> {
  const updates: Record<string, unknown> = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.name_ar === 'string') {
    updates.name_ar = updates.name_ar.trim();
  }
  if (typeof updates.name_en === 'string') {
    updates.name_en = updates.name_en.trim() || null;
  }
  if (typeof updates.description === 'string') {
    updates.description = updates.description.trim() || null;
  }

  const { error } = await supabase
    .from('form_templates')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

// ================================================
// Templates — Delete Check
// ================================================

export async function canDeleteTemplate(
  id: string
): Promise<DeleteTemplateCheck> {
  const { count, error } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', id);

  if (error) throw error;

  const reportsCount = count || 0;

  return {
    canDelete: true,
    reportsCount,
    reason:
      reportsCount > 0
        ? `يوجد ${reportsCount} تقرير مرتبط بهذا القالب`
        : undefined,
  };
}

// ================================================
// Templates — Soft Delete
// ================================================

export async function softDeleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('form_templates')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

// ================================================
// Templates — Cascade Delete
// ================================================

export async function cascadeDeleteTemplate(id: string): Promise<void> {
  // احذف التقارير أولاً
  const { error: reportsError } = await supabase
    .from('reports')
    .delete()
    .eq('template_id', id);

  if (reportsError) throw reportsError;

  // احذف النسخ
  const { error: versionsError } = await supabase
    .from('form_template_versions')
    .delete()
    .eq('template_id', id);

  if (versionsError) throw versionsError;

  // احذف القالب
  const { error } = await supabase
    .from('form_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ================================================
// Fields — List
// ================================================

export async function listFields(versionId: string): Promise<FormField[]> {
  const { data, error } = await supabase
    .from('form_fields')
    .select('*')
    .eq('version_id', versionId)
    .order('order_index');

  if (error) throw error;
  return (data || []) as FormField[];
}

// ================================================
// Fields — Create
// ================================================

export async function createField(
  versionId: string,
  payload: CreateFieldPayload
): Promise<{ id: string }> {
  // تحقق من الكود
  const { count } = await supabase
    .from('form_fields')
    .select('id', { count: 'exact', head: true })
    .eq('version_id', versionId)
    .eq('field_key', payload.field_key.trim());

  if (count && count > 0) {
    throw new Error(`الحقل "${payload.field_key}" موجود بالفعل`);
  }

  const { data, error } = await supabase
    .from('form_fields')
    .insert({
      version_id: versionId,
      field_key: payload.field_key.trim(),
      field_type: payload.field_type,
      label_ar: payload.label_ar.trim(),
      label_en: payload.label_en?.trim() || null,
      placeholder: payload.placeholder?.trim() || null,
      help_text: payload.help_text?.trim() || null,
      validation_rules: payload.validation_rules,
      options: payload.options,
      order_index: payload.order_index,
      is_repeatable: false,
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id };
}

// ================================================
// Fields — Update
// ================================================

export async function updateField(
  id: string,
  payload: UpdateFieldPayload
): Promise<void> {
  const updates: Record<string, unknown> = { ...payload };

  if (typeof updates.label_ar === 'string') {
    updates.label_ar = updates.label_ar.trim();
  }
  if (typeof updates.label_en === 'string') {
    updates.label_en = updates.label_en.trim() || null;
  }
  if (typeof updates.placeholder === 'string') {
    updates.placeholder = updates.placeholder.trim() || null;
  }
  if (typeof updates.help_text === 'string') {
    updates.help_text = updates.help_text.trim() || null;
  }

  const { error } = await supabase
    .from('form_fields')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

// ================================================
// Fields — Delete
// ================================================

export async function deleteField(id: string): Promise<void> {
  const { error } = await supabase.from('form_fields').delete().eq('id', id);

  if (error) throw error;
}

// ================================================
// Fields — Reorder
// ================================================

export async function reorderFields(
  updates: Array<{ id: string; order_index: number }>
): Promise<void> {
  const promises = updates.map(({ id, order_index }) =>
    supabase.from('form_fields').update({ order_index }).eq('id', id)
  );

  await Promise.all(promises);
}

// ================================================
// Lookups
// ================================================

export async function listRolesForSelect(): Promise<RoleOption[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('id, code, name_ar')
    .eq('is_active', true)
    .order('hierarchy_level', { ascending: false });

  if (error) throw error;
  return (data || []) as RoleOption[];
}

export async function listEntityTypesForSelect(): Promise<EntityTypeOption[]> {
  const { data, error } = await supabase
    .from('entity_types')
    .select('id, code, name_ar, icon')
    .eq('is_active', true)
    .order('hierarchy_level');

  if (error) throw error;
  return (data || []) as EntityTypeOption[];
}