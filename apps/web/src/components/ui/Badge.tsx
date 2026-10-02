'use client';

import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'outline' | 'muted';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'sm',
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-surface-elevated text-text-secondary border border-border',
      accent: 'bg-accent/15 text-[#9D85FF] border border-accent/25',
      outline: 'bg-transparent text-text-secondary border border-border',
      muted: 'bg-surface text-text-tertiary border border-border/50',
    };

    const sizeStyles = {
      sm: 'text-[11px] px-2 py-0.5 font-medium',
      md: 'text-xs px-2.5 py-1 font-medium',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-control ${variantStyles[variant]} ${sizeStyles[size]} select-none ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
