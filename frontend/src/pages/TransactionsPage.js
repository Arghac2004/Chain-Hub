import React, { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatEther, isAddress, getAddress } from 'viem'
import {
  CAMPAIGN_FACTORY_ADDRESS,
  CAMPAIGN_FACTORY_ABI,
  CAMPAIGN_ABI,
} from '../config/contracts.js'
import useWallet from '../hooks/useWallet.js'
import { EthLogo, TokenLogo } from '../components/TokenLogo.js'

function shortHash(hash) {
  if (!hash) return '—'
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

function shortAddr(addr) {
  if (!addr || !isAddress(addr)) return '—'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function TransactionsPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { transactions: dbTransactions, registerOrLogin } = useWallet()

  const [liveTxs, setLiveTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'donation' | 'create' | 'release'
  const [copiedHash, setCopiedHash] = useState(null)

  useEffect(() => {
    if (isConnected && address) {
      registerOrLogin(address)
    }
  }, [isConnected, address, registerOrLogin])

  const fetchLiveTransactions = useCallback(async () => {
    if (!publicClient || !CAMPAIGN_FACTORY_ADDRESS || !isAddress(CAMPAIGN_FACTORY_ADDRESS)) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let allEvents = []

      // 1. Read All Deployed Campaigns from Factory
      let deployedCampaigns = []
      try {
        const list = await publicClient.readContract({
          address: CAMPAIGN_FACTORY_ADDRESS,
          abi: CAMPAIGN_FACTORY_ABI,
          functionName: 'getAllCampaigns',
        })
        if (Array.isArray(list)) deployedCampaigns = list.filter(isAddress)
      } catch (err) {
        console.warn('Error fetching all campaigns list:', err.message)
      }

      // 2. Fetch Safe Event Logs
      let currentBlock = 0n
      try {
        currentBlock = await publicClient.getBlockNumber()
      } catch {
        currentBlock = 7000000n
      }
      const safeFromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n

      // A. Factory CampaignCreated Logs
      try {
        const createLogs = await publicClient.getLogs({
          address: CAMPAIGN_FACTORY_ADDRESS,
          event: CAMPAIGN_FACTORY_ABI.find(x => x.type === 'event' && x.name === 'CampaignCreated'),
          fromBlock: safeFromBlock,
          toBlock: 'latest',
        }).catch(() => [])

        for (const log of createLogs) {
          const campAddr = log.args?.campaignAddress || (log.topics?.[1] ? '0x' + log.topics[1].slice(26) : '')
          const organizer = log.args?.organizer || (log.topics?.[2] ? '0x' + log.topics[2].slice(26) : '')
          const refCode = log.args?.referralCode || ''

          allEvents.push({
            id: `log-create-${log.transactionHash}-${log.logIndex}`,
            type: 'create',
            label: 'Campaign Launched',
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            from: organizer || '—',
            to: campAddr || CAMPAIGN_FACTORY_ADDRESS,
            referralCode: refCode,
            value: '0.0000 ETH',
            status: 'Confirmed',
            timestamp: Date.now() - 60000,
          })
        }
      } catch (err) {
        console.warn('Factory logs notice:', err.message)
      }

      // 3. Scan Each Campaign's On-Chain State & Members Tree
      await Promise.all(
        deployedCampaigns.map(async (campAddr) => {
          try {
            const summary = await publicClient.readContract({
              address: campAddr,
              abi: CAMPAIGN_ABI,
              functionName: 'getSummary',
            }).catch(() => null)

            let title = `Campaign #${shortAddr(campAddr)}`
            let organizer = ''
            let rootRef = ''
            let targetEth = '0'

            if (summary) {
              organizer = summary.organizer || summary[2] || ''
              title = summary.title || summary[3] || title
              rootRef = summary.rootReferralCode || summary[5] || ''
              targetEth = formatEther(summary.targetAmount ?? summary[6] ?? 0n)
            }

            if (!allEvents.some(e => e.to?.toLowerCase() === campAddr.toLowerCase() && e.type === 'create')) {
              allEvents.push({
                id: `state-create-${campAddr}`,
                type: 'create',
                label: 'Campaign Launched',
                campaignTitle: title,
                txHash: null,
                blockNumber: null,
                from: organizer || '—',
                to: campAddr,
                referralCode: rootRef,
                value: `${targetEth} ETH Target`,
                status: 'Confirmed',
                timestamp: Date.now() - 3600000,
              })
            }

            let membersList = []
            try {
              const rawMembers = await publicClient.readContract({
                address: campAddr,
                abi: CAMPAIGN_ABI,
                functionName: 'getAllMembers',
              })
              if (Array.isArray(rawMembers)) {
                membersList = rawMembers
              }
            } catch {
              // Backward compatibility
            }

            membersList.forEach((m, idx) => {
              const uAddr = m.userAddress || m[0]
              const rCode = m.referralCode || m[2]
              const contribEth = formatEther(m.contribution ?? m[5] ?? 0n)

              if (parseFloat(contribEth) > 0) {
                allEvents.push({
                  id: `state-donation-${campAddr}-${uAddr}-${idx}`,
                  type: 'donation',
                  label: 'Donation / Backing',
                  campaignTitle: title,
                  txHash: null,
                  blockNumber: null,
                  from: uAddr,
                  to: campAddr,
                  referralCode: rCode,
                  value: `${contribEth} ETH`,
                  status: 'Confirmed',
                  timestamp: Date.now() - (idx + 1) * 300000,
                })
              }
            })
          } catch (campErr) {
            console.warn(`Error scanning campaign ${campAddr}:`, campErr.message)
          }
        })
      )

      // Merge local transactions
      const localHistory = JSON.parse(localStorage.getItem('chainhub_tx_history') || '[]')
      localHistory.forEach(ltx => {
        if (!allEvents.some(e => e.txHash && ltx.txHash && e.txHash.toLowerCase() === ltx.txHash.toLowerCase())) {
          allEvents.push({
            id: `local-${ltx.txHash || Math.random()}`,
            type: ltx.type || 'donation',
            label: ltx.label || 'Transaction',
            campaignTitle: ltx.campaignTitle || '',
            txHash: ltx.txHash,
            blockNumber: ltx.blockNumber || null,
            from: ltx.from,
            to: ltx.to,
            value: ltx.value || '0 ETH',
            status: ltx.status || 'Confirmed',
            timestamp: ltx.timestamp || Date.now(),
          })
        }
      })

      // Merge DB Transactions (fallback)
      if (Array.isArray(dbTransactions)) {
        dbTransactions.forEach((dbTx) => {
          if (!allEvents.some(e => e.txHash?.toLowerCase() === dbTx.txHash?.toLowerCase())) {
            allEvents.push({
              id: `db-${dbTx.id || dbTx.txHash}`,
              type: 'transfer',
              label: 'Wallet Transfer',
              txHash: dbTx.txHash,
              blockNumber: null,
              from: dbTx.from,
              to: dbTx.to,
              value: `${dbTx.value || '0'} ETH`,
              status: dbTx.status || 'Confirmed',
              timestamp: new Date(dbTx.createdAt).getTime(),
            })
          }
        })
      }

      allEvents.sort((a, b) => b.timestamp - a.timestamp)
      setLiveTxs(allEvents)
    } catch (globalErr) {
      console.error('Failed to load live transactions:', globalErr)
    } finally {
      setLoading(false)
    }
  }, [publicClient, dbTransactions])

  useEffect(() => {
    fetchLiveTransactions()
    const interval = setInterval(fetchLiveTransactions, 12000)
    return () => clearInterval(interval)
  }, [fetchLiveTransactions])

  const copyToClipboard = (text, hash) => {
    navigator.clipboard.writeText(text)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const filteredTxs = liveTxs.filter(tx => {
    if (filter === 'all') return true
    return tx.type === filter
  })

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>
              Live Transactions
            </h1>
            <span
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: 'var(--green)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--ink-muted)' }}>
            Synced from Sepolia · Auto-updates every 12s
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLiveTransactions}
          disabled={loading}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
        >
          {loading ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--brand) transparent transparent' }} />
              Syncing…
            </>
          ) : (
            <>⟳ Sync Now</>
          )}
        </button>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto shadow-sm"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {[
            { key: 'all',      label: `All (${liveTxs.length})` },
            { key: 'donation', label: `Donations (${liveTxs.filter(x => x.type === 'donation').length})` },
            { key: 'create',   label: `Launches (${liveTxs.filter(x => x.type === 'create').length})` },
            { key: 'release',  label: `Releases (${liveTxs.filter(x => x.type === 'release').length})` },
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                backgroundColor: filter === f.key ? 'var(--brand)' : 'transparent',
                color: filter === f.key ? '#ffffff' : 'var(--ink-muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono font-bold" style={{ color: 'var(--ink-muted)' }}>
          {filteredTxs.length} events
        </span>
      </div>

      {/* ── Transactions List ── */}
      <div className="card shadow-md p-0 overflow-hidden">
        {loading && liveTxs.length === 0 ? (
          <div className="py-16 text-center space-y-2" style={{ color: 'var(--ink-muted)' }}>
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: 'var(--brand) transparent transparent' }} />
            <p className="text-sm font-semibold mt-3">Scanning Sepolia blocks…</p>
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="py-14 text-center space-y-2 px-6">
            <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>No transactions found for this filter.</p>
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Transactions appear once campaigns are deployed, backed, or released.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className="border-b text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--bg-surface-3)', borderColor: 'var(--border)', color: 'var(--ink-muted)' }}
                >
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Tx Hash</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To / Campaign</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono" style={{ borderColor: 'var(--border)' }}>
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-700/10 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold" style={{ color: 'var(--ink)' }}>
                      {tx.label}
                    </td>
                    <td className="py-3 px-4">
                      {tx.txHash ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline font-bold"
                          >
                            {shortHash(tx.txHash)}
                          </a>
                          <button
                            onClick={() => copyToClipboard(tx.txHash, tx.id)}
                            className="text-[10px] p-1 rounded hover:bg-slate-700/20"
                            style={{ color: 'var(--ink-muted)' }}
                            title="Copy Hash"
                          >
                            {copiedHash === tx.id ? '✓' : '⎘'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)' }}>State Indexed</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium" style={{ color: 'var(--ink)' }}>
                      {shortAddr(tx.from)}
                    </td>
                    <td className="py-3 px-4 font-medium" style={{ color: 'var(--ink)' }}>
                      {tx.campaignTitle ? (
                        <span className="font-sans font-bold">{tx.campaignTitle}</span>
                      ) : (
                        shortAddr(tx.to)
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      <div className="flex items-center gap-1">
                        <EthLogo size={13} />
                        <span style={{ color: 'var(--ink)' }}>{tx.value}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <span className="badge badge-green text-[10px]">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionsPage
