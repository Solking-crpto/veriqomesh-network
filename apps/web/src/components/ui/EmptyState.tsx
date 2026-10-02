'use client';

import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-border/80 rounded-card bg-surface/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-text-tertiary mb-4">
        {icon || <Inbox className="w-6 h-6 text-text-secondary" />}
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-text-primary mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};
