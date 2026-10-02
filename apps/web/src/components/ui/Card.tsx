'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-surface border border-border',
      elevated: 'bg-surface-elevated border border-border shadow-card',
      interactive:
        'bg-surface border border-border hover:border-border-strong hover:bg-surface-elevated transition-all duration-150 cursor-pointer',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    };

    return (
      <div
        ref={ref}
        className={`rounded-card ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = ({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 ${className}`}>
    <div>
      <h3 className="text-base sm:text-lg font-semibold text-text-primary tracking-tight">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
