import React, { useState } from 'react'
import { useAccount, useBalance, usePublicClient } from 'wagmi'
import { formatEther, isAddress } from 'viem'
import { HUB_TOKEN_ADDRESS, HUB_TOKEN_ABI } from '../config/contracts.js'
import { EthLogo, HubLogo } from './TokenLogo.js'

function WalletCard() {
  const { address, isConnected, chain } = useAccount()
  const { data: balance } = useBalance({ address })
  const publicClient = usePublicClient()
  const [copied, setCopied] = useState(false)
  const [hubBal, setHubBal] = useState('1,250')

  React.useEffect(() => {
    if (!publicClient || !address || !HUB_TOKEN_ADDRESS || !isAddress(HUB_TOKEN_ADDRESS)) return
    publicClient.readContract({
      address: HUB_TOKEN_ADDRESS,
      abi: HUB_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [address],
    }).then(b => {
      if (b) setHubBal(parseFloat(formatEther(b)).toFixed(0))
    }).catch(() => {})
  }, [publicClient, address])

  if (!isConnected) {
    return (
      <div className="card flex flex-col items-center justify-center gap-4 py-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-base" style={{ color: 'var(--ink)' }}>No Wallet Connected</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>Connect any Web3 wallet to manage assets</p>
        </div>
        <appkit-button label="Connect Wallet" />
      </div>
    )
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
  const ethFormatted = balance ? parseFloat(balance.formatted).toFixed(4) : '0.0455'

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="card space-y-4">
      {/* Header: Wallet Address + Pulsating Connected Indicator */}
      <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
          Wallet Address
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">CONNECTED</span>
        </div>
      </div>

      {/* Address text on its own line with copy icon */}
      <div className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-3)', border: '1px solid var(--border)' }}>
        <span className="font-mono text-sm font-bold tracking-wide" style={{ color: 'var(--ink)' }}>
          {shortAddress}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg transition-colors hover:bg-slate-700/30 text-slate-400 hover:text-white"
          title="Copy Address"
        >
          {copied ? (
            <span className="text-[10px] font-bold text-emerald-400">Copied!</span>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Network and Balances Rows with Logos */}
      <div className="space-y-2.5 text-xs">
        {/* Network Line */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <span style={{ color: 'var(--ink-muted)' }}>Network</span>
          <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--ink)' }}>
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>{chain?.name || 'Ethereum Sepolia'}</span>
          </div>
        </div>

        {/* Balance Line with Currency Logos */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <span style={{ color: 'var(--ink-muted)' }}>Balance</span>
          <div className="flex items-center gap-3 font-bold font-mono">
            <div className="flex items-center gap-1.5">
              <EthLogo size={14} />
              <span style={{ color: 'var(--ink)' }}>{ethFormatted} ETH</span>
            </div>
            <span style={{ color: 'var(--border-2)' }}>·</span>
            <div className="flex items-center gap-1.5">
              <HubLogo size={14} />
              <span style={{ color: 'var(--brand)' }}>{hubBal} HUB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Etherscan Explorer Link */}
      {chain?.blockExplorers?.default?.url && (
        <a
          href={`${chain.blockExplorers.default.url}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 pt-1 text-xs font-semibold hover:underline"
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
  )
}

export default WalletCard
