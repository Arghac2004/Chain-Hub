import React, { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, formatEther, isAddress, getAddress } from 'viem'
import {
  CAMPAIGN_FACTORY_ADDRESS,
  CAMPAIGN_FACTORY_ABI,
  CAMPAIGN_ABI,
} from '../config/contracts.js'
import { EthLogo } from '../components/TokenLogo.js'

function shortAddr(addr) {
  if (!addr || !isAddress(addr)) return '—'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function CampaignManagerPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [activeTab, setActiveTab] = useState('list') // 'list' | 'my_rewards' | 'create'

  const [adminAddress, setAdminAddress] = useState('')
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [txPending, setTxPending] = useState(false)
  const [msg, setMsg] = useState(null)

  // Create Campaign Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetGoalEth, setTargetGoalEth] = useState('')
  const [referralCode, setReferralCode] = useState('')

  // Join by Referral Input
  const [joinReferralInput, setJoinReferralInput] = useState('')
  const [joinAmount, setJoinAmount] = useState('0.001')
  const [cardAmounts, setCardAmounts] = useState({})

  const customAdmin = localStorage.getItem('custom_admin_address')
  const activeAdminAddr = customAdmin || adminAddress

  const isDeveloperAccount = Boolean(
    address && activeAdminAddr && address.toLowerCase() === activeAdminAddr.toLowerCase()
  )

  // Load all campaigns from chain
  const loadCampaigns = useCallback(async () => {
    if (!publicClient || !CAMPAIGN_FACTORY_ADDRESS || !isAddress(CAMPAIGN_FACTORY_ADDRESS)) {
      setCampaigns([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const localAdmin = localStorage.getItem('custom_admin_address')
      if (localAdmin && isAddress(localAdmin)) {
        setAdminAddress(localAdmin)
      } else {
        const adminVal = await publicClient.readContract({
          address: CAMPAIGN_FACTORY_ADDRESS,
          abi: CAMPAIGN_FACTORY_ABI,
          functionName: 'admin',
        }).catch(() => '')
        if (adminVal && isAddress(adminVal)) setAdminAddress(adminVal)
      }

      let deployedSet = new Set()
      try {
        const list = await publicClient.readContract({
          address: CAMPAIGN_FACTORY_ADDRESS,
          abi: CAMPAIGN_FACTORY_ABI,
          functionName: 'getAllCampaigns',
        })
        if (Array.isArray(list)) list.forEach(a => isAddress(a) && deployedSet.add(getAddress(a)))
      } catch (e) {
        console.warn('getAllCampaigns fallback:', e.message)
      }

      const deployed = Array.from(deployedSet)
      if (deployed.length === 0) {
        setCampaigns([])
        setLoading(false)
        return
      }

      const safeBig = (v) => {
        try { return BigInt(String(v ?? 0)) } catch { return 0n }
      }

      const results = await Promise.all(
        deployed.map(async (campAddr) => {
          try {
            const [
              rTitle, rDesc, rRef1, rRef2,
              rTarget1, rTarget2, rTotal, rCount,
              rOrg, rManager,
              rActive, rCompleted, rDeleted, rBalance
            ] = await Promise.all([
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'title' }).catch(() => ''),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'description' }).catch(() => ''),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'rootReferralCode' }).catch(() => ''),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'referralCode' }).catch(() => ''),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'targetAmount' }).catch(() => 0n),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'targetAmountInWei' }).catch(() => 0n),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'totalCollected' }).catch(() => 0n),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'participantCount' }).catch(() => 0),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'organizer' }).catch(() => ''),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'manager' }).catch(() => ''),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'isActive' }).catch(() => true),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'isCompleted' }).catch(() => false),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'isDeleted' }).catch(() => false),
              publicClient.getBalance({ address: campAddr }).catch(() => 0n),
            ])

            const titleVal = rTitle || ''
            const descVal = rDesc || ''
            const refVal = rRef1 || rRef2 || ''
            const targetVal = safeBig(rTarget1 || rTarget2)
            const totalVal = safeBig(rTotal)
            const countVal = Number(rCount || 0)
            const organizerVal = rOrg || rManager || ''
            const activeVal = Boolean(rActive)
            const isCompletedVal = Boolean(rCompleted)
            const isDeletedVal = Boolean(rDeleted)
            const balVal = safeBig(rBalance)

            // Read Current User Member Data if connected
            let userMemberData = null
            if (address && isAddress(address)) {
              try {
                const mem = await publicClient.readContract({
                  address: campAddr,
                  abi: CAMPAIGN_ABI,
                  functionName: 'members',
                  args: [address],
                })
                if (mem && (mem[0] || mem.userAddress)) {
                  userMemberData = {
                    userAddress: mem[0] || mem.userAddress,
                    referrer: mem[1] || mem.referrer,
                    referralCode: mem[2] || mem.referralCode,
                    directReferralCount: Number(mem[3] ?? mem.directReferralCount ?? 0),
                    tierLevel: Number(mem[4] ?? mem.tierLevel ?? 0),
                    contributionEth: formatEther(safeBig(mem[5] ?? mem.contribution)),
                    earnedAmountEth: formatEther(safeBig(mem[6] ?? mem.earnedAmount)),
                    isQualified: Boolean(mem[7] ?? mem.isQualified),
                    qualifiedPercentage: Number(mem[8] ?? mem.qualifiedPercentage ?? 0),
                  }
                }
              } catch {
                // Not a member yet
              }
            }

            return {
              address: campAddr,
              organizer: organizerVal,
              title: String(titleVal || `Campaign #${shortAddr(campAddr)}`),
              description: String(descVal || ''),
              referralCode: String(refVal || ''),
              targetAmountEth: formatEther(safeBig(targetVal)),
              totalCollectedEth: formatEther(safeBig(totalVal)),
              balanceEth: formatEther(safeBig(balVal)),
              participantCount: Number(countVal || 0),
              isCompleted: Boolean(isCompletedVal),
              isDeleted: Boolean(isDeletedVal),
              isActive: Boolean(activeVal),
              userMemberData,
            }
          } catch (err) {
            console.error('Campaign parse error:', campAddr, err)
            return null
          }
        })
      )

      const localDeleted = JSON.parse(localStorage.getItem('deleted_campaigns') || '[]')
      const finalCampaigns = results
        .filter(Boolean)
        .filter(c => !c.isDeleted && !localDeleted.includes(c.address.toLowerCase()))

      setCampaigns(finalCampaigns)
    } catch (err) {
      console.error('Load campaigns error:', err)
      setMsg({ type: 'error', text: 'Failed to load campaigns: ' + (err.shortMessage || err.message) })
    } finally {
      setLoading(false)
    }
  }, [publicClient, address])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  // Join Campaign by Referral
  const handleJoinByReferral = async (e) => {
    e.preventDefault()
    if (!walletClient || !address) {
      setMsg({ type: 'error', text: 'Please connect your Web3 wallet.' })
      return
    }

    const cleanRef = joinReferralInput.trim().toUpperCase()
    if (!cleanRef) {
      setMsg({ type: 'error', text: 'Please enter a valid Referral Code.' })
      return
    }

    const pledgeEth = parseFloat(joinAmount)
    if (isNaN(pledgeEth) || pledgeEth <= 0) {
      setMsg({ type: 'error', text: 'Please enter a valid ETH contribution amount.' })
      return
    }

    setTxPending(true)
    setMsg({ type: 'info', text: 'Verifying referral code and joining campaign...' })

    try {
      const camp = campaigns.find(c => c.referralCode === cleanRef) || campaigns[0]
      if (!camp) throw new Error('No active campaign matched this referral code.')

      const hash = await walletClient.writeContract({
        address: camp.address,
        abi: CAMPAIGN_ABI,
        functionName: 'joinWithReferral',
        args: [cleanRef],
        value: parseEther(joinAmount),
      })

      await publicClient.waitForTransactionReceipt({ hash })
      setMsg({
        type: 'success',
        text: `Successfully joined ${camp.title}! You backed ${joinAmount} ETH.`,
      })

      setJoinReferralInput('')
      await loadCampaigns()
    } catch (err) {
      console.error('Join error:', err)
      setMsg({ type: 'error', text: err.shortMessage || err.message || 'Transaction failed.' })
    } finally {
      setTxPending(false)
    }
  }

  // Create Campaign
  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    if (!walletClient || !address) {
      setMsg({ type: 'error', text: 'Please connect your Web3 wallet.' })
      return
    }
    if (!referralCode.trim()) {
      setMsg({ type: 'error', text: 'Root referral code is required.' })
      return
    }

    setTxPending(true)
    setMsg({ type: 'info', text: 'Deploying platform campaign contract on-chain...' })

    try {
      const hash = await walletClient.writeContract({
        address: CAMPAIGN_FACTORY_ADDRESS,
        abi: CAMPAIGN_FACTORY_ABI,
        functionName: 'createCampaign',
        args: [
          title.trim(),
          description.trim() || '',
          referralCode.trim().toUpperCase(),
          parseEther(targetGoalEth),
        ],
      })

      await publicClient.waitForTransactionReceipt({ hash })
      setTitle('')
      setDescription('')
      setTargetGoalEth('')
      setReferralCode('')

      setMsg({
        type: 'success',
        text: 'Campaign deployed successfully!',
      })

      setActiveTab('list')
      await loadCampaigns()
    } catch (err) {
      console.error('Deploy campaign error:', err)
      setMsg({ type: 'error', text: err.shortMessage || err.message || 'Deploy failed.' })
    } finally {
      setTxPending(false)
    }
  }

  // Back a specific campaign card directly
  const handleDirectBack = async (camp) => {
    if (!walletClient || !address) {
      setMsg({ type: 'error', text: 'Please connect your Web3 wallet.' })
      return
    }

    const amount = cardAmounts[camp.address] || '0.001'
    setTxPending(true)
    setMsg({ type: 'info', text: `Contributing ${amount} ETH to ${camp.title}...` })

    try {
      const hash = await walletClient.writeContract({
        address: camp.address,
        abi: CAMPAIGN_ABI,
        functionName: 'joinWithReferral',
        args: [camp.referralCode || 'ROOT001'],
        value: parseEther(amount),
      })

      await publicClient.waitForTransactionReceipt({ hash })
      setMsg({ type: 'success', text: `Successfully contributed ${amount} ETH to ${camp.title}!` })
      await loadCampaigns()
    } catch (err) {
      setMsg({ type: 'error', text: err.shortMessage || err.message || 'Contribution failed.' })
    } finally {
      setTxPending(false)
    }
  }

  const userBackedCampaigns = campaigns.filter(c => c.userMemberData)

  return (
    <div className="space-y-6">
      
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>
            Campaigns & Community Grants
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--ink-muted)' }}>
            Back community projects, earn multi-tier referral commissions, and launch Web3 grants.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCampaigns}
          disabled={loading}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
        >
          <span>{loading ? 'Refreshing...' : '⟳ Refresh'}</span>
        </button>
      </div>

      {/* Alert Banner */}
      {msg && (
        <div
          className="p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow"
          style={{
            backgroundColor: msg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${msg.type === 'error' ? 'var(--red)' : 'var(--green)'}`,
            color: msg.type === 'error' ? 'var(--red)' : 'var(--green)',
          }}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold opacity-70 hover:opacity-100 ml-2">✕</button>
        </div>
      )}

      {/* ── Sub Navigation Tabs ── */}
      <div
        className="p-1.5 rounded-2xl flex flex-wrap gap-1.5 shadow-sm"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'list'
              ? 'bg-indigo-600 text-white shadow'
              : 'hover:bg-slate-700/10'
          }`}
          style={activeTab !== 'list' ? { color: 'var(--ink-muted)' } : {}}
        >
          Live Campaigns ({campaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my_rewards')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'my_rewards'
              ? 'bg-indigo-600 text-white shadow'
              : 'hover:bg-slate-700/10'
          }`}
          style={activeTab !== 'my_rewards' ? { color: 'var(--ink-muted)' } : {}}
        >
          My Referral Earnings ({userBackedCampaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-indigo-600 text-white shadow'
              : 'hover:bg-slate-700/10'
          }`}
          style={activeTab !== 'create' ? { color: 'var(--ink-muted)' } : {}}
        >
          + Deploy Campaign
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: LIVE CAMPAIGNS LIST & JOIN BY REFERRAL
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          
          {/* Join by Referral Code Banner */}
          <div
            className="card p-6 space-y-3 shadow-md"
            style={{
              background: 'linear-gradient(135deg, var(--bg-surface), var(--brand-dim))',
              border: '1px solid var(--border-2)',
            }}
          >
            <div>
              <h3 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
                Join Campaign via Referral Code
              </h3>
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                Enter a referral code from a community backer to contribute ETH and generate your personal commission code.
              </p>
            </div>

            <form onSubmit={handleJoinByReferral} className="flex flex-col sm:flex-row gap-3 pt-1">
              <input
                type="text"
                required
                disabled={isDeveloperAccount}
                placeholder="Referral Code (e.g. ROOT001)"
                value={joinReferralInput}
                onChange={(e) => setJoinReferralInput(e.target.value.toUpperCase())}
                className="input-field flex-1 font-mono uppercase text-xs"
              />
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                disabled={isDeveloperAccount}
                value={joinAmount}
                onChange={(e) => setJoinAmount(e.target.value)}
                placeholder="ETH amount"
                className="input-field w-full sm:w-36 font-mono text-xs"
              />
              <button
                type="submit"
                disabled={txPending || !isConnected || isDeveloperAccount}
                className="btn btn-primary text-xs py-2.5 px-6 font-bold shadow"
              >
                {txPending ? 'Processing...' : 'Join & Back'}
              </button>
            </form>
          </div>

          {/* Campaigns Grid */}
          {loading && campaigns.length === 0 ? (
            <div className="card text-center py-16 text-xs" style={{ color: 'var(--ink-muted)' }}>
              Loading on-chain campaigns from Sepolia...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="card text-center py-16 space-y-2 shadow-sm">
              <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>No campaigns active yet.</p>
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Deploy your first grant in the "Deploy Campaign" tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.map((camp) => {
                const target = parseFloat(camp.targetAmountEth) || 0
                const raised = parseFloat(camp.totalCollectedEth) || 0
                const pct = target > 0 ? Math.min(100, (raised / target) * 100) : 0
                const curVal = cardAmounts[camp.address] || '0.001'

                return (
                  <div
                    key={camp.address}
                    className="card space-y-4 shadow-md transition-all hover:border-indigo-500/40"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>{camp.title}</h3>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                          Organizer: <span className="text-indigo-400 font-bold">{shortAddr(camp.organizer)}</span>
                        </p>
                      </div>
                      <span className="badge badge-green text-[10px]">
                        {camp.isCompleted ? 'Funds Released' : (target > 0 && raised >= target) ? 'Goal Met' : 'Active'}
                      </span>
                    </div>

                    {camp.description && (
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--ink-muted)' }}>
                        {camp.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <div className="flex items-center gap-1">
                          <EthLogo size={13} />
                          <span style={{ color: 'var(--ink)' }}>{raised.toFixed(4)} ETH raised</span>
                        </div>
                        <span style={{ color: 'var(--brand)' }}>
                          Goal: {camp.targetAmountEth} ETH ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, var(--brand), var(--green))',
                          }}
                        />
                      </div>
                    </div>

                    {/* Backing Section */}
                    <div className="pt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                      <div className="text-xs font-mono" style={{ color: 'var(--ink-muted)' }}>
                        Root Code: <b className="text-indigo-400">{camp.referralCode}</b>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={curVal}
                          onChange={(e) => setCardAmounts({ ...cardAmounts, [camp.address]: e.target.value })}
                          className="input-field w-24 py-1 px-2 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleDirectBack(camp)}
                          disabled={txPending || !isConnected}
                          className="btn btn-primary text-xs py-1.5 px-3.5 font-bold shadow"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: MY REFERRAL REWARDS & CODES
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'my_rewards' && (
        <div className="space-y-6">
          {userBackedCampaigns.length === 0 ? (
            <div className="card text-center py-16 space-y-2 shadow-sm">
              <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>No active referral rewards found.</p>
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>Back any campaign in the "Live Campaigns" tab to generate your personal reward code.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {userBackedCampaigns.map(c => {
                const u = c.userMemberData
                const reqInvites = u.tierLevel === 1 ? 2 : u.tierLevel === 2 ? 3 : 3
                const targetPct = u.tierLevel === 1 ? 5 : u.tierLevel === 2 ? 10 : 3
                const invitesProgress = Math.min(100, (u.directReferralCount / reqInvites) * 100)

                return (
                  <div key={c.address} className="card space-y-4 shadow-md">
                    <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <h4 className="font-extrabold text-sm truncate" style={{ color: 'var(--ink)' }}>{c.title}</h4>
                      <span className="badge badge-green text-[10px]">Tier Level {u.tierLevel}</span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ink-muted)' }}>My Auto-Generated Referral Code:</p>
                      <div className="flex items-center justify-between p-2.5 rounded-xl font-mono text-xs" style={{ backgroundColor: 'var(--bg-surface-3)', border: '1px solid var(--border)' }}>
                        <span className="font-bold text-indigo-400 tracking-wider text-sm">{u.referralCode}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(u.referralCode)
                            setMsg({ type: 'success', text: `Copied referral code: ${u.referralCode}` })
                          }}
                          className="btn btn-secondary text-[10px] py-1 px-2.5 font-bold"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span style={{ color: 'var(--ink-muted)' }}>Direct Invites:</span>
                        <span style={{ color: 'var(--ink)' }}>{u.directReferralCount} / {reqInvites} required</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${invitesProgress}%`,
                            background: u.isQualified ? 'var(--green)' : 'var(--brand)',
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] pt-0.5">
                        <span style={{ color: 'var(--ink-muted)' }}>Reward Status:</span>
                        <span className={u.isQualified ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {u.isQualified ? `${targetPct}% Qualified` : `Need ${Math.max(0, reqInvites - u.directReferralCount)} more invites`}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t flex justify-between text-xs font-mono" style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}>
                      <span>Pledged: <b style={{ color: 'var(--ink)' }}>{u.contributionEth} ETH</b></span>
                      <span>Earned: <b className="text-emerald-400">{u.earnedAmountEth} ETH</b></span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: DEPLOY PLATFORM CAMPAIGN
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'create' && (
        <div className="max-w-xl mx-auto">
          <div className="card space-y-4 shadow-lg p-6 sm:p-7">
            <div className="border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-lg font-extrabold" style={{ color: 'var(--ink)' }}>
                Deploy New Web3 Campaign
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                Create an on-chain grant with multi-tier smart contract referral incentives.
              </p>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Web3 DeFi Grant 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Goals, milestones, and deliverables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                  Root Referral Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ROOT001"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="input-field font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                  Target Goal (ETH) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="e.g. 0.05"
                  value={targetGoalEth}
                  onChange={(e) => setTargetGoalEth(e.target.value)}
                  className="input-field font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={txPending || !isConnected}
                className="btn btn-primary w-full py-3 text-xs font-bold shadow-lg"
              >
                {txPending ? 'Deploying...' : 'Deploy Campaign on Sepolia'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default CampaignManagerPage