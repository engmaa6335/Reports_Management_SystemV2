import { Check } from 'lucide-react';
import type { ComposerStep } from '../../types/notifications.types';
import { COMPOSER_STEPS } from '../../types/notifications.types';

interface StepBarProps {
  current: ComposerStep;
  completed: Set<ComposerStep>;
  onStepClick?: (step: ComposerStep) => void;
}

export function StepBar({ current, completed, onStepClick }: StepBarProps) {
  return (
    <nav
      className="bg-surface border border-border rounded-xl shadow-soft p-1.5 flex items-center gap-1"
      role="tablist"
      aria-label="خطوات الإرسال"
    >
      {COMPOSER_STEPS.map((step) => {
        const isActive = step.id === current;
        const isDone = completed.has(step.id);
        const isClickable = isActive || isDone || onStepClick;
        return (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={!isClickable}
            onClick={() => onStepClick?.(step.id)}
            className={`
              flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg
              text-right transition-all duration-200 min-w-0
              ${isActive ? 'bg-primary text-white shadow-soft' : ''}
              ${isDone && !isActive ? 'bg-success/10 text-success hover:bg-success/15' : ''}
              ${!isActive && !isDone ? 'text-text-muted hover:bg-bg-secondary' : ''}
              ${!isClickable ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                w-7 h-7 rounded-full flex items-center justify-center
                text-xs font-bold flex-shrink-0
                ${isActive ? 'bg-white/20 text-white' : ''}
                ${isDone && !isActive ? 'bg-success text-white' : ''}
                ${!isActive && !isDone ? 'bg-bg-secondary text-text-muted' : ''}
              `}
            >
              {isDone && !isActive ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : step.id}
            </span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold truncate ${isActive ? 'text-white' : ''}`}>
                {step.label}
              </div>
              <div className={`text-[11px] truncate ${isActive ? 'text-white/80' : 'text-text-muted'}`}>
                {step.description}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
}