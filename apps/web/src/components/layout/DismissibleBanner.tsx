'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ExternalLink, Play } from 'lucide-react';

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
    <div className="bg-[#12151C] border-b border-border text-text-secondary text-xs px-4 py-2 transition-all duration-150">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden text-[11px] sm:text-xs">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/15 text-[#9D85FF] font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Monad Testnet
          </span>
          <span className="truncate hidden sm:inline">
            Metropolis (Chain ID 10143) · Testnet MON has zero monetary value
          </span>
          <span className="text-border hidden md:inline">•</span>
          <span className="hidden md:inline font-mono text-text-tertiary">
            Escrow: <code className="text-text-secondary">0x925ea8...015A</code>
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/demo-video"
            className="hidden sm:inline-flex items-center gap-1.5 text-accent hover:text-[#9D85FF] font-medium transition text-xs"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Watch walkthrough (02:55)</span>
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition min-h-[28px] min-w-[28px] flex items-center justify-center"
            aria-label="Dismiss testnet notice"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
