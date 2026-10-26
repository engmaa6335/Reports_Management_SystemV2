// ═══════════════════════════════════════════════════════════
// AggregateSummariesSettingsPage
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  FileText,
  BarChart3,
} from 'lucide-react';
import { useSummarySettingsStore } from '../../stores/summary-settings-store';
import { usePermission } from '../../hooks/usePermission';
import { Button, Card, Loading } from '../../components/ui';

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function AggregateSummariesSettingsPage() {
  const { t } = useTranslation();

  const { allowed: canManage, loading: checkingPerm } = usePermission(
    'aggregate_summaries.manage'
  );

  const {
    settings,
    loading,
    saving,
    initialized,
    error,
    loadSettings,
    updateSettings,
    resetToDefaults,
    clearError,
  } = useSummarySettingsStore();

  const [local, setLocal] = useState(settings);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load on mount
  useEffect(() => {
    if (canManage && !initialized) {
      loadSettings();
    }
  }, [canManage, initialized, loadSettings]);

  // Sync local with store
  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const handleChange = <K extends keyof typeof local>(
    key: K,
    value: (typeof local)[K]
  ) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setSuccessMsg(null);
  };

  const handleSave = async () => {
    try {
      await updateSettings(local);
      setSuccessMsg(t('aggregate_summaries.settings.save_success'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // error in store
    }
  };

  const handleReset = async () => {
    if (!confirm('هل تريد إعادة الإعدادات إلى القيم الافتراضية؟')) return;
    try {
      await resetToDefaults();
      setSuccessMsg(t('aggregate_summaries.settings.save_success'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // error in store
    }
  };

  const hasChanges = JSON.stringify(local) !== JSON.stringify(settings);

  // ─── Guards ───
  if (checkingPerm) return <Loading message={t('common.loading')} />;

  if (!canManage) {
    return (
      <Card padding="lg" className="text-center">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-text mb-2">
          {t('aggregate_summaries.settings.no_permission')}
        </h2>
      </Card>
    );
  }

  if (loading && !initialized) return <Loading message={t('common.loading')} />;

  // ─── Render ───
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          {t('aggregate_summaries.settings.title')}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t('aggregate_summaries.settings.subtitle')}
        </p>
      </div>

      {/* Success message */}
      {successMsg && (
        <Card padding="md" className="border-success bg-success/5">
          <div className="text-success text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {successMsg}
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card padding="md" className="border-danger bg-danger/5">
          <div className="flex items-center justify-between text-danger text-sm">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </span>
            <button onClick={clearError} className="text-xs underline">
              ×
            </button>
          </div>
        </Card>
      )}

      {/* General settings */}
      <Card padding="lg">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <SettingsIcon className="w-5 h-5 text-primary" />
          {t('aggregate_summaries.settings.general_section')}
        </h3>

        <div className="space-y-4">
          {/* Enabled */}
          <ToggleField
            label={t('aggregate_summaries.settings.enabled_label')}
            description={t('aggregate_summaries.settings.enabled_desc')}
            checked={local.enabled}
            onChange={(v) => handleChange('enabled', v)}
          />

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t('aggregate_summaries.settings.summary_provider_label')}
            </label>
            <select
              value={local.summary_provider}
              onChange={(e) => handleChange('summary_provider', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
            >
              <option value="local">
                {t('aggregate_summaries.settings.summary_provider_local')}
              </option>
            </select>
          </div>
        </div>
      </Card>

      {/* Algorithm settings */}
      <Card padding="lg">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <BarChart3 className="w-5 h-5 text-primary" />
          {t('aggregate_summaries.settings.algorithm_section')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField
            label={t('aggregate_summaries.settings.similarity_threshold_label')}
            description={t('aggregate_summaries.settings.similarity_threshold_desc')}
            value={local.similarity_threshold}
            onChange={(v) => handleChange('similarity_threshold', v)}
            min={0}
            max={1}
            step={0.05}
          />
          <NumberField
            label={t('aggregate_summaries.settings.min_point_length_label')}
            description={t('aggregate_summaries.settings.min_point_length_desc')}
            value={local.min_point_length}
            onChange={(v) => handleChange('min_point_length', v)}
            min={3}
            max={50}
            step={1}
          />
          <NumberField
            label={t('aggregate_summaries.settings.max_strengths_label')}
            value={local.max_strengths}
            onChange={(v) => handleChange('max_strengths', v)}
            min={1}
            max={50}
            step={1}
          />
          <NumberField
            label={t('aggregate_summaries.settings.max_improvements_label')}
            value={local.max_improvements}
            onChange={(v) => handleChange('max_improvements', v)}
            min={1}
            max={50}
            step={1}
          />
        </div>
      </Card>

      {/* Source settings */}
      <Card padding="lg">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <FileText className="w-5 h-5 text-primary" />
          {t('aggregate_summaries.settings.sources_section')}
        </h3>

        <div className="space-y-4">
          <ToggleField
            label={t('aggregate_summaries.settings.include_manual_activities_label')}
            description={t('aggregate_summaries.settings.include_manual_activities_desc')}
            checked={local.include_manual_activities}
            onChange={(v) => handleChange('include_manual_activities', v)}
          />
          <ToggleField
            label={t('aggregate_summaries.settings.deduplication_label')}
            description={t('aggregate_summaries.settings.deduplication_desc')}
            checked={local.deduplication}
            onChange={(v) => handleChange('deduplication', v)}
          />
        </div>
      </Card>

      {/* Export settings */}
      <Card padding="lg">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <FileText className="w-5 h-5 text-primary" />
          {t('aggregate_summaries.settings.export_section')}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              {t('aggregate_summaries.settings.pdf_footer_label')}
            </label>
            <input
              type="text"
              value={local.pdf_footer_text}
              onChange={(e) => handleChange('pdf_footer_text', e.target.value)}
              placeholder={t('aggregate_summaries.settings.pdf_footer_placeholder')}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
            />
          </div>
          <ToggleField
            label={t('aggregate_summaries.settings.pdf_show_signatures_label')}
            checked={local.pdf_show_signatures}
            onChange={(v) => handleChange('pdf_show_signatures', v)}
          />
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-2 sticky bottom-0 bg-bg-secondary/80 backdrop-blur p-3 rounded-lg border border-border">
        <Button
          variant="ghost"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={handleReset}
          disabled={saving}
        >
          {t('aggregate_summaries.settings.reset')}
        </Button>

        <Button
          variant="primary"
          icon={<Save className="w-4 h-4" />}
          onClick={handleSave}
          disabled={!hasChanges || saving}
          loading={saving}
        >
          {t('aggregate_summaries.settings.save')}
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-bg-secondary/50">
      <div className="flex-1">
        <div className="text-sm font-medium text-text">{label}</div>
        {description && (
          <div className="text-xs text-text-muted mt-0.5">{description}</div>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-5 h-5 text-primary"
      />
    </label>
  );
}

function NumberField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text mb-1.5">
        {label}
      </label>
      {description && (
        <p className="text-xs text-text-muted mb-1.5">{description}</p>
      )}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
      />
    </div>
  );
}

export default AggregateSummariesSettingsPage;