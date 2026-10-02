'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Wallet,
  ExternalLink,
  LogOut,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useDemoNetwork } from '../context/DemoNetworkContext';
import {
  getRequestsNavBadge,
  TARGET_BUYER_ADDRESS,
  TARGET_SELLER_ADDRESS,
} from '../lib/invitation-utils';
import { Button } from './ui/Button';
import { StatusChip } from './ui/StatusChip';
import { DismissibleBanner } from './layout/DismissibleBanner';

export function Navigation() {
  const pathname = usePathname();
  const { role, switchRole, wallet, actionableRequestsCount } = useDemoNetwork();
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const requestsBadge = getRequestsNavBadge(actionableRequestsCount);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setWalletDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { label: 'Create', href: '/initiator/intent' },
    {
      label: 'Inbox',
      href: '/requests',
      badge: requestsBadge,
    },
    { label: 'Transactions', href: '/transactions' },
    { label: 'Trust Layer', href: '/trust' },
    { label: 'Public Demo', href: '/transactions?tab=demo' },
  ];

  return (
    <>
      <DismissibleBanner />

      <header className="sticky top-0 z-40 bg-[#0B0D12]/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-control overflow-hidden flex items-center justify-center shrink-0 bg-surface border border-border group-hover:border-accent/40 transition-colors">
                <Image
                  src="/brand/veriqomesh-mark.png"
                  alt="VeriqoMesh"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform"
                  priority
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-primary text-sm sm:text-base tracking-tight">
                  VeriqoMesh
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-status-success hidden sm:inline-block" title="Connected to Monad Testnet" />
              </div>
            </Link>

            {/* Desktop Navigation Links (>= 1024px) */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((item) => {
                const isActive =
                  item.href === '/transactions?tab=demo'
                    ? pathname === '/transactions' &&
                      typeof window !== 'undefined' &&
                      window.location.search.includes('tab=demo')
                    : item.href === '/transactions'
                    ? pathname === '/transactions' &&
                      (typeof window === 'undefined' ||
                        !window.location.search.includes('tab=demo'))
                    : pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-control text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 min-h-[36px] ${
                      isActive
                        ? 'bg-surface-elevated text-text-primary border border-border shadow-subtle'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface/60'
                    }`}
                  >
                    <span>{item.label}</span>
                    {typeof item.badge === 'number' && (
                      <span className="px-1.5 py-0.2 rounded-full bg-accent text-white text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Perspective Switcher (Desktop) */}
            <div className="hidden lg:flex items-center p-0.5 rounded-control bg-surface border border-border text-xs">
              <span className="px-2 text-text-tertiary text-[11px] font-medium">
                View:
              </span>
              <button
                onClick={() => switchRole('INITIATOR')}
                className={`px-2.5 py-1 rounded-[6px] font-medium transition min-h-[28px] ${
                  role === 'INITIATOR'
                    ? 'bg-surface-elevated text-text-primary border border-border/80 shadow-subtle'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Buyer
              </button>
              <button
                onClick={() => switchRole('RECEIVER')}
                className={`px-2.5 py-1 rounded-[6px] font-medium transition relative min-h-[28px] ${
                  role === 'RECEIVER'
                    ? 'bg-surface-elevated text-text-primary border border-border/80 shadow-subtle'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Seller
                {actionableRequestsCount > 0 && role !== 'RECEIVER' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            </div>

            {/* Wallet Connection */}
            {!wallet.isConnected ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => wallet.connect()}
                isLoading={wallet.isConnecting}
                leftIcon={<Wallet className="w-3.5 h-3.5" />}
                className="text-xs sm:text-sm font-medium px-3 sm:px-4"
              >
                <span className="hidden sm:inline">Connect Wallet</span>
                <span className="sm:hidden">Connect</span>
              </Button>
            ) : !wallet.isMonadTestnet ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => wallet.switchNetwork()}
                leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                <span>Switch to Monad</span>
              </Button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-control bg-surface border border-border hover:border-border-strong transition min-h-[36px] text-xs sm:text-sm"
                  aria-expanded={walletDropdownOpen}
                >
                  <span className="w-2 h-2 rounded-full bg-status-success shrink-0" />
                  <span className="font-mono text-text-primary hidden sm:inline font-medium">
                    {wallet.balanceMon ? `${wallet.balanceMon} MON` : '0.0 MON'}
                  </span>
                  <span className="text-border hidden sm:inline">•</span>
                  <span className="font-mono text-text-secondary">
                    {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
                </button>

                {/* Wallet Details Dropdown */}
                {walletDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-surface-elevated border border-border rounded-card shadow-elevated p-3 space-y-3 z-50 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="text-xs font-medium text-text-secondary">
                        Connected Account
                      </span>
                      <StatusChip status="success" size="sm" label="Monad 10143" />
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] text-text-tertiary">Address</div>
                      <div className="font-mono text-xs text-text-primary break-all bg-surface p-2 rounded-control border border-border select-all">
                        {wallet.address}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-text-secondary">Balance</span>
                      <span className="font-mono font-semibold text-text-primary">
                        {wallet.balanceMon ? `${wallet.balanceMon} MON` : '0.0000 MON'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <a
                        href={`https://testnet.monadvision.com/address/${wallet.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => {
                          wallet.disconnect();
                          setWalletDropdownOpen(false);
                        }}
                        className="text-xs text-status-error hover:underline flex items-center gap-1"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
