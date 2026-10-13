import { type ReactNode } from 'react';

type CardVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'transparent';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-surface border-border text-text',
  primary: 'bg-primary border-primary text-white',
  success: 'bg-success border-success text-white',
  warning: 'bg-warning border-warning text-white',
  danger: 'bg-danger border-danger text-white',
  transparent: 'bg-transparent border-border text-text',
};

export function Card({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        rounded-xl border shadow-soft
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}