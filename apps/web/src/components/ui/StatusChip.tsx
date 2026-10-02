'use client';

import React from 'react';

export type StatusType =
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral'
  | 'accent';

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: StatusType;
  label?: React.ReactNode;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig: Record<
  StatusType,
  { bg: string; text: string; dot: string; border: string }
> = {
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/20',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    border: 'border-amber-500/20',
  },
  error: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
    border: 'border-rose-500/20',
  },
  accent: {
    bg: 'bg-[#7C5CFF]/10',
    text: 'text-[#9D85FF]',
    dot: 'bg-[#7C5CFF]',
    border: 'border-[#7C5CFF]/25',
  },
  neutral: {
    bg: 'bg-[#181C25]',
    text: 'text-text-secondary',
    dot: 'bg-text-tertiary',
    border: 'border-border',
  },
};

export const StatusChip = React.forwardRef<HTMLSpanElement, StatusChipProps>(
  (
    {
      status = 'neutral',
      label,
      showDot = true,
      size = 'sm',
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const config = statusConfig[status];
    const sizeStyles = {
      sm: 'text-xs px-2.5 py-0.5 gap-1.5 font-medium',
      md: 'text-xs sm:text-sm px-3 py-1 gap-2 font-medium',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeStyles[size]} select-none transition-colors ${className}`}
        {...props}
      >
        {showDot && (
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`}
            aria-hidden="true"
          />
        )}
        <span className="truncate">{label || children}</span>
      </span>
    );
  }
);

StatusChip.displayName = 'StatusChip';
