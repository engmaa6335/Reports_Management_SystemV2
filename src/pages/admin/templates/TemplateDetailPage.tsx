import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Edit2,
  Settings,
  Users,
  BarChart3,
  Plus,
  RefreshCw,
  AlertCircle,
  Hash,
  FolderTree,
  Calendar,
  Shield,
  Eye,
} from 'lucide-react';
import { useTemplatesAdminStore } from '../../../stores/templates-admin-store';
import { Button, Card } from '../../../components/ui';
import { Loading } from '../../../components/ui/Loading';
import { FieldCard } from '../../../components/templates-admin/FieldCard';
import { DeleteFieldModal } from '../../../components/templates-admin/DeleteFieldModal';
import { TemplateFullPreview } from '../../../components/templates-admin/TemplateFullPreview';
import type { FormField } from '../../../types/templates-admin';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

type TabId = 'info' | 'fields' | 'stats';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    selectedTemplate: template,
    fields,
    loadingDetail,
    error,
    deleting,
    loadTemplateById,
    deleteField,
    clearSelectedTemplate,
    clearError,
  } = useTemplatesAdminStore();

  const [activeTab, setActiveTab] = useState<TabId>('fields');
  const [deleteTarget, setDeleteTarget] = useState<FormField | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ═══════════════════════════════════════════
  // Effects
  // ═══════════════════════════════════════════

  useEffect(() => {
    if (id) {
      loadTemplateById(id);
    }
    return () => {
      clearSelectedTemplate();
    };
  }, [id, loadTemplateById, clearSelectedTemplate]);

  // ═══════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════

  const handleBack = () => {
    navigate('/settings/templates');
  };

  const handleEditTemplate = () => {
    if (template) {
      navigate(`/settings/templates/${template.id}/edit`);
    }
  };

  const handleCreateField = () => {
    navigate(`/settings/templates/${id}/fields/new`);
  };

  const handleEditField = (field: FormField) => {
    navigate(`/settings/templates/${id}/fields/${field.id}/edit`);
  };

  const handleDeleteField = async () => {
    if (!deleteTarget) return;
    try {
      await deleteField(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete field error:', err);
    }
  };

  const handleRefresh = () => {
    if (id) loadTemplateById(id);
  };

  // ═══════════════════════════════════════════
  // Computed
  // ═══════════════════════════════════════════

  const fieldsBySection = useMemo(() => {
    const map = new Map<
      string,
      { title: string; icon: string; fields: FormField[] }
    >();

    fields.forEach((f) => {
      const opts = (f.options as any) || {};
      const section = opts.section || {};
      const key = section.key || '__default__';

      if (!map.has(key)) {
        map.set(key, {
          title: section.title || '📌 حقول عامة',
          icon: section.icon || '📌',
          fields: [],
        });
      }

      map.get(key)!.fields.push(f);
    });

    return Array.from(map.entries())
      .sort(([aKey], [bKey]) => {
        if (aKey === '__default__') return 1;
        if (bKey === '__default__') return -1;

        const aField = fields.find(
          (f) => ((f.options as any)?.section?.key || '__default__') === aKey
        );
        const bField = fields.find(
          (f) => ((f.options as any)?.section?.key || '__default__') === bKey
        );

        const aOrder = (aField?.options as any)?.section?.order ?? 9999;
        const bOrder = (bField?.options as any)?.section?.order ?? 9999;
        return aOrder - bOrder;
      })
      .map(([, value]) => value);
  }, [fields]);

  const tabs: Tab[] = [
    { id: 'info', label: 'معلومات', icon: <FileText className="w-4 h-4" /> },
    {
      id: 'fields',
      label: 'الحقول',
      icon: <Settings className="w-4 h-4" />,
      count: fields.length,
    },
    {
      id: 'stats',
      label: 'إحصائيات',
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  // ═══════════════════════════════════════════
  // Render — Loading
  // ═══════════════════════════════════════════

  if (loadingDetail) {
    return <Loading message="جاري تحميل القالب..." />;
  }

  // ═══════════════════════════════════════════
  // Render — Not Found
  // ═══════════════════════════════════════════

  if (!template) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-2xl font-bold text-text">القالب</h1>
        </div>

        <Card padding="lg">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-text mb-2">
              القالب غير موجود
            </h2>
            <Button
              variant="primary"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={handleBack}
            >
              العودة للقوالب
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const category = template.category;
  const color = category?.color || '#2563eb';
  const isActive = template.is_active ?? false;

  // ═══════════════════════════════════════════
  // Render — Main
  // ═══════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-bg-secondary transition-colors flex-shrink-0"
          >
            <ArrowRight className="w-5 h-5 text-text-secondary" />
          </button>

          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <FileText className="w-7 h-7" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-text truncate">
              {template.name_ar}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="text-xs font-mono text-text-muted"
                dir="ltr"
              >
                {template.code}
              </span>
              {category && (
                <span
                  className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  {category.icon && `${category.icon} `}
                  {category.name_ar}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                  isActive
                    ? 'bg-success/10 text-success'
                    : 'bg-danger/10 text-danger'
                }`}
              >
                {isActive ? '✅ نشط' : '⛔ معطّل'}
              </span>
              <span className="inline-block px-2 py-0.5 rounded-md text-xs font-mono bg-bg-secondary text-text-secondary">
                v{template.current_version?.version_number || '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Button
            variant="ghost"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
            disabled={loadingDetail}
          >
            <span className="hidden sm:inline">تحديث</span>
          </Button>
          <Button
            variant="secondary"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => setPreviewOpen(true)}
            disabled={fields.length === 0}
          >
            <span className="hidden sm:inline">معاينة التقرير</span>
            <span className="sm:hidden">معاينة</span>
          </Button>
          <Button
            variant="primary"
            icon={<Edit2 className="w-4 h-4" />}
            onClick={handleEditTemplate}
          >
            <span className="hidden sm:inline">تعديل القالب</span>
            <span className="sm:hidden">تعديل</span>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="text-danger text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button
              onClick={clearError}
              className="text-danger hover:underline text-xs"
            >
              إغلاق
            </button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-bg-secondary">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Tab: Info */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'info' && (
        <Card padding="lg">
          <h3 className="text-lg font-semibold text-text mb-4">
            📋 المعلومات الأساسية
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoRow
              icon={<FileText className="w-5 h-5" />}
              label="الاسم (عربي)"
              value={template.name_ar}
            />
            <InfoRow
              icon={<FileText className="w-5 h-5" />}
              label="الاسم (إنجليزي)"
              value={template.name_en || '—'}
            />
            <InfoRow
              icon={<Hash className="w-5 h-5" />}
              label="الكود"
              value={template.code}
              mono
            />
            <InfoRow
              icon={<FolderTree className="w-5 h-5" />}
              label="الفئة"
              value={category?.name_ar || '—'}
            />
            <InfoRow
              icon={<Shield className="w-5 h-5" />}
              label="الحالة"
              value={isActive ? 'نشط' : 'معطّل'}
              valueClass={isActive ? 'text-success' : 'text-danger'}
            />
            {template.description && (
              <div className="md:col-span-2">
                <InfoRow
                  icon={<FileText className="w-5 h-5" />}
                  label="الوصف"
                  value={template.description}
                />
              </div>
            )}
            <InfoRow
              icon={<Calendar className="w-5 h-5" />}
              label="تاريخ الإنشاء"
              value={
                template.created_at
                  ? new Date(template.created_at).toLocaleDateString(
                      'ar-EG'
                    )
                  : '—'
              }
            />
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Tab: Fields */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'fields' && (
        <div className="space-y-6">
          {/* Actions Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text">
                📝 حقول القالب ({fields.length})
              </h3>
              <p className="text-xs text-text-muted mt-1">
                الحقول مرتبة حسب الأقسام والترتيب
              </p>
            </div>
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleCreateField}
            >
              إضافة حقل
            </Button>
          </div>

          {/* Empty State */}
          {fields.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-text mb-2">
                  لا توجد حقول
                </h3>
                <p className="text-text-secondary text-sm mb-6">
                  ابدأ بإضافة حقل جديد للقالب
                </p>
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleCreateField}
                >
                  إضافة حقل
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {fieldsBySection.map((section, sIdx) => (
                <div key={sIdx}>
                  {/* Section Header */}
                  {fieldsBySection.length > 1 && (
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-sm font-bold text-text-secondary">
                        {section.icon} {section.title}
                      </h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted">
                        {section.fields.length}
                      </span>
                    </div>
                  )}

                  {/* Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {section.fields.map((field) => (
                      <FieldCard
                        key={field.id}
                        field={field}
                        onEdit={() => handleEditField(field)}
                        onDelete={() => setDeleteTarget(field)}
                        isDeleting={deleting}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Tab: Stats */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card padding="lg" className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning/10 text-warning mb-3">
              <Users className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold text-warning">
              {template.reports_count ?? 0}
            </div>
            <div className="text-sm text-text-muted mt-1">تقرير</div>
          </Card>

          <Card padding="lg" className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-3">
              <Settings className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {template.fields_count ?? 0}
            </div>
            <div className="text-sm text-text-muted mt-1">حقل</div>
          </Card>
        </div>
      )}

      {/* Delete Field Modal */}
      <DeleteFieldModal
        isOpen={!!deleteTarget}
        fieldName={deleteTarget?.label_ar || ''}
        isDeleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteField}
      />

      {/* ⭐ Template Full Preview Modal */}
      <TemplateFullPreview
        isOpen={previewOpen}
        templateName={template.name_ar}
        templateCode={template.code}
        fields={fields}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// InfoRow
// ═══════════════════════════════════════════════════════════

function InfoRow({
  icon,
  label,
  value,
  valueClass = '',
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-text-muted mt-1 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-text-muted">{label}</div>
        <div
          className={`text-text break-words ${valueClass} ${
            mono ? 'font-mono text-sm' : ''
          }`}
          dir={mono ? 'ltr' : undefined}
        >
          {value}
        </div>
      </div>
    </div>
  );
}