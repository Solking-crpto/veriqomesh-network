'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog container */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${widthStyles[maxWidth]} bg-surface-elevated border border-border rounded-card shadow-elevated z-10 my-8 overflow-hidden`}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border/70">
            <div>
              {title && (
                <h3 className="text-base sm:text-lg font-semibold text-text-primary">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary p-1.5 rounded-control hover:bg-surface transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center -mr-2 -mt-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 sm:px-6 bg-surface/50 border-t border-border/70">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
