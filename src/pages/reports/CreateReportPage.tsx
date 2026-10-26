import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft, Save, X, FileText, Loader2, Lock } from 'lucide-react';
import { useTemplatesStore } from '../../stores/templates-store';
import { useReportsStore } from '../../stores/reports-store';
import { useAuthStore } from '../../stores/auth-store';
import { useEntityStore } from '../../stores/entity-store';
import { usePermission } from '../../hooks/usePermission';
import { Button, Card } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { DynamicField } from '../../components/reports/DynamicField';
import { FormSection } from '../../components/reports/FormSection';
import { supabase } from '../../lib/supabase';
import { pickLocalizedName } from '../../lib/i18n-helpers';

// ================================================
// Helpers
// ================================================

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function computeAutoValue(
  autoSource: string | undefined,
  context: {
    userName: string;
    userEmail: string;
    entityName: string;
    entityId: string;
  }
): string {
  switch (autoSource) {
    case 'user.full_name': return context.userName;
    case 'user.email': return context.userEmail;
    case 'entity.name': return context.entityName;
    case 'entity.id': return context.entityId;
    case 'date.today': return getToday();
    case 'date.now': return new Date().toISOString();
    case 'selected_entity.manager_name': return '';
    default: return '';
  }
}

function isFullWidthField(field: any): boolean {
  if (['indicator_group', 'textarea'].includes(field.field_type)) {
    return true;
  }
  const opts = (field.options as any) || {};
  return opts.full_width === true;
}

interface SectionData {
  key: string;
  title: string;
  icon: string;
  description?: string;
  accentColor: 'primary' | 'success' | 'warning' | 'info';
  order: number;
  fields: any[];
}

function extractSections(fields: any[]): SectionData[] {
  const map = new Map<string, SectionData>();

  fields.forEach((field) => {
    const opts = (field.options as any) || {};
    const sectionOpts = opts.section || {};

    const key = sectionOpts.key || 'default';
    const accent = sectionOpts.accent_color || 'primary';

    if (!map.has(key)) {
      map.set(key, {
        key,
        title: sectionOpts.title || '📌 حقول إضافية',
        icon: sectionOpts.icon || '📌',
        description: sectionOpts.description,
        accentColor: ['primary', 'success', 'warning', 'info'].includes(accent) ? accent : 'primary',
        order: sectionOpts.order ?? 9999,
        fields: [],
      });
    }

    map.get(key)!.fields.push(field);
  });

  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

// ================================================
// Component
// ================================================

export function CreateReportPage() {
 const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { templateId: urlTemplateId } = useParams<{ templateId?: string }>();
  const { user } = useAuthStore();
  const { activeEntity } = useEntityStore();
  
  const { allowed: canCreate, loading: checkingCreate } = usePermission('reports.create');
  
  const {
    templates,
    selectedTemplate,
    fields,
    loading: templatesLoading,
    loadAvailableTemplates,
    selectTemplate,
    clearSelection,
  } = useTemplatesStore();
  const {
    createReport,
    saving: reportsLoading,
    error: reportsError,
  } = useReportsStore();

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'select' | 'fill'>('select');

  const [hasTlsCenters, setHasTlsCenters] = useState<boolean | null>(null);
  const [hasSchools, setHasSchools] = useState<boolean | null>(null);
  const [checkingEntities, setCheckingEntities] = useState(false);
  const [loadingManager, setLoadingManager] = useState(false);
  
  const prevCenterIdRef = useRef<string>('');
  const prevEntityIdRef = useRef<string>(activeEntity?.entityId || '');

  // ================================================
  // Effects
  // ================================================

  useEffect(() => {
    if (activeEntity?.roleCode) {
      loadAvailableTemplates(activeEntity.roleCode);
    }
  }, [activeEntity?.roleCode, activeEntity?.entityId, loadAvailableTemplates]);

  useEffect(() => {
    const currentEntityId = activeEntity?.entityId || '';

    if (!prevEntityIdRef.current) {
      prevEntityIdRef.current = currentEntityId;
      return;
    }

    if (prevEntityIdRef.current !== currentEntityId) {
      prevEntityIdRef.current = currentEntityId;
      clearSelection();
      setFormData({});
      setErrors({});
      setStep('select');
      prevCenterIdRef.current = '';
      setLoadingManager(false);
      navigate('/reports/new', { replace: true });
    }
  }, [activeEntity?.entityId, clearSelection, navigate]);

  useEffect(() => {
    if (!activeEntity?.entityId) {
      setHasTlsCenters(null);
      setHasSchools(null);
      return;
    }

    setHasTlsCenters(null);
    setHasSchools(null);
    setCheckingEntities(true);

    const checkEntities = async () => {
      try {
        const { data: types, error: typesError } = await supabase
          .from('entity_types')
          .select('id, code')
          .in('code', ['school', 'tls_center']);

        if (typesError || !types) {
          setHasTlsCenters(false);
          setHasSchools(false);
          setCheckingEntities(false);
          return;
        }

        const schoolTypeId = types.find((t) => t.code === 'school')?.id;
        const tlsTypeId = types.find((t) => t.code === 'tls_center')?.id;

        if (tlsTypeId) {
          const { count } = await supabase
            .from('entities')
            .select('id', { count: 'exact', head: true })
            .eq('parent_id', activeEntity.entityId)
            .eq('entity_type_id', tlsTypeId)
            .eq('is_active', true);
          setHasTlsCenters((count || 0) > 0);
        } else {
          setHasTlsCenters(false);
        }

        if (schoolTypeId) {
          const { count } = await supabase
            .from('entities')
            .select('id', { count: 'exact', head: true })
            .eq('parent_id', activeEntity.entityId)
            .eq('entity_type_id', schoolTypeId)
            .eq('is_active', true);
          setHasSchools((count || 0) > 0);
        } else {
          setHasSchools(false);
        }
      } catch {
        setHasTlsCenters(false);
        setHasSchools(false);
      } finally {
        setCheckingEntities(false);
      }
    };

    checkEntities();
  }, [activeEntity?.entityId, activeEntity?.entityName]);

  useEffect(() => {
    if (templatesLoading) return;

    if (urlTemplateId) {
      const isTemplateValid = templates.some((t) => t.id === urlTemplateId);
      
      if (!isTemplateValid) {
        clearSelection();
        setFormData({});
        setStep('select');
        navigate('/reports/new', { replace: true });
        return;
      }

      if (!selectedTemplate || selectedTemplate.id !== urlTemplateId) {
        selectTemplate(urlTemplateId);
      }
    } 
    else if (selectedTemplate) {
      const isTemplateValid = templates.some((t) => t.id === selectedTemplate.id);
      if (!isTemplateValid) {
        clearSelection();
        setStep('select');
      }
    }
  }, [urlTemplateId, templates, selectedTemplate, templatesLoading, selectTemplate, clearSelection, navigate]);

  useEffect(() => {
    if (selectedTemplate && step === 'select') {
      setStep('fill');
    }
  }, [selectedTemplate, step]);

  useEffect(() => {
    if (!selectedTemplate || fields.length === 0 || !user || !activeEntity) {
      return;
    }

    const context = {
      userName: user.fullName || '',
      userEmail: user.email || '',
      entityName: activeEntity.entityName || '',
      entityId: activeEntity.entityId || '',
    };

    const autoValues: Record<string, unknown> = {};

    fields.forEach((field) => {
      if (field.field_type === 'auto_filled') {
        const opts = (field.options as any) || {};
        const autoSource = opts.auto_source;

        if (autoSource === 'selected_entity.manager_name') return;

        if (formData[field.field_key] === undefined) {
          autoValues[field.field_key] = computeAutoValue(autoSource, context);
        }
      }
    });

    if (Object.keys(autoValues).length > 0) {
      setFormData((prev) => ({ ...autoValues, ...prev }));
    }
  }, [selectedTemplate, fields, user, activeEntity]);

  useEffect(() => {
    if (!selectedTemplate || fields.length === 0) return;

    const autoFields = fields.filter(
      (f) =>
        f.field_type === 'auto_filled' &&
        ((f.options as any) || {}).auto_source === 'selected_entity.manager_name'
    );
    if (autoFields.length === 0) return;

    const centerSelectField = fields.find(
      (f) => f.field_type === 'center_select' || f.field_type === 'school_select'
    );
    if (!centerSelectField) return;

    const centerId = formData[centerSelectField.field_key] as string;

    if (centerId === prevCenterIdRef.current) return;
    prevCenterIdRef.current = centerId || '';

    if (!centerId) {
      setFormData((prev) => {
        const next = { ...prev };
        autoFields.forEach((f) => {
          next[f.field_key] = '';
        });
        return next;
      });
      setLoadingManager(false);
      return;
    }

    const fetchSelectedEntity = async () => {
      setLoadingManager(true);
      try {
        const { data, error } = await supabase
          .from('entities')
          .select('contact_info, name_en, name_ar')
          .eq('id', centerId)
          .single();

        if (error) {
          setLoadingManager(false);
          return;
        }

        const contactInfo = (data?.contact_info as any) || {};

        setFormData((prev) => {
          const next = { ...prev };
          autoFields.forEach((f) => {
            next[f.field_key] = contactInfo.manager_name || '';
          });
          return next;
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingManager(false);
      }
    };

    fetchSelectedEntity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData[
      fields.find(
        (f) => f.field_type === 'center_select' || f.field_type === 'school_select'
      )?.field_key || ''
    ],
    selectedTemplate?.id,
  ]);

  const orderedFields = useMemo(() => {
    return [...fields].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [fields]);

  const sections = useMemo(() => {
    return extractSections(orderedFields);
  }, [orderedFields]);

  const visibleTemplates = useMemo(() => {
    const regionModes = activeEntity?.regionModes ?? [];

    return templates.filter((template) => {
      const anyTemplate = template as any;
      const catCode = String(anyTemplate.category?.code || '').toLowerCase();
      const templateCode = String(template.code || '').toLowerCase();

      const isRlTemplate =
        catCode === 'rl' ||
        templateCode.includes('.rl') ||
        templateCode.startsWith('rl_');
      const isTlsTemplate =
        catCode === 'tls' ||
        templateCode.includes('.tls') ||
        templateCode.startsWith('tls_');
      const isGeneric = !isRlTemplate && !isTlsTemplate;

      if (regionModes.length === 0) return true;

      if (isRlTemplate && regionModes.includes('rl')) return true;
      if (isTlsTemplate && regionModes.includes('tls')) return true;

      return isGeneric;
    });
  }, [templates, activeEntity?.regionModes]);

  const handleTemplateSelect = (templateId: string) => {
    if (!canCreate) return;
    selectTemplate(templateId);
    navigate(`/reports/new/${templateId}`, { replace: true });
  };

  const handleFieldChange = (fieldKey: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));
    if (errors[fieldKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const validation = field.validation_rules as { required?: boolean };
      if (validation?.required) {
        const value = formData[field.field_key];
        if (value === undefined || value === null || value === '') {
          newErrors[field.field_key] = t('report_form.required_field');
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !activeEntity || !user || !canCreate) return;

    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!selectedTemplate.current_version_id) {
      setErrors({ _period: t('report_form.template_no_version') });
      return;
    }

    try {
      const centerSelectField = fields.find(
        (f) => f.field_type === 'center_select' || f.field_type === 'school_select'
      );
      
      const selectedSchoolOrCenterId = centerSelectField 
        ? (formData[centerSelectField.field_key] as string) 
        : activeEntity.entityId;

      // ⭐ الحل الوحيد: نمرر المركز كـ entityId، والمنطقة كـ regionId
      // هذا يحل مشكلة عرض اسم المركز، ويعمل مع سياسة الأمان الحالية (لأننا نمرر المنطقة)
      const targetEntityId = selectedSchoolOrCenterId || activeEntity.entityId;
      const correctRegionId = activeEntity.entityId;

      const reportId = await createReport({
        templateId: selectedTemplate.id,
        templateVersionId: selectedTemplate.current_version_id,
        entityId: targetEntityId,
        regionId: correctRegionId,
        data: formData,
        periodType: null,
        periodStart: null,
        periodEnd: null,
      });

      navigate(`/reports/${reportId}`, { replace: true });
    } catch (err) {
      console.error('❌ Submit error:', err);
    }
  };

  const handleCancel = () => {
    clearSelection();
    navigate('/reports');
  };

  const handleBack = () => {
    clearSelection();
    setFormData({});
    setErrors({});
    setStep('select');
    prevCenterIdRef.current = '';
    navigate('/reports/new');
  };

  // ================================================
  // Render Guards
  // ================================================

  if (checkingCreate) {
    return <Loading message="جاري التحقق من الصلاحيات..." />;
  }

  if (!canCreate) {
    return (
      <div className="p-6 text-center text-danger">
        <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">لا تملك صلاحية الوصول</h2>
        <p>ليس لديك صلاحية لإنشاء تقرير جديد.</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => navigate('/reports')}
        >
          العودة للتقارير
        </Button>
      </div>
    );
  }

  if (templatesLoading || checkingEntities) {
    return <Loading message={t('report_form.loading')} />;
  }

  const isTemplateAllowed = selectedTemplate 
    ? visibleTemplates.some(t => t.id === selectedTemplate.id)
    : false;

  if (step === 'select' || !selectedTemplate || !isTemplateAllowed) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">
               {pickLocalizedName(selectedTemplate, i18n.language)}
            </h1>
            <p className="text-text-secondary mt-1">
              {t('report_form.create_subtitle')}
            </p>
          </div>
          <Button
            variant="ghost"
            icon={<X className="w-4 h-4" />}
            onClick={handleCancel}
          >
            {t('report_form.cancel')}
          </Button>
        </div>

        {visibleTemplates.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-xl font-bold text-text mb-2">
                {t('report_form.no_templates')}
              </h2>
              <p className="text-text-secondary">
                {templates.length === 0
                  ? t('report_form.no_templates_desc')
                  : t('report_form.no_templates_region', {
                      entity: activeEntity?.entityName || '',
                    })}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTemplates.map((template) => {
              const category = (template as any).category as
                | { color?: string; name_ar?: string }
                | undefined;

              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className="text-right transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary rounded-xl"
                >
                  <Card
                    padding="lg"
                    className="h-full hover:shadow-hard transition-shadow"
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                      style={{
                        backgroundColor: `${category?.color || '#2563eb'}15`,
                        color: category?.color || '#2563eb',
                      }}
                    >
                      <FileText className="w-7 h-7" />
                    </div>

                    <h3 className="text-lg font-bold text-text mb-2">
                      {pickLocalizedName(template, i18n.language)}
                    </h3>

                    {template.description && (
                      <p className="text-sm text-text-secondary mb-4">
                        {i18n.language === 'en' && (template as any).description_en
                          ? (template as any).description_en
                          : template.description}
                      </p>
                    )}

                    {category && (
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="inline-block px-2 py-1 rounded-md font-medium"
                          style={{
                            backgroundColor: `${category.color}15`,
                            color: category.color,
                          }}
                        >
                          {category.name_ar}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 text-primary font-medium text-sm mt-4">
                      <span>{t('report_form.choose')}</span>
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const renderField = (field: any) => {
    const fullWidth = isFullWidthField(field);
    const isManagerField =
      field.field_type === 'auto_filled' &&
      ((field.options as any) || {}).auto_source === 'selected_entity.manager_name';

    return (
      <div key={field.id} className={fullWidth ? 'md:col-span-2' : ''}>
        {isManagerField && loadingManager && (
          <div className="mb-1 flex items-center gap-1.5 text-xs text-text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t('report_form.fetching_manager')}</span>
          </div>
        )}
        <DynamicField
          field={field}
          value={formData[field.field_key]}
          onChange={(newValue: unknown) => {
            handleFieldChange(field.field_key, newValue);
          }}
          error={errors[field.field_key]}
          templateCode={selectedTemplate?.code}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              {selectedTemplate.name_ar}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {t('report_form.edit_subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            {t('report_form.cancel')}
          </Button>
          <Button
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSubmit}
            disabled={reportsLoading || !canCreate}
            loading={reportsLoading}
          >
            {t('report_form.create_report')}
          </Button>
        </div>
      </div>

      {activeEntity && (
        <Card padding="md" className="bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-lg">🗺️</span>
            <span className="text-text-secondary">
              {t('report_form.region_label')}
            </span>
            <span className="font-semibold text-primary">
              {activeEntity.entityName}
            </span>
            {activeEntity.regionModes.includes('rl') && (
              <span className="text-xs px-2 py-1 rounded-md font-bold bg-blue-100 text-blue-700">
                R.L
              </span>
            )}
            {activeEntity.regionModes.includes('tls') && (
              <span className="text-xs px-2 py-1 rounded-md font-bold bg-green-100 text-green-700">
                TLS
              </span>
            )}
          </div>
        </Card>
      )}

      {reportsError && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <span>{reportsError}</span>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <FormSection
            key={section.key}
            title={section.title}
            icon={section.icon}
            description={section.description}
            accentColor={section.accentColor}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {section.fields.map(renderField)}
            </div>
          </FormSection>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={handleCancel}>
          {t('report_form.cancel')}
        </Button>
        <Button
          variant="primary"
          size="lg"
          icon={<Save className="w-5 h-5" />}
          onClick={handleSubmit}
          disabled={reportsLoading || !canCreate}
          loading={reportsLoading}
        >
          {t('report_form.create_report')}
        </Button>
      </div>
    </div>
  );
}

export default CreateReportPage;