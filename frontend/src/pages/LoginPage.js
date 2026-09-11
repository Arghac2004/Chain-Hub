import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccount, useDisconnect, usePublicClient } from 'wagmi'
import { formatEther, isAddress } from 'viem'
import { appKit, testnetNetworks } from '../config/web3.js'
import { HUB_TOKEN_ADDRESS, HUB_TOKEN_ABI } from '../config/contracts.js'
import { ChainHubLogo, EthLogo, HubLogo } from '../components/TokenLogo.js'
import { useTheme } from '../hooks/ThemeContext.js'

function shortAddress(addr) {
  if (!addr || !isAddress(addr)) return '—'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function LoginPage() {
  const { isConnected, address, chain, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient()
  const navigate = useNavigate()
  const { mode } = useTheme()

  const [ethBalance, setEthBalance] = useState('0.0000')
  const [hubBalance, setHubBalance] = useState('0.00')
  const [copied, setCopied] = useState(false)
  const [connecting, setConnecting] = useState(false)

  // Fetch balances when connected
  useEffect(() => {
    let active = true
    const fetchBalance = async () => {
      if (!publicClient || !address) return
      try {
        const bal = await publicClient.getBalance({ address })
        if (active && bal !== undefined) {
          setEthBalance(parseFloat(formatEther(bal)).toFixed(4))
        }
      } catch (e) {
        console.warn('ETH balance fetch error:', e)
      }

      if (!HUB_TOKEN_ADDRESS || !isAddress(HUB_TOKEN_ADDRESS)) return
      try {
        const bal = await publicClient.readContract({
          address: HUB_TOKEN_ADDRESS,
          abi: HUB_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address],
        })
        if (active && bal !== undefined) {
          setHubBalance(parseFloat(formatEther(bal)).toFixed(2))
        }
      } catch {
        // fallback
      }
    }

    if (isConnected && address) {
      fetchBalance()
    }
  }, [publicClient, address, isConnected])

  const handleConnectWallet = async () => {
    setConnecting(true)
    try {
      await appKit.open({ view: 'Connect' })
    } catch (err) {
      console.error('AppKit connect modal error:', err)
    } finally {
      setConnecting(false)
    }
  }

  const handleManageAccount = async () => {
    try {
      await appKit.open({ view: 'Account' })
    } catch (err) {
      console.error('AppKit account modal error:', err)
    }
  }

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleEnterApp = () => {
    navigate('/')
  }

  const walletIcon = connector?.icon || null
  const walletName = connector?.name || 'Web3 Wallet'
  const isTest = chain ? testnetNetworks.some((t) => t.id === chain.id) : true

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex items-center justify-center py-10 px-4 overflow-hidden">
      {/* Background glowing ambient light orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Login Card */}
      <div
        className="w-full max-w-xl rounded-3xl p-6 sm:p-10 shadow-2xl relative transition-all duration-300 backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-2)',
          boxShadow: '0 25px 60px -15px rgba(99, 102, 241, 0.15)',
        }}
      >
        {/* Top Glow Edge */}
        <div className="absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-80" />

        {/* Brand Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="flex justify-center mb-2">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/20 shadow-inner">
              <ChainHubLogo />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Web3 Gateway & Escrow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--ink)' }}>
            Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">ChainHub</span>
          </h1>
          <p className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
            Connect your decentralized Web3 wallet to access peer-to-peer escrow, smart campaigns, multi-chain liquidity, and dispute management.
          </p>
        </div>

        {/* Main Interactive Login / Wallet Area */}
        {!isConnected ? (
          /* ── DISCONNECTED: CUSTOMIZE REOWN CONNECT BUTTON ── */
          <div className="space-y-6">
            <div
              className="p-5 rounded-2xl text-center space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface-3)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--ink)' }}>Connect Web3 Wallet</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>
                  Supports MetaMask, Coinbase, TrustWallet, Phantom, Rainbow & 500+ Wallets via Reown AppKit.
                </p>
              </div>

              {/* High-Fidelity Customized Connect Button */}
              <button
                type="button"
                onClick={handleConnectWallet}
                disabled={connecting}
                className="w-full relative group overflow-hidden py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-xl transition-all duration-300 transform active:scale-98 cursor-pointer border-none flex items-center justify-center gap-3"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                  boxShadow: '0 8px 25px -4px rgba(99, 102, 241, 0.5)',
                }}
              >
                {/* Animated shimmer overlay */}
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Pulse Glow */}
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="tracking-wide">
                  {connecting ? 'Opening Reown Modal...' : 'Connect Wallet to Login'}
                </span>
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>

            {/* Supported Wallets Row */}
            <div className="text-center space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ink-muted)' }}>
                Powered by Reown AppKit • 500+ Wallets
              </span>
              <div className="flex flex-wrap justify-center items-center gap-2 pt-1">
                {['MetaMask', 'Coinbase', 'Trust Wallet', 'Phantom', 'Rainbow', 'Ledger', 'WalletConnect'].map((w) => (
                  <span
                    key={w}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-surface-3)',
                      color: 'var(--ink-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── CONNECTED STATE: CUSTOM WALLET CARD + MANUAL LOGIN ENTRY (NO AUTO-LOGIN) ── */
          <div className="space-y-6">
            <div
              className="p-5 sm:p-6 rounded-2xl space-y-4 shadow-md"
              style={{
                backgroundColor: 'var(--bg-surface-3)',
                border: '1px solid var(--border-2)',
              }}
            >
              {/* Connected Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Wallet Connected
                  </span>
                </div>
                <div
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold"
                  style={{
                    backgroundColor: isTest ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: isTest ? '#f59e0b' : '#818cf8',
                    border: `1px solid ${isTest ? '#f59e0b44' : '#818cf844'}`,
                  }}
                >
                  {chain?.name || 'Sepolia Network'}
                </div>
              </div>

              {/* Wallet Info Display */}
              <div
                className="p-3.5 rounded-xl flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {walletIcon ? (
                    <img src={walletIcon} alt={walletName} className="w-8 h-8 rounded-xl object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--ink-muted)' }}>{walletName}</p>
                    <p className="font-mono text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>{shortAddress(address)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2 rounded-lg text-xs font-semibold transition-all hover:bg-slate-500/10"
                    style={{ color: 'var(--ink)' }}
                    title="Copy Address"
                  >
                    {copied ? (
                      <span className="text-emerald-400 text-xs font-bold">Copied!</span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleManageAccount}
                    className="p-2 rounded-lg text-xs font-semibold text-indigo-400 transition-all hover:bg-indigo-500/10"
                    title="Manage in Reown AppKit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Balances Pill */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="p-3 rounded-xl flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <EthLogo size={18} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--ink-muted)' }}>ETH</span>
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--ink)' }}>{ethBalance}</span>
                </div>

                <div
                  className="p-3 rounded-xl flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <HubLogo size={18} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>HUB</span>
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--brand)' }}>{hubBalance}</span>
                </div>
              </div>

              {/* Primary Action: Enter App / Proceed to Dashboard */}
              <button
                type="button"
                onClick={handleEnterApp}
                className="w-full relative group overflow-hidden py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-xl transition-all duration-200 transform active:scale-98 cursor-pointer border-none flex items-center justify-center gap-2.5"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 8px 25px -4px rgba(16, 185, 129, 0.4)',
                }}
              >
                <span>Proceed to ChainHub Dashboard</span>
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              {/* Secondary Options: Switch / Disconnect */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--ink)',
                  }}
                >
                  Switch Wallet
                </button>

                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center hover:bg-rose-500/10 hover:text-rose-400"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--ink-muted)',
                  }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security / Non-Custodial Badges Footer */}
        <div className="mt-8 pt-6 border-t flex flex-wrap items-center justify-between gap-3 text-xs" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5" style={{ color: 'var(--ink-muted)' }}>
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Non-Custodial</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--ink-muted)' }}>
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004.07 3.06m0 0A8.003 8.003 0 0012 3c1.378 0 2.673.348 3.81 1.002" />
              </svg>
              <span>Smart Escrow</span>
            </div>
          </div>

          <Link
            to="/admin-login"
            className="font-semibold hover:underline text-indigo-400 hover:text-indigo-300"
          >
            Admin Portal →
          </Link>
        </div>
      </div>
    </div>
  )
}
