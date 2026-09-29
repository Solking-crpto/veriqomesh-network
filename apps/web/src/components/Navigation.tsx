'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemoNetwork } from '../context/DemoNetworkContext';

export function Navigation() {
  const pathname = usePathname();
  const { role, switchRole, initiator, receiver, requests, wallet } = useDemoNetwork();

  const pendingIncomingCount = requests.filter(
    (r) => r.status === 'AWAITING_RECEIVER_ACCEPTANCE'
  ).length;

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Initiator', href: '/initiator' },
    { label: 'Receiver', href: '/receiver' },
    { label: 'Discover', href: '/receivers' },
    {
      label: 'Requests',
      href: '/requests',
      badge: role === 'RECEIVER' && pendingIncomingCount > 0 ? pendingIncomingCount : undefined,
    },
    { label: 'Transactions', href: '/transactions' },
    { label: 'Evidence', href: '/evidence' },
    { label: 'Trust', href: '/trust' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#090a10]/95 backdrop-blur-md border-b border-gray-800">
      {/* Institutional Top Status Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono border-b border-gray-900">
        <div className="flex items-center gap-3">
          {wallet.isConnected && wallet.isMonadTestnet ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 font-semibold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE MONAD TESTNET
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-600/50 text-purple-300 font-semibold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              MONAD TESTNET READY
            </span>
          )}
          <span className="text-gray-400 hidden sm:inline">
            Monad Metropolis Testnet <span className="text-gray-600">(Chain ID: 10143)</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-gray-400 text-[10px]">
          <span className="hidden md:inline">Escrow: <code className="text-gray-300">0x925ea8...015A</code></span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">Registry: <code className="text-gray-300">0xE1994e...B819</code></span>
          <span className="hidden md:inline">•</span>
          <span className="hidden sm:inline">Resolver: <code className="text-purple-300">0x12f9e5...c35E</code></span>
          <span>•</span>
          <Link
            href="/demo-video"
            className="px-2.5 py-0.5 rounded bg-purple-950/90 hover:bg-purple-900 border border-purple-600/70 text-purple-200 font-bold transition flex items-center gap-1.5 text-[10px]"
          >
            <span className="text-purple-400">▶</span>
            <span>Watch Video Demo (04:15)</span>
          </Link>
        </div>
      </div>

      {/* Main Product Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand & Proposition */}
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-700 to-pink-600 flex items-center justify-center font-mono font-black text-white text-xs shadow-md shadow-purple-950">
              VM
            </div>
            <div>
              <div className="text-sm font-extrabold text-white tracking-wider flex items-center gap-1.5">
                <span>VERIQOMESH</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  NETWORK
                </span>
              </div>
              <div className="text-[9px] text-gray-400 font-sans hidden sm:block">
                Trusted Commerce for Humans & AI
              </div>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-mono">
            {navLinks.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-purple-950/70 text-white font-bold border border-purple-700/60 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-extrabold animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Wallet Connection, Role Switcher & Account Profile */}
        <div className="flex items-center gap-2">
          {/* Live Wallet Connection */}
          {!wallet.isConnected ? (
            <button
              onClick={() => wallet.connect()}
              disabled={wallet.isConnecting}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-mono text-[11px] font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-950"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          ) : !wallet.isMonadTestnet ? (
            <button
              onClick={() => wallet.switchNetwork()}
              className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-600 text-amber-300 font-mono text-[11px] font-bold transition flex items-center gap-1.5 animate-pulse"
              title="Click to switch to Monad Metropolis Testnet (Chain ID 10143)"
            >
              <span>⚠ Switch to Monad (10143)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-950 border border-emerald-800/80 px-2 py-1 rounded-lg font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-semibold">{wallet.balanceMon ? `${wallet.balanceMon} MON` : '0.0 MON'}</span>
              <span className="text-gray-600">•</span>
              <a
                href={`https://testnet.monadvision.com/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition"
                title="View on MonadVision"
              >
                {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
              </a>
              <button
                onClick={() => wallet.disconnect()}
                className="text-gray-500 hover:text-red-400 text-[10px] ml-0.5"
                title="Disconnect"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1-Click Role Switcher */}
          <div className="flex items-center rounded-lg bg-gray-950 border border-gray-800 p-0.5 text-[11px] font-mono">
            <span className="px-2 text-gray-500 text-[10px] uppercase font-bold hidden sm:inline">
              Role:
            </span>
            <button
              onClick={() => switchRole('INITIATOR')}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 ${
                role === 'INITIATOR'
                  ? 'bg-purple-700 text-white shadow-md shadow-purple-950 border border-purple-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${role === 'INITIATOR' ? 'bg-emerald-300' : 'bg-gray-600'}`} />
              <span>INITIATOR</span>
            </button>
            <button
              onClick={() => switchRole('RECEIVER')}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 relative ${
                role === 'RECEIVER'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950 border border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${role === 'RECEIVER' ? 'bg-emerald-300' : 'bg-gray-600'}`} />
              <span>RECEIVER</span>
              {pendingIncomingCount > 0 && role !== 'RECEIVER' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </div>

          {/* Account Profile Badge */}
          <Link
            href="/account"
            className="px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700/80 text-gray-300 text-xs font-mono transition flex items-center gap-2"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-800 to-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">
              {role === 'INITIATOR' ? 'I' : 'R'}
            </div>
            <div className="hidden md:block text-left text-[11px] leading-tight">
              <div className="text-white font-semibold truncate max-w-[120px]">
                {role === 'INITIATOR' ? initiator.name : receiver.name}
              </div>
              <div className="text-[9px] text-gray-400">
                {role === 'INITIATOR' ? 'Initiator' : 'Receiver'}
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Mobile Subnav */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-1.5 border-t border-gray-900 gap-1 text-[11px] font-mono">
        {navLinks.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2 py-1 rounded whitespace-nowrap ${
                isActive ? 'bg-purple-900/60 text-white font-bold' : 'text-gray-400'
              }`}
            >
              {item.label}
              {item.badge !== undefined && (
                <span className="ml-1 px-1 rounded-full bg-amber-500 text-black text-[9px] font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
