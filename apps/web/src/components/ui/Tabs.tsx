'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pill',
  className = '',
}) => {
  if (variant === 'underline') {
    return (
      <div className={`border-b border-border flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar ${className}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
                isActive
                  ? 'border-accent text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'bg-surface-elevated text-text-tertiary'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-1 bg-surface-elevated border border-border rounded-control gap-1 overflow-x-auto no-scrollbar max-w-full ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-control whitespace-nowrap transition-all duration-150 min-h-[36px] sm:min-h-[38px] ${
              isActive
                ? 'bg-[#232834] text-text-primary shadow-subtle'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface/50'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`text-xs px-1.5 py-0.2 rounded-full font-medium ${
                  isActive
                    ? 'bg-accent/20 text-[#9D85FF]'
                    : 'bg-surface text-text-tertiary'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
