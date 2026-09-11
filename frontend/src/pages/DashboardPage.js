import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import WalletCard from '../components/WalletCard.js'
import useWallet from '../hooks/useWallet.js'
import { TokenLogo, EthLogo, HubLogo, UsdtLogo } from '../components/TokenLogo.js'
import './DashboardPage.css'

// High-fidelity 3D Purple Spherical Avatar Component
function PurpleSphereLarge() {
  return (
    <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-purple-500/30">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <defs>
          <radialGradient id="sphereLarge" cx="30%" cy="25%" r="75%">
            <stop offset="0%" stopColor="#f3e8ff" />
            <stop offset="35%" stopColor="#c084fc" />
            <stop offset="70%" stopColor="#7e22ce" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>
          <filter id="glow3d" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#a855f7" floodOpacity="0.5" />
          </filter>
        </defs>
        <circle cx="28" cy="28" r="28" fill="url(#sphereLarge)" filter="url(#glow3d)" />
        <ellipse cx="20" cy="16" rx="6" ry="3.5" fill="#ffffff" fillOpacity="0.45" filter="blur(1px)" />
        <path
          d="M17 42C17 36.4772 21.4772 32 27 32C32.5228 32 37 36.4772 37 42"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
        <circle cx="27" cy="23" r="5" fill="#ffffff" fillOpacity="0.9" />
      </svg>
    </div>
  )
}

// Visual SVG Donut / Pie Chart for Total Portfolio with Token Logos
function PortfolioDonutChart() {
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
        <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
          <circle cx="48" cy="48" r="38" stroke="var(--bg-surface-3)" strokeWidth="12" fill="none" />
          {/* ETH Slice: 62% */}
          <circle
            cx="48" cy="48" r="38"
            stroke="#627eea"
            strokeWidth="12"
            strokeDasharray="148 238"
            strokeDashoffset="0"
            fill="none"
          />
          {/* HUB Slice: 28% */}
          <circle
            cx="48" cy="48" r="38"
            stroke="#a855f7"
            strokeWidth="12"
            strokeDasharray="67 238"
            strokeDashoffset="-148"
            fill="none"
          />
          {/* USDT Slice: 10% */}
          <circle
            cx="48" cy="48" r="38"
            stroke="#26A17B"
            strokeWidth="12"
            strokeDasharray="24 238"
            strokeDashoffset="-215"
            fill="none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--ink-muted)' }}>TOTAL</span>
          <span className="text-xs font-bold font-mono" style={{ color: 'var(--ink)' }}>$12.4K</span>
        </div>
      </div>

      <div className="space-y-1.5 flex-1 min-w-0 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EthLogo size={15} />
            <span style={{ color: 'var(--ink)' }}>ETH</span>
          </div>
          <span className="font-bold font-mono" style={{ color: 'var(--ink)' }}>62%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HubLogo size={15} />
            <span style={{ color: 'var(--ink)' }}>HUB</span>
          </div>
          <span className="font-bold font-mono" style={{ color: 'var(--brand)' }}>28%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsdtLogo size={15} />
            <span style={{ color: 'var(--ink)' }}>USDT</span>
          </div>
          <span className="font-bold font-mono" style={{ color: 'var(--green)' }}>10%</span>
        </div>
      </div>
    </div>
  )
}

// Sparkline Line Graph for Active Transactions
function SparklineGraph() {
  return (
    <svg width="100%" height="40" viewBox="0 0 160 40" fill="none" className="overflow-visible">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M0 32 Q 25 10, 50 22 T 100 8 T 130 18 T 160 6 L 160 40 L 0 40 Z"
        fill="url(#sparkGrad)"
      />
      <path
        d="M0 32 Q 25 10, 50 22 T 100 8 T 130 18 T 160 6"
        stroke="#6366f1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="160" cy="6" r="3.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1.5" />
    </svg>
  )
}

function DashboardPage() {
  const { address, isConnected } = useAccount()
  const { user, transactions, registerOrLogin } = useWallet()

  // Profile Name Editing
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('chainhub_username') || 'Anya M.'
  })
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')

  useEffect(() => {
    if (isConnected && address) {
      registerOrLogin(address)
    }
  }, [isConnected, address, registerOrLogin])

  const handleStartEditName = () => {
    setTempName(userName)
    setIsEditingName(true)
  }

  const handleSaveName = (e) => {
    e.preventDefault()
    if (tempName.trim()) {
      setUserName(tempName.trim())
      localStorage.setItem('chainhub_username', tempName.trim())
      window.dispatchEvent(new Event('chainhub_username_updated'))
    }
    setIsEditingName(false)
  }

  const displayTransactions = transactions && transactions.length > 0 ? transactions : [
    {
      id: '1',
      type: 'Escrow Lock',
      token: 'ETH',
      value: '0.007 ETH',
      counterparty: '0x3Dc0...5aD5',
      txHash: '0x7e8b9f1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f',
      status: 'Confirmed',
      timestamp: '2 mins ago',
    },
    {
      id: '2',
      type: 'P2P Trade',
      token: 'HUB',
      value: '250.00 HUB',
      counterparty: '0x81b4...28F1',
      txHash: '0x4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b',
      status: 'Confirmed',
      timestamp: '1 hour ago',
    },
    {
      id: '3',
      type: 'Campaign Stake',
      token: 'USDT',
      value: '100.00 USDT',
      counterparty: '0x1c2d...9e8f',
      txHash: '0x9f8e7d6c5b4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c',
      status: 'Confirmed',
      timestamp: 'Yesterday',
    },
    {
      id: '4',
      type: 'Reward Claim',
      token: 'HUB',
      value: '45.00 HUB',
      counterparty: 'ChainHub Pool',
      txHash: '0x3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
      status: 'Confirmed',
      timestamp: '3 days ago',
    },
  ]

  const networksList = [
    { name: 'Ethereum', color: '#627eea', active: true },
    { name: 'Sepolia', color: '#10b981', active: true },
    { name: 'Arbitrum', color: '#28a0f0', active: true },
    { name: 'Polygon', color: '#8247e5', active: true },
    { name: 'BSC', color: '#f3ba2f', active: true },
    { name: 'Base', color: '#0052ff', active: true },
    { name: 'Optimism', color: '#ff0420', active: true },
    { name: 'Solana', color: '#14f195', active: false },
  ]

  return (
    <div className="dashboard-container">
      {/* ── Page Title & Subtitle ── */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          Dashboard
        </h1>
        <p className="dashboard-subtitle">
          Overview of your Web3 activities.
        </p>
      </div>

      {/* ── Main Grid Layout ── */}
      <div className="dashboard-grid">

        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN: Fixed Position Cards (Profile on Top, Wallet below)
            ══════════════════════════════════════════════════════════════ */}
        <div className="dashboard-col-left">
          
          {/* TOP CARD: Profile with Editable Name */}
          <div className="dashboard-profile-card">
            <div className="dashboard-profile-header">
              <span className="dashboard-profile-title">
                User Profile
              </span>
              {/* Gold Loyalty Badge */}
              <div className="dashboard-tier-badge">
                <span>Gold Tier</span>
              </div>
            </div>

            {/* Avatar & Editable User Name */}
            <div className="dashboard-profile-body">
              <PurpleSphereLarge />
              <div className="dashboard-profile-info">
                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="dashboard-name-edit-form">
                    <input
                      type="text"
                      className="dashboard-name-edit-input"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: '10px' }}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: '10px' }}
                      onClick={() => setIsEditingName(false)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="dashboard-name-row">
                    <h3 className="dashboard-user-name">
                      {userName}
                    </h3>
                    <button
                      onClick={handleStartEditName}
                      className="dashboard-edit-icon-btn"
                      title="Edit Profile Name"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                <p className="dashboard-join-date">
                  Joined 8/20/2026
                </p>
                <p className="dashboard-merchant-tag">
                  Verified Escrow Merchant
                </p>
              </div>
            </div>

            {/* Profile Level & Progress Bar */}
            <div className="dashboard-level-wrap">
              <div className="dashboard-level-header">
                <span className="dashboard-level-label">Account Level 4</span>
                <span className="dashboard-level-xp">78% XP</span>
              </div>
              <div className="dashboard-level-track">
                <div
                  className="dashboard-level-fill"
                  style={{ width: '78%' }}
                />
              </div>
            </div>

            {/* Account Metrics Grid */}
            <div className="dashboard-trust-grid">
              <div className="dashboard-trust-cell">
                <p className="dashboard-trust-label">Trust Score</p>
                <p className="dashboard-trust-val text-emerald-400">99.8%</p>
              </div>
              <div className="dashboard-trust-cell">
                <p className="dashboard-trust-label">Orders Completed</p>
                <p className="dashboard-trust-val" style={{ color: 'var(--ink)' }}>1,420</p>
              </div>
            </div>
          </div>

          {/* BOTTOM CARD: Wallet Card */}
          <WalletCard />
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CENTER & RIGHT COLUMNS: Unified Metrics & Recent Transactions
            ══════════════════════════════════════════════════════════════ */}
        <div className="dashboard-col-right">
          
          {/* Metrics Top Grid */}
          <div className="dashboard-metrics-grid">
            
            {/* 1. Total Portfolio Card with Token Logos */}
            <div className="dashboard-metric-card dashboard-portfolio-span2">
              <div className="dashboard-metric-header">
                <span className="dashboard-metric-label">
                  Total Portfolio
                </span>
                <span className="text-sm font-extrabold font-mono" style={{ color: 'var(--ink)' }}>
                  $12,456.78
                </span>
              </div>
              <PortfolioDonutChart />
            </div>

            {/* 2. Active Transactions Card */}
            <div className="dashboard-metric-card">
              <div>
                <span className="dashboard-metric-label">
                  Transactions
                </span>
                <p className="dashboard-metric-val-large">
                  12 Active
                </p>
              </div>
              <div className="pt-2">
                <SparklineGraph />
              </div>
            </div>

            {/* 3. Status Card */}
            <div className="dashboard-metric-card">
              <span className="dashboard-metric-label">
                Protocol Status
              </span>
              <div className="dashboard-status-row">
                <div className="dashboard-status-indicator">
                  <span className="dashboard-status-pulse" />
                  <span className="dashboard-status-dot" />
                </div>
                <div>
                  <p className="dashboard-status-text-active">ACTIVE</p>
                  <p className="dashboard-status-subtext">Escrow & Gas Normal</p>
                </div>
              </div>
              <div style={{ height: '10px' }} />
            </div>

          </div>

          {/* 4. Supported Multi-Chain Networks Card */}
          <div className="dashboard-networks-card">
            <div className="dashboard-metric-header" style={{ marginBottom: 0 }}>
              <span className="dashboard-metric-label">
                Supported Multi-Chain Networks
              </span>
              <span className="text-xs text-indigo-400 font-semibold">Multi-Chain Active</span>
            </div>
            <div className="dashboard-networks-grid">
              {networksList.map((net) => (
                <div
                  key={net.name}
                  className={`dashboard-network-pill ${net.active ? 'active' : ''}`}
                >
                  <span
                    className="dashboard-network-dot"
                    style={{ backgroundColor: net.color }}
                  />
                  <span className="truncate">{net.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. LARGE CARD: Recent Transactions Table with Currency Logos */}
          <div className="dashboard-tx-card">
            <div className="dashboard-tx-header">
              <div>
                <h2 className="dashboard-tx-title">
                  Recent Transactions
                </h2>
                <p className="dashboard-tx-desc">
                  Verified smart contract escrow actions on ChainHub.
                </p>
              </div>
              <Link to="/transactions" className="dashboard-tx-link">
                View all →
              </Link>
            </div>

            {/* Clean Data Table */}
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Token</th>
                    <th>Value</th>
                    <th>Counterparty</th>
                    <th>Hash</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="dashboard-tx-type">
                        {tx.type}
                      </td>
                      <td>
                        <div className="dashboard-token-badge">
                          <TokenLogo symbol={tx.token} size={16} />
                          <span style={{ color: tx.token === 'HUB' ? 'var(--brand)' : 'var(--ink)' }}>
                            {tx.token}
                          </span>
                        </div>
                      </td>
                      <td className="dashboard-tx-val">
                        {tx.value}
                      </td>
                      <td className="dashboard-tx-counterparty">
                        {tx.counterparty}
                      </td>
                      <td>
                        {tx.txHash ? (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dashboard-tx-hash-link"
                          >
                            {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-4)}
                          </a>
                        ) : (
                          <span className="dashboard-tx-counterparty">0x...</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-green">
                          {tx.status}
                        </span>
                      </td>
                      <td className="dashboard-tx-time">
                        {tx.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default DashboardPage
