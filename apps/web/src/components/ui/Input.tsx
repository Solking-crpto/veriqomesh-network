'use client';

import React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightElement,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-text-tertiary">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full bg-surface border rounded-control text-sm text-text-primary placeholder:text-text-tertiary transition-colors min-h-[44px] px-3.5 ${
              leftIcon ? 'pl-10' : ''
            } ${rightElement ? 'pr-12' : ''} ${
              error
                ? 'border-status-error/60 focus:border-status-error focus:ring-1 focus:ring-status-error'
                : 'border-border focus:border-accent focus:ring-1 focus:ring-accent hover:border-border-strong'
            } disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center text-text-tertiary text-xs sm:text-sm font-medium">
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-status-error mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-text-tertiary mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      className = '',
      id,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs sm:text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          rows={rows}
          className={`w-full bg-surface border rounded-control text-sm text-text-primary placeholder:text-text-tertiary transition-colors p-3.5 resize-y ${
            error
              ? 'border-status-error/60 focus:border-status-error focus:ring-1 focus:ring-status-error'
              : 'border-border focus:border-accent focus:ring-1 focus:ring-accent hover:border-border-strong'
          } disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs text-status-error mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-text-tertiary mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
