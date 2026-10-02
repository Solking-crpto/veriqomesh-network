'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function DismissibleBanner() {
  const [dismissed, setDismissed] = useState(true); // default true to prevent SSR hydration flicker

  useEffect(() => {
    const isDismissed = localStorage.getItem('veriqomesh_banner_dismissed') === 'true';
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('veriqomesh_banner_dismissed', 'true');
  };

  if (dismissed) return null;

  return (
    <aside
      aria-label="Testnet Network Notice"
      className="bg-[#12151C] border-b border-border text-text-secondary text-xs px-4 h-7 sm:h-8 flex items-center transition-all duration-150 select-none"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3 text-[11px] sm:text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="inline-flex items-center gap-1.5 text-text-primary font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
            Monad Testnet · 10143
          </span>
          <span className="text-border hidden sm:inline">•</span>
          <span className="truncate text-text-tertiary hidden sm:inline">
            Testnet assets only · Zero monetary value
          </span>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition min-h-[24px] min-w-[24px] flex items-center justify-center shrink-0"
          aria-label="Dismiss testnet notice"
          title="Dismiss notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
