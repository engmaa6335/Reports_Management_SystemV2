// ═══════════════════════════════════════════════════════════
// IconMapper — converts icon string (from DB) to Lucide component
// ═══════════════════════════════════════════════════════════

import {
  Home,
  FileText,
  BarChart3,
  Sparkles,
  Bell,
  Settings,
  Users,
  Building2,
  Shield,
  Palette,
  LayoutTemplate,
  Grid,
  Upload,
  RotateCcw,
  Lock,
  FileCheck,
  type LucideIcon,
} from 'lucide-react';

// ─── Map of icon name → Lucide component ───
const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  FileText,
  BarChart3,
  Sparkles,
  Bell,
  Settings,
  Users,
  Building2,
  Shield,
  Palette,
  LayoutTemplate,
  Grid,
  Upload,
  RotateCcw,
  Lock,
  FileCheck,
};

/**
 * Get a Lucide icon component by name.
 * Falls back to FileText if not found.
 */
export function getIconComponent(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return FileText;
  return ICON_MAP[iconName] || FileText;
}

/**
 * Render an icon from a DB string.
 */
export function DynamicIcon({
  name,
  className = 'w-5 h-5',
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = getIconComponent(name);
  return <Icon className={className} />;
}