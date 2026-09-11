import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAccount, useSwitchChain, usePublicClient, useDisconnect } from 'wagmi'
import { formatEther, isAddress } from 'viem'
import {
  mainnetNetworks,
  testnetNetworks,
  appKit,
} from '../config/web3.js'
import {
  HUB_TOKEN_ADDRESS,
  HUB_TOKEN_ABI,
} from '../config/contracts.js'
import { useTheme } from '../hooks/ThemeContext.js'
import { EthLogo, HubLogo, ChainHubLogo } from './TokenLogo.js'
import WalletConnectButton from './WalletConnectButton.js'
import { useReownAppKit } from '../hooks/useReownAppKit.js'

function MenuIcon({ open }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  )
}


// Clean Theme Modes (SVG Icons Only - No Text Emojis)
const THEME_MODES = [
  {
    key: 'dark',
    label: 'Dark',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    key: 'light',
    label: 'Light',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    key: 'system',
    label: 'System',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    key: 'auto',
    label: 'Auto',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
]

function ThemeToggle() {
  const { mode, setMode } = useTheme()
  const [open, setOpen] = useState(false)

  const current = THEME_MODES.find((m) => m.key === mode) || THEME_MODES[0]

  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [open])

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`Theme: ${current.label}`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
        style={{
          backgroundColor: open ? 'var(--bg-surface-3)' : 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--ink-muted)',
        }}
      >
        <span style={{ color: 'var(--brand)' }}>{current.icon}</span>
        <span className="hidden sm:inline" style={{ color: 'var(--ink)' }}>{current.label}</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2.5}
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1.5 w-32 rounded-xl overflow-hidden z-50 shadow-xl"
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-2)',
          }}
        >
          {THEME_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => { setMode(m.key); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-left transition-all duration-100"
              style={{
                background: mode === m.key ? 'var(--brand-dim)' : 'transparent',
                color: mode === m.key ? 'var(--brand)' : 'var(--ink)',
                borderLeft: mode === m.key ? '2px solid var(--brand)' : '2px solid transparent',
              }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NetworkSelector({ currentChain, onSwitchChain, isPending }) {
  const [open, setOpen] = useState(false)
  const currentNetworkName = currentChain?.name || 'Sepolia'
  const isTest = currentChain ? testnetNetworks.some((t) => t.id === currentChain.id) : true

  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [open])

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Switch Blockchain Network & Currency"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 hover:border-indigo-500/50"
        style={{
          backgroundColor: open ? 'var(--bg-surface-3)' : 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--ink)',
        }}
      >
        <span className={`w-2 h-2 rounded-full ${isTest ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`} />
        <span className="truncate max-w-[100px]">{currentNetworkName}</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2.5}
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--ink-muted)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1.5 w-64 rounded-2xl overflow-hidden z-50 shadow-2xl p-2 space-y-2"
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-2)',
          }}
        >
          {/* Header */}
          <div className="px-2.5 py-1 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
              Select Network & Currency
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                try { appKit.open({ view: 'Networks' }) } catch {}
              }}
              className="text-[10px] text-indigo-400 font-bold hover:underline"
            >
              All Networks ↗
            </button>
          </div>

          {/* Testnets Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold px-2.5 uppercase text-amber-400">Testnets</p>
            {testnetNetworks.map((net) => {
              const active = currentChain?.id === net.id
              return (
                <button
                  key={net.id}
                  type="button"
                  onClick={() => {
                    onSwitchChain(net.id)
                    setOpen(false)
                  }}
                  disabled={isPending}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all"
                  style={{
                    background: active ? 'var(--brand-dim)' : 'transparent',
                    color: active ? 'var(--brand)' : 'var(--ink)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span>{net.name}</span>
                  </div>
                  {active && <span className="text-[10px] font-bold text-emerald-400">Active</span>}
                </button>
              )
            })}
          </div>

          {/* Mainnets Section */}
          <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[10px] font-bold px-2.5 uppercase text-indigo-400">Mainnets</p>
            {mainnetNetworks.map((net) => {
              const active = currentChain?.id === net.id
              return (
                <button
                  key={net.id}
                  type="button"
                  onClick={() => {
                    onSwitchChain(net.id)
                    setOpen(false)
                  }}
                  disabled={isPending}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all"
                  style={{
                    background: active ? 'var(--brand-dim)' : 'transparent',
                    color: active ? 'var(--brand)' : 'var(--ink)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span>{net.name}</span>
                  </div>
                  {active && <span className="text-[10px] font-bold text-emerald-400">Active</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Navbar() {
  const { isConnected, address, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient()
  const { switchChain, isPending } = useSwitchChain()
  const location = useLocation()

  const [hubBalance, setHubBalance] = useState('1,250.00')
  const [ethBalance, setEthBalance] = useState('0.0455')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('chainhub_username') || 'Anya M.'
  })

  useEffect(() => {
    const handleUpdate = () => {
      setUserName(localStorage.getItem('chainhub_username') || 'Anya M.')
    }
    window.addEventListener('chainhub_username_updated', handleUpdate)
    return () => window.removeEventListener('chainhub_username_updated', handleUpdate)
  }, [])

  const [selectedMode, setSelectedMode] = useState('testnet')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  useEffect(() => {
    if (!profileMenuOpen) return
    const handler = () => setProfileMenuOpen(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [profileMenuOpen])

  useEffect(() => {
    setMobileOpen(false)
    setProfileMenuOpen(false)
  }, [location.pathname])

  // Read live token balances
  useEffect(() => {
    let active = true
    const fetchBalance = async () => {
      if (!publicClient || !address) return
      try {
        const bal = await publicClient.getBalance({ address })
        if (active && bal) {
          setEthBalance(parseFloat(formatEther(bal)).toFixed(4))
        }
      } catch (e) {
        // fallback
      }

      if (!HUB_TOKEN_ADDRESS || !isAddress(HUB_TOKEN_ADDRESS)) return
      try {
        const bal = await publicClient.readContract({
          address: HUB_TOKEN_ADDRESS,
          abi: HUB_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address],
        })
        if (active && bal) {
          setHubBalance(parseFloat(formatEther(bal)).toFixed(2))
        }
      } catch {
        // Token contract
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 12000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [publicClient, address])

  if (location.pathname.startsWith('/admin')) {
    return null
  }

  const isTestnet = chain ? testnetNetworks.some((t) => t.id === chain.id) : true
  const activeMode = isConnected ? (isTestnet ? 'testnet' : 'mainnet') : selectedMode

  const handleModeSwitch = async (mode) => {
    setSelectedMode(mode)
    if (isConnected && switchChain) {
      try {
        if (mode === 'mainnet') {
          switchChain({ chainId: mainnetNetworks[0]?.id || 1 })
        } else {
          switchChain({ chainId: testnetNetworks[0]?.id || 11155111 })
        }
      } catch (err) {
        console.warn('Network mode switch error:', err)
      }
    }
  }

  const handleSwitchChainId = async (targetChainId) => {
    if (isConnected && switchChain) {
      try {
        switchChain({ chainId: targetChainId })
      } catch (err) {
        console.warn('Chain switch error:', err)
        try {
          appKit.open({ view: 'Networks' })
        } catch {}
      }
    } else {
      try {
        appKit.open({ view: 'Networks' })
      } catch {}
    }
  }

  const navLinks = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/p2p', label: 'P2P Trading' },
    { to: '/campaigns', label: 'Campaigns' },
    { to: '/transactions', label: 'Transactions' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/disputes', label: 'Disputes' },
  ]

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        borderBottom: '1px solid var(--nav-border)',
        backgroundColor: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'background-color 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div className="w-full px-2.5 sm:px-4 lg:px-5">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">

          {/* ── Left Side: 3D Logo + Main Navigation ── */}
          <div className="flex items-center gap-3 xl:gap-5 flex-shrink-0">
            {/* 3D Intertwined Chrome & Purple Logo */}
            <NavLink to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <ChainHubLogo />
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight leading-none" style={{ color: 'var(--ink)' }}>
                  Chain<span style={{ color: 'var(--brand)' }}>Hub</span>
                </span>
                <span className="text-[9px] font-bold tracking-widest text-indigo-400 uppercase leading-none mt-0.5">
                  DeFi Protocol
                </span>
              </div>
            </NavLink>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 flex-shrink-0">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `relative px-2.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150 rounded-lg ${
                      isActive
                        ? 'text-indigo-400 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--brand-dim)' : 'transparent',
                    color: isActive ? 'var(--brand)' : 'var(--ink-muted)',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span>{link.label}</span>
                      {isActive && (
                        <span
                          className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                          style={{ background: 'var(--brand)', boxShadow: '0 0 8px var(--brand)' }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* ── Right Side: Controls pinned to right ── */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mainnet / Testnet Switcher */}
            <div
              className="hidden xl:flex items-center p-0.5 rounded-lg"
              style={{ backgroundColor: 'var(--nav-pill)', border: '1px solid var(--nav-pill-bd)' }}
            >
              <button
                type="button"
                onClick={() => handleModeSwitch('mainnet')}
                disabled={isPending}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
                  activeMode === 'mainnet' ? 'bg-emerald-600 text-white' : ''
                }`}
                style={activeMode !== 'mainnet' ? { color: 'var(--ink-muted)' } : {}}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeMode === 'mainnet' ? 'bg-white' : 'bg-emerald-400/50'}`} />
                Main
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('testnet')}
                disabled={isPending}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
                  activeMode === 'testnet' ? 'bg-amber-600 text-white' : ''
                }`}
                style={activeMode !== 'testnet' ? { color: 'var(--ink-muted)' } : {}}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeMode === 'testnet' ? 'bg-white' : 'bg-amber-400/50'}`} />
                Test
              </button>
            </div>

            {/* Token Balances Display (Desktop) with Token Logos */}
            {isConnected && (
              <div
                className="hidden 2xl:flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-1.5">
                  <EthLogo size={15} />
                  <span style={{ color: 'var(--ink)' }}>{ethBalance} ETH</span>
                </div>
                <span style={{ color: 'var(--border-2)' }}>|</span>
                <div className="flex items-center gap-1.5">
                  <HubLogo size={15} />
                  <span style={{ color: 'var(--brand)' }}>{hubBalance} HUB</span>
                </div>
              </div>
            )}

            {/* Interactive Network & Currency Selector (Sepolia / Mainnet / BSC / etc.) */}
            <NetworkSelector
              currentChain={chain}
              onSwitchChain={handleSwitchChainId}
              isPending={isPending}
            />

            {/* login for wallet  */}
            <NavLink
              to="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 transform active:scale-95 shadow-sm"
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--brand)' : 'var(--brand-dim)',
                color: isActive ? '#ffffff' : 'var(--brand)',
                border: '1px solid var(--border)',
              })}
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>{isConnected ? 'Wallet' : 'Login'}</span>
            </NavLink>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all"
              style={{
                backgroundColor: mobileOpen ? 'var(--bg-surface-3)' : 'transparent',
                color: 'var(--ink)',
              }}
              aria-label="Toggle menu"
            >
              <MenuIcon open={mobileOpen} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-4 py-3 space-y-1"
          style={{ borderTop: '1px solid var(--nav-border)', backgroundColor: 'var(--nav-bg)' }}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className="block px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--brand-dim)' : 'transparent',
                color: isActive ? 'var(--brand)' : 'var(--ink)',
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  )
}

export default Navbar
