import React from 'react'
import { useAccount, useBalance } from 'wagmi'
import { networks } from '../config/web3.js'
import { EthLogo, HubLogo, UsdtLogo, TokenLogo } from '../components/TokenLogo.js'

function TokenRow({ symbol, name, balance, change }) {
  const isPos = change >= 0
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <TokenLogo symbol={symbol} size={32} />
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{name}</p>
          <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>{symbol}</p>
        </div>
      </div>
      <div className="text-right font-mono">
        <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{balance}</p>
        <p className={`text-xs font-semibold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isPos ? '+' : ''}{change}%
        </p>
      </div>
    </div>
  )
}

function PortfolioPage() {
  const { address, isConnected, chain } = useAccount()
  const { data: balance } = useBalance({ address })

  if (!isConnected) {
    return (
      <div className="card flex flex-col items-center justify-center py-20 text-center gap-4 mt-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-dim)', color: 'var(--brand)' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0
                 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5
                 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0
                 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-base" style={{ color: 'var(--ink)' }}>Connect Wallet</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>Connect your Web3 wallet to inspect your multi-chain portfolio</p>
        </div>
        <appkit-button label="Connect Wallet" />
      </div>
    )
  }

  const ethBalance = balance ? parseFloat(balance.formatted).toFixed(4) : '0.0455'
  const symbol     = balance?.symbol ?? 'ETH'
  const networkList = networks.slice(0, 7)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>
          Portfolio
        </h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--ink-muted)' }}>
          Asset balances and multi-chain network overview.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Native balance card ── */}
        <div className="card space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-extrabold text-sm uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
              Native Balance
            </h2>
            <span className="badge badge-green text-[10px]">Connected</span>
          </div>

          <div className="flex items-center gap-4">
            <EthLogo size={44} />
            <div>
              <p className="text-3xl font-black font-mono" style={{ color: 'var(--ink)' }}>{ethBalance} <span className="text-lg">{symbol}</span></p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--ink-muted)' }}>{chain?.name || 'Ethereum Sepolia'}</p>
            </div>
          </div>

          {chain?.blockExplorers?.default?.url && (
            <a
              href={`${chain.blockExplorers.default.url}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold hover:underline pt-1"
              style={{ color: 'var(--brand)' }}
            >
              <span>View on {chain.blockExplorers.default.name}</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* ── Supported networks ── */}
        <div className="card space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-extrabold text-sm uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
              Supported Networks
            </h2>
            <span className="text-xs text-indigo-400 font-bold">Multi-Chain Active</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {networkList.map(n => (
              <div
                key={n.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors"
                style={{
                  background: chain?.id === n.id ? 'var(--brand-dim)' : 'var(--bg-surface-3)',
                  borderColor: chain?.id === n.id ? 'var(--brand-bd)' : 'var(--border)',
                  color: chain?.id === n.id ? 'var(--brand)' : 'var(--ink)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: chain?.id === n.id ? 'var(--green)' : 'var(--ink-faint)' }}
                />
                <span className="truncate">{n.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Token list ── */}
        <div className="card space-y-2 lg:col-span-2 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-extrabold text-sm" style={{ color: 'var(--ink)' }}>Tracked Assets</h2>
            <span className="badge badge-green text-[10px]">Live Sync</span>
          </div>

          <TokenRow symbol="ETH"   name="Ethereum"  balance={`${ethBalance} ETH`}   change={2.4} />
          <TokenRow symbol="HUB"   name="ChainHub"  balance="1,250.00 HUB"          change={8.5} />
          <TokenRow symbol="USDT"  name="Tether USD" balance="100.00 USDT"          change={0.1} />
        </div>

      </div>
    </div>
  )
}

export default PortfolioPage
