'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  PlusCircle,
  Inbox,
  ArrowLeftRight,
  MoreHorizontal,
  Shield,
  Search,
  FileCheck2,
  User,
  Play,
  X,
} from 'lucide-react';
import { useDemoNetwork } from '../../context/DemoNetworkContext';
import { getRequestsNavBadge } from '../../lib/invitation-utils';

export function BottomTabBar() {
  const pathname = usePathname();
  const { actionableRequestsCount, role, switchRole } = useDemoNetwork();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const requestsBadge = getRequestsNavBadge(actionableRequestsCount);

  const mainTabs = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      id: 'create',
      label: 'Create',
      href: '/initiator/intent',
      icon: PlusCircle,
      isActive: pathname.startsWith('/initiator'),
    },
    {
      id: 'inbox',
      label: 'Inbox',
      href: '/requests',
      icon: Inbox,
      badge: requestsBadge,
      isActive: pathname === '/requests' || pathname.startsWith('/receiver'),
    },
    {
      id: 'transactions',
      label: 'Activity',
      href: '/transactions',
      icon: ArrowLeftRight,
      isActive: pathname.startsWith('/transactions'),
    },
  ];

  return (
    <>
      {/* Mobile "More" Drawer Modal */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMoreMenuOpen(false)}
          />
          <div className="relative bg-[#181C25] border-t border-border rounded-t-2xl p-5 pb-8 space-y-4 shadow-elevated z-10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                More Features
              </span>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-1 rounded-control text-text-tertiary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Perspective Switcher */}
            <div className="p-3 rounded-control bg-surface border border-border flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">Perspective:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    switchRole('INITIATOR');
                    setMoreMenuOpen(false);
                  }}
                  className={`px-3 py-1 rounded-control text-xs font-medium transition min-h-[36px] ${
                    role === 'INITIATOR'
                      ? 'bg-accent text-white shadow-subtle'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Buyer
                </button>
                <button
                  onClick={() => {
                    switchRole('RECEIVER');
                    setMoreMenuOpen(false);
                  }}
                  className={`px-3 py-1 rounded-control text-xs font-medium transition min-h-[36px] ${
                    role === 'RECEIVER'
                      ? 'bg-accent text-white shadow-subtle'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Seller
                </button>
              </div>
            </div>

            {/* Links List */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link
                href="/trust"
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-control bg-surface border border-border text-text-primary hover:border-border-strong min-h-[44px]"
              >
                <Shield className="w-4 h-4 text-accent" />
                <span>Trust Layer</span>
              </Link>
              <Link
                href="/receivers"
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-control bg-surface border border-border text-text-primary hover:border-border-strong min-h-[44px]"
              >
                <Search className="w-4 h-4 text-text-secondary" />
                <span>Discover</span>
              </Link>
              <Link
                href="/evidence"
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-control bg-surface border border-border text-text-primary hover:border-border-strong min-h-[44px]"
              >
                <FileCheck2 className="w-4 h-4 text-text-secondary" />
                <span>Evidence</span>
              </Link>
              <Link
                href="/account"
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-control bg-surface border border-border text-text-primary hover:border-border-strong min-h-[44px]"
              >
                <User className="w-4 h-4 text-text-secondary" />
                <span>Account</span>
              </Link>
              <Link
                href="/demo-video"
                onClick={() => setMoreMenuOpen(false)}
                className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-control bg-accent/10 border border-accent/25 text-[#9D85FF] font-medium min-h-[44px]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Watch Walkthrough Video (02:55)</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#12151C]/95 backdrop-blur-md border-t border-border flex items-center justify-around h-14 lg:hidden pb-[env(safe-area-inset-bottom)] px-2"
      >
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors relative ${
                tab.isActive ? 'text-accent font-semibold' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${tab.isActive ? 'text-accent' : 'text-text-secondary'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-accent text-white text-[10px] font-bold min-w-[16px] text-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Tab */}
        <button
          onClick={() => setMoreMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors ${
            moreMenuOpen ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
          }`}
          aria-label="More navigation options"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
}
