'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-control transition-colors duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

    // Variant styles
    const variantStyles = {
      primary:
        'bg-accent text-white hover:bg-accent-hover active:bg-[#5A38E8] shadow-subtle',
      secondary:
        'bg-surface-elevated text-text-primary border border-border hover:bg-[#1E2330] hover:border-border-strong active:bg-[#151922]',
      ghost:
        'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated active:bg-surface',
      destructive:
        'bg-status-error/15 text-status-error border border-status-error/30 hover:bg-status-error/25 active:bg-status-error/30',
    };

    // Size styles (with min 44px touch target on mobile where appropriate)
    const sizeStyles = {
      sm: 'h-8 px-3 text-xs gap-1.5 min-h-[36px]',
      md: 'h-10 px-4 text-sm gap-2 min-h-[44px]',
      lg: 'h-12 px-5 text-base gap-2.5 min-h-[48px]',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
