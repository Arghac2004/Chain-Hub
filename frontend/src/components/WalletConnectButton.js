import React from 'react'
import { useReownAppKit } from '../hooks/useReownAppKit.js'

/**
 * WalletConnectButton Component
 * Uses native Reown AppKit hooks for connect, account details, and 1-click disconnect with icons.
 */
export function WalletConnectButton({ className = '' }) {
  const {
    isConnected,
    shortAddress,
    walletIcon,
    walletName,
    connect,
    disconnect,
    openAccount,
  } = useReownAppKit()

  // ── Connected State ──
  if (isConnected && shortAddress) {
    return (
      <div
        className={`flex items-center gap-1 rounded-xl p-1 pl-2.5 transition-all shadow-md ${className}`}
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Clickable Wallet Address Pill (Opens Reown Account Modal) */}
        <button
          type="button"
          onClick={openAccount}
          className="flex items-center gap-2 cursor-pointer outline-none bg-transparent border-none text-left p-0 transition-opacity hover:opacity-85"
          title={`Connected with ${walletName || 'Wallet'}. Click to view details in Reown AppKit`}
        >
          {/* Active Pulsing Indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>

          {/* Wallet Icon (MetaMask, Trust, Coinbase, or default) */}
          {walletIcon ? (
            <img
              src={walletIcon}
              alt={walletName || 'Wallet'}
              className="w-4 h-4 rounded-full flex-shrink-0 object-cover"
            />
          ) : (
            <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          )}

          {/* Formatted Short Address */}
          <span className="font-mono text-xs font-bold" style={{ color: 'var(--ink)' }}>
            {shortAddress}
          </span>

          {/* Caret Icon */}
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 1-Click Disconnect Icon Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            disconnect()
          }}
          title="Disconnect Wallet"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition-all ml-0.5 cursor-pointer border-none bg-transparent flex items-center justify-center group"
          aria-label="Disconnect Wallet"
        >
          {/* Disconnect / Power Icon */}
          <svg
            className="w-3.5 h-3.5 transition-transform group-hover:scale-110"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    )
  }

  // ── Disconnected State ──
  return (
    <button
      type="button"
      onClick={connect}
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer border-none ${className}`}
      title="Connect Wallet with Reown AppKit"
    >
      {/* Wallet / Plug Connect Icon */}
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span>Connect Wallet</span>
    </button>
  )
}

export default WalletConnectButton
