import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ================================================
// Types
// ================================================

interface SubjectOption {
  code: string;
  name_ar: string;
  icon: string | null;
  color: string | null;
}

interface SubjectSelectFieldProps {
  field: {
    field_key: string;
    label_ar: string;
    placeholder?: string | null;
    help_text?: string | null;
    validation_rules?: Record<string, unknown>;
  };
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

// ================================================
// Component
// ================================================

export function SubjectSelectField({
  field,
  value,
  onChange,
  error,
}: SubjectSelectFieldProps) {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSubjects, setNoSubjects] = useState(false);

  const validation = (field.validation_rules || {}) as {
    required?: boolean;
  };

  // ================================================
  // Load user's assigned subjects
  // ================================================
  useEffect(() => {
    const loadSubjects = async () => {
      setLoading(true);

      // ⭐ 1. احصل على auth user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        console.warn('⚠️ No auth user');
        setLoading(false);
        return;
      }

      console.log('🔍 auth.uid:', authUser.id);

      // ⭐ 2. احصل على public.users.id
      const { data: publicUser, error: puError } = await supabase
        .from('users')
        .select('id, email')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (puError || !publicUser) {
        console.error('⚠️ Public user not found:', puError);
        setLoading(false);
        return;
      }

      console.log('🔍 public.users.id:', publicUser.id);

      // ⭐ 3. جلب المواد المُسندة
      const { data, error: fetchError } = await supabase
        .from('user_subject_assignments')
        .select(
          `
          subject_code,
          subject:subjects ( code, name_ar, icon, color )
        `
        )
        .eq('user_id', publicUser.id)
        .is('ended_at', null)
        .eq('is_active', true);

      if (fetchError) {
        console.error('❌ Error loading subjects:', fetchError);
        setLoading(false);
        return;
      }

      console.log('✅ Raw assignments:', data);

      const list: SubjectOption[] = (data || [])
        .map((item: any) => item.subject)
        .filter(Boolean);

      console.log('✅ Subjects:', list);

      if (list.length === 0) {
        setNoSubjects(true);
      } else {
        setSubjects(list);
      }

      setLoading(false);
    };

    loadSubjects();
  }, []);

  // ================================================
  // Render
  // ================================================

  const baseInputClass = `
    w-full px-4 py-2.5 rounded-lg border transition-all
    bg-surface text-text placeholder:text-text-muted
    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
    ${error ? 'border-danger' : 'border-border'}
  `;

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="block text-sm font-medium text-text">
        {field.label_ar}
        {validation.required && (
          <span className="text-danger mr-1">*</span>
        )}
      </label>

      {/* Help Text */}
      {field.help_text && (
        <p className="text-xs text-text-muted">{field.help_text}</p>
      )}

      {/* Loading */}
      {loading && (
        <div className="w-full px-4 py-3 rounded-lg border border-border bg-bg-secondary text-text-muted text-sm">
          جاري تحميل المواد...
        </div>
      )}

      {/* No subjects assigned */}
      {!loading && noSubjects && (
        <div className="px-4 py-3 rounded-lg border border-warning bg-warning/5 text-warning text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">لا توجد مواد مُسندة لك</p>
            <p className="text-xs mt-1">
              تواصل مع الدعم الفني لإسناد المواد
            </p>
          </div>
        </div>
      )}

      {/* Select */}
      {!loading && !noSubjects && subjects.length > 0 && (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
        >
          <option value="">— اختر المادة —</option>
          {subjects.map((subject) => (
            <option key={subject.code} value={subject.code}>
              {subject.icon || '📚'} {subject.name_ar}
            </option>
          ))}
        </select>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-danger flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}