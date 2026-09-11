import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseEther, formatEther, isAddress, getAddress } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import {
  CAMPAIGN_FACTORY_ADDRESS,
  CAMPAIGN_FACTORY_ABI,
  CAMPAIGN_ABI,
} from '../config/contracts.js'
import {
  P2P_CONTRACT_ADDRESS,
  P2P_ABI,
} from '../config/p2pContract.js'
import { useTheme } from '../hooks/ThemeContext.js'
import { EthLogo, HubLogo, UsdtLogo, TokenLogo } from '../components/TokenLogo.js'

function shortAddr(addr) {
  if (!addr || !isAddress(addr)) return '—'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const DEFAULT_ADMIN_DEV_KEY = 'ADMIN2026'
export const ACCOUNT_5_ADMIN = '0x3Dc08222B824a86f2d15A1b8e6D7C0C5BB5aD5C9'

// 3D Geometric Shield Logo for Admin Portal
function AdminShieldLogo() {
  return (
    <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
      <svg width="40" height="40" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="adminGrad" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="45%" stopColor="#4f46e5" />
            <stop offset="75%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="adminSpecular" x1="6" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="32" height="32" rx="9" fill="url(#adminGrad)" />
        <rect x="2" y="2" width="32" height="32" rx="9" stroke="url(#adminSpecular)" strokeWidth="1.2" />
        <path
          d="M18 9L11 12.5V18.5C11 23 14 26.5 18 28C22 26.5 25 23 25 18.5V12.5L18 9Z"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M15 18L17.5 20.5L22 15.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function AdminPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { mode, setMode } = useTheme()

  // Admin Account Configuration 
  const [adminAddress, setAdminAddress] = useState(() => {
    return localStorage.getItem('custom_admin_address') || ACCOUNT_5_ADMIN
  })
  const [customAdminInput, setCustomAdminInput] = useState('')
  const [generatedAccount, setGeneratedAccount] = useState(null)
  const [activeSetupTab, setActiveSetupTab] = useState('paste') // 'paste' | 'generate'

  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [txPending, setTxPending] = useState(false)
  const [msg, setMsg] = useState(null)

  // Admin Session Login State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('chainhub_admin_session') === 'authenticated'
  })
  const [accessKeyInput, setAccessKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loginError, setLoginError] = useState('')

  // View mode tab: 'p2p_disputes' | 'payouts' | 'manage' | 'security'
  const [adminViewTab, setAdminViewTab] = useState('p2p_disputes')
  const [payoutSearch, setPayoutSearch] = useState('')
  const [payoutFilter, setPayoutFilter] = useState('all')

  // P2P Disputes Management State
  const [p2pDisputesList, setP2pDisputesList] = useState([])
  const [p2pContractAdmin, setP2pContractAdmin] = useState('')
  const [p2pKycInput, setP2pKycInput] = useState('')
  const [p2pLoading, setP2pLoading] = useState(false)
  const [p2pTransferAdminInput, setP2pTransferAdminInput] = useState(ACCOUNT_5_ADMIN)

  // Selected campaign for viewing detailed member tree & earnings preview
  const [selectedCampaignAddr, setSelectedCampaignAddr] = useState(null)
  const [releaseModalOpen, setReleaseModalOpen] = useState(false)

  // Create Campaign Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetGoalEth, setTargetGoalEth] = useState('')
  const [referralCode, setReferralCode] = useState('')

  const userAccount = address ? address.toLowerCase() : ''
  const isDesignatedAdmin = Boolean(
    userAccount && adminAddress && userAccount === adminAddress.toLowerCase()
  )

  // Set Admin Address 
  const handleSetAdminAddress = (addrToSet) => {
    const cleanAddr = (addrToSet || customAdminInput).trim()
    if (!cleanAddr || !isAddress(cleanAddr)) {
      setLoginError('Please enter a valid Ethereum address (0x...).')
      return
    }
    const formatted = getAddress(cleanAddr)
    setAdminAddress(formatted)
    localStorage.setItem('custom_admin_address', formatted)
    setCustomAdminInput('')
    setLoginError('')
    setMsg({ type: 'success', text: `Designated Admin updated to: ${formatted}` })
  }

  // Generate New Random Admin Account 
  const handleGenerateAdminAccount = () => {
    try {
      const pKey = generatePrivateKey()
      const account = privateKeyToAccount(pKey)
      setGeneratedAccount({
        address: account.address,
        privateKey: pKey,
      })
      setMsg({ type: 'info', text: 'New Admin wallet keypair generated. Store your private key securely.' })
    } catch (err) {
      console.error('Account generation error:', err)
      setLoginError('Failed to generate keypair: ' + err.message)
    }
  }

  const handleApplyGeneratedAccount = () => {
    if (!generatedAccount) return
    const formatted = getAddress(generatedAccount.address)
    setAdminAddress(formatted)
    localStorage.setItem('custom_admin_address', formatted)
    setLoginError('')
    setMsg({ type: 'success', text: `Admin set to: ${formatted}. Connect this wallet in MetaMask to login.` })
  }

  // Load all campaigns from chain
  const loadCampaigns = useCallback(async () => {
    if (!publicClient || !CAMPAIGN_FACTORY_ADDRESS || !isAddress(CAMPAIGN_FACTORY_ADDRESS)) {
      setCampaigns([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const adminVal = await publicClient.readContract({
        address: CAMPAIGN_FACTORY_ADDRESS,
        abi: CAMPAIGN_FACTORY_ABI,
        functionName: 'admin',
      }).catch(() => '')
      
      const localAdmin = localStorage.getItem('custom_admin_address')
      if (localAdmin && isAddress(localAdmin)) {
        setAdminAddress(localAdmin)
      } else if (adminVal && isAddress(adminVal)) {
        setAdminAddress(adminVal)
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
              rAdmin, rManager, rOrg,
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
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'admin' }).catch(() => ''),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'manager' }).catch(() => ''),
              publicClient.readContract({ address: campAddr, abi: CAMPAIGN_ABI, functionName: 'organizer' }).catch(() => ''),
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
            const adminVal = rAdmin || ''
            const managerVal = rManager || ''
            const organizerVal = rOrg || managerVal
            const activeVal = Boolean(rActive)
            const isCompletedVal = Boolean(rCompleted)
            const isDeletedVal = Boolean(rDeleted)
            const balVal = safeBig(rBalance)

            // Read Members
            let membersList = []
            try {
              const rawMembers = await publicClient.readContract({
                address: campAddr,
                abi: CAMPAIGN_ABI,
                functionName: 'getAllMembers',
              })
              if (Array.isArray(rawMembers)) {
                membersList = rawMembers.map(m => ({
                  userAddress: m.userAddress || m[0],
                  referrer: m.referrer || m[1],
                  referralCode: m.referralCode || m[2],
                  directReferralCount: Number(m.directReferralCount ?? m[3] ?? 0),
                  tierLevel: Number(m.tierLevel ?? m[4] ?? 0),
                  contributionEth: formatEther(safeBig(m.contribution ?? m[5])),
                  earnedAmountEth: formatEther(safeBig(m.earnedAmount ?? m[6])),
                  isQualified: Boolean(m.isQualified ?? m[7]),
                  qualifiedPercentage: Number(m.qualifiedPercentage ?? m[8] ?? 0),
                }))
              }
            } catch {
              // Backward compatibility
            }

            const effectiveBase = isCompletedVal || balVal === 0n ? totalVal : balVal
            let earningsPreview = {
              qualifiedMembers: [],
              percentages: [],
              amountsEth: [],
              organizerCutEth: formatEther(effectiveBase),
              totalBalanceEth: formatEther(effectiveBase),
            }

            if (membersList && membersList.length > 0 && effectiveBase > 0n) {
              let totalCutsWei = 0n
              let qm = []
              let pcts = []
              let amts = []

              membersList.forEach(m => {
                if (m.isQualified && m.qualifiedPercentage > 0) {
                  const cutWei = (effectiveBase * BigInt(m.qualifiedPercentage)) / 100n
                  qm.push(m.userAddress)
                  pcts.push(m.qualifiedPercentage)
                  amts.push(formatEther(cutWei))
                  totalCutsWei += cutWei
                }
              })

              const orgCutWei = effectiveBase > totalCutsWei ? effectiveBase - totalCutsWei : 0n
              earningsPreview = {
                qualifiedMembers: qm,
                percentages: pcts,
                amountsEth: amts,
                organizerCutEth: formatEther(orgCutWei),
                totalBalanceEth: formatEther(effectiveBase),
              }
            }

            return {
              address: campAddr,
              admin: adminVal,
              manager: managerVal,
              organizer: organizerVal || managerVal,
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
              members: membersList,
              earningsPreview,
            }
          } catch (err) {
            console.error('Campaign load error:', campAddr, err)
            return null
          }
        })
      )

      const localDeleted = JSON.parse(localStorage.getItem('deleted_campaigns') || '[]')
      const finalCampaigns = results
        .filter(Boolean)
        .filter(c => !c.isDeleted && !localDeleted.includes(c.address.toLowerCase()))

      setCampaigns(finalCampaigns)
      if (finalCampaigns.length > 0 && !selectedCampaignAddr) {
        setSelectedCampaignAddr(finalCampaigns[0].address)
      }
    } catch (err) {
      console.error('Load campaigns error:', err)
      setMsg({ type: 'error', text: 'Failed to load campaigns: ' + (err.shortMessage || err.message) })
    } finally {
      setLoading(false)
    }
  }, [publicClient, selectedCampaignAddr])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  // Handle Admin Login Authentication 
  const handleAdminLogin = (e) => {
    if (e) e.preventDefault()
    setLoginError('')

    if (!isConnected || !address) {
      setLoginError('Please connect your Web3 wallet.')
      return
    }

    if (!adminAddress) {
      setLoginError('Please set or generate a designated Admin Address below.')
      return
    }

    const key = accessKeyInput.trim()
    const validKey = localStorage.getItem('chainhub_admin_key') || DEFAULT_ADMIN_DEV_KEY

    if (!isDesignatedAdmin && key !== validKey) {
      setLoginError(`Wallet mismatch. Connected (${shortAddr(address)}) is not designated Admin (${shortAddr(adminAddress)}).`)
      return
    }

    setIsAdminLoggedIn(true)
    sessionStorage.setItem('chainhub_admin_session', 'authenticated')
    setMsg({ type: 'success', text: `Welcome, Administrator ${shortAddr(address)}. Session unlocked.` })
  }

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false)
    sessionStorage.removeItem('chainhub_admin_session')
    setMsg({ type: 'info', text: 'Admin session locked. Logged out successfully.' })
  }

  // Create Campaign 
  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    if (!walletClient || !address) {
      setMsg({ type: 'error', text: 'Please connect your Admin wallet.' })
      return
    }
    if (!referralCode.trim()) {
      setMsg({ type: 'error', text: 'Root referral code is required.' })
      return
    }

    setTxPending(true)
    setMsg({ type: 'info', text: 'Deploying platform campaign contract on-chain...' })

    const savedTitle = title.trim()
    const savedRef = referralCode.trim().toUpperCase()

    try {
      const hash = await walletClient.writeContract({
        address: CAMPAIGN_FACTORY_ADDRESS,
        abi: CAMPAIGN_FACTORY_ABI,
        functionName: 'createCampaign',
        args: [
          savedTitle,
          description.trim() || '',
          savedRef,
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
        text: `Platform Campaign "${savedTitle}" deployed successfully with root code: ${savedRef}`,
      })

      await loadCampaigns()
    } catch (err) {
      console.error('Create campaign error:', err)
      setMsg({ type: 'error', text: err.shortMessage || err.message || 'Campaign creation failed' })
    } finally {
      setTxPending(false)
    }
  }

  // Release funds with dynamic split
  const handleReleaseFunds = async (campAddress) => {
    if (!walletClient || !address) {
      setMsg({ type: 'error', text: 'Please connect your Admin wallet.' })
      return
    }

    setTxPending(true)
    setMsg({ type: 'info', text: 'Executing automated multi-tier distribution on-chain...' })

    try {
      const hash = await walletClient.writeContract({
        address: campAddress,
        abi: CAMPAIGN_ABI,
        functionName: 'releaseFundsWithDynamicSplit',
      })

      await publicClient.waitForTransactionReceipt({ hash })
      setMsg({ type: 'success', text: 'Funds successfully released and split among qualified members and organizer.' })
      setReleaseModalOpen(false)
      await loadCampaigns()
    } catch (err) {
      console.error('Release funds error:', err)
      setMsg({ type: 'error', text: err.shortMessage || err.message || 'Fund release failed' })
    } finally {
      setTxPending(false)
    }
  }

  // Delete Campaign
  const handleDeleteCampaign = async (campAddress) => {
    if (!window.confirm('Are you sure you want to delete and remove this campaign?')) return

    setTxPending(true)
    setMsg({ type: 'info', text: 'Archiving campaign...' })

    try {
      if (walletClient && address) {
        try {
          const hash = await walletClient.writeContract({
            address: campAddress,
            abi: CAMPAIGN_ABI,
            functionName: 'deleteCampaign',
          })
          await publicClient.waitForTransactionReceipt({ hash })
        } catch (contractErr) {
          console.warn('On-chain delete fallback:', contractErr.message)
        }
      }

      const currentDeleted = JSON.parse(localStorage.getItem('deleted_campaigns') || '[]')
      if (!currentDeleted.includes(campAddress.toLowerCase())) {
        currentDeleted.push(campAddress.toLowerCase())
        localStorage.setItem('deleted_campaigns', JSON.stringify(currentDeleted))
      }

      setMsg({ type: 'success', text: 'Campaign successfully deleted.' })
      if (selectedCampaignAddr === campAddress) {
        setSelectedCampaignAddr(null)
      }
      await loadCampaigns()
    } catch (err) {
      console.error('Delete error:', err)
      setMsg({ type: 'error', text: err.shortMessage || err.message || 'Delete failed' })
    } finally {
      setTxPending(false)
    }
  }

  // Load P2P Disputes
  const loadP2PData = useCallback(async () => {
    if (!publicClient || !P2P_CONTRACT_ADDRESS) return
    setP2pLoading(true)
    try {
      const cAdmin = await publicClient.readContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'admin',
      }).catch(() => '')
      if (cAdmin) setP2pContractAdmin(cAdmin)

      const list = []
      let idx = 0
      while (idx < 50) {
        try {
          const disputeId = await publicClient.readContract({
            address: P2P_CONTRACT_ADDRESS,
            abi: P2P_ABI,
            functionName: 'getDisputeids',
            args: [BigInt(idx)],
          })

          const info = await publicClient.readContract({
            address: P2P_CONTRACT_ADDRESS,
            abi: P2P_ABI,
            functionName: 'disputeinfo',
            args: [disputeId],
          })

          let bOrderData = null
          try {
            const bOrder = await publicClient.readContract({
              address: P2P_CONTRACT_ADDRESS,
              abi: P2P_ABI,
              functionName: 'buyOrderInfo',
              args: [info[1]],
            })
            bOrderData = {
              amount: formatEther(bOrder[2]),
              pair: Number(bOrder[3]),
              status: Number(bOrder[4]),
              bankTransferCode: bOrder[8],
              buyer: bOrder[9],
              seller: bOrder[10],
            }
          } catch (err) {
            console.warn('Could not read buy order info:', err)
          }

          list.push({
            disputeId: Number(disputeId),
            mainOrderId: Number(info[0]),
            buyOrderId: Number(info[1]),
            reason: info[2],
            status: Number(info[4]),
            approvedAdmin: info[3],
            bOrder: bOrderData,
          })
          idx++
        } catch {
          break
        }
      }
      setP2pDisputesList(list)
    } catch (err) {
      console.warn('Error loading P2P disputes:', err)
    } finally {
      setP2pLoading(false)
    }
  }, [publicClient])

  useEffect(() => {
    loadP2PData()
  }, [loadP2PData])

  const handleP2PRefundBuyer = async (disputeId) => {
    if (!walletClient || !address) return alert('Please connect Admin wallet.')
    setTxPending(true)
    setMsg({ type: 'info', text: `Executing refund to Buyer for Dispute #${disputeId}...` })
    try {
      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'refundToBuyer',
        args: [BigInt(disputeId)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setMsg({ type: 'success', text: `Dispute #${disputeId} resolved. Crypto refunded to Buyer.` })
      await loadP2PData()
    } catch (err) {
      setMsg({ type: 'error', text: err.shortMessage || err.message || 'Refund failed' })
    } finally {
      setTxPending(false)
    }
  }

  const handleP2PRefundSeller = async (disputeId) => {
    if (!walletClient || !address) return alert('Please connect Admin wallet.')
    setTxPending(true)
    setMsg({ type: 'info', text: `Executing return to Seller for Dispute #${disputeId}...` })
    try {
      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'refundToseller',
        args: [BigInt(disputeId)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setMsg({ type: 'success', text: `Dispute #${disputeId} resolved. Crypto returned to Seller.` })
      await loadP2PData()
    } catch (err) {
      setMsg({ type: 'error', text: err.shortMessage || err.message || 'Return failed' })
    } finally {
      setTxPending(false)
    }
  }

  const handleP2PApproveKYC = async () => {
    if (!walletClient || !address || !p2pKycInput.trim()) {
      return alert('Enter a valid wallet address to approve KYC.')
    }
    setTxPending(true)
    setMsg({ type: 'info', text: `Approving P2P KYC for ${shortAddr(p2pKycInput)}...` })
    try {
      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'setUser',
        args: [getAddress(p2pKycInput.trim()), 'KYC_APPROVED_ADMIN', 1n],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setMsg({ type: 'success', text: `KYC successfully approved for ${shortAddr(p2pKycInput)}.` })
      setP2pKycInput('')
    } catch (err) {
      setMsg({ type: 'error', text: err.shortMessage || err.message || 'KYC approval failed' })
    } finally {
      setTxPending(false)
    }
  }

  const handleTransferP2PAdmin = async () => {
    if (!walletClient || !address || !p2pTransferAdminInput.trim()) {
      return alert('Enter a target address for P2P admin.')
    }
    setTxPending(true)
    setMsg({ type: 'info', text: `Transferring P2P Contract Admin to ${shortAddr(p2pTransferAdminInput)}...` })
    try {
      const targetAdmin = getAddress(p2pTransferAdminInput.trim())
      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'start',
        args: [
          targetAdmin,
          targetAdmin,
          '0xFcEeEC79e9B5eBa627B1260Fba3469C10d3dD64f',
          '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000',
        ],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setMsg({ type: 'success', text: `P2P Contract Admin transferred to ${targetAdmin}.` })
      await loadP2PData()
    } catch (err) {
      setMsg({ type: 'error', text: err.shortMessage || err.message || 'Admin transfer failed' })
    } finally {
      setTxPending(false)
    }
  }

  const selectedCampaign = campaigns.find(c => c.address === selectedCampaignAddr) || campaigns[0]
  const totalRaisedAll = campaigns.reduce((acc, c) => acc + (parseFloat(c.totalCollectedEth) || 0), 0)
  const totalVaultBalance = campaigns.reduce((acc, c) => acc + (parseFloat(c.balanceEth) || 0), 0)

  // ══════════════════════════════════════════════════════════════
  // UNAUTHENTICATED LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen py-10 px-4 flex flex-col items-center justify-center">
        <div
          className="w-full max-w-lg p-7 sm:p-8 rounded-3xl space-y-6 shadow-2xl transition-all"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-2)',
            color: 'var(--ink)',
          }}
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <AdminShieldLogo />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>
              ChainHub Admin Portal
            </h1>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--ink-muted)' }}>
              Authenticate with your designated Admin wallet or developer master key to manage disputes, payouts, and protocol operations.
            </p>
          </div>

          {/* Error / Alert */}
          {loginError && (
            <div
              className="p-3 rounded-xl text-xs font-semibold flex items-center justify-between"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--red)', color: 'var(--red)' }}
            >
              <span>{loginError}</span>
              <button onClick={() => setLoginError('')} className="font-bold opacity-70 hover:opacity-100">✕</button>
            </div>
          )}

          {/* Live Wallet & Admin Status */}
          <div
            className="p-4 rounded-2xl space-y-2 text-xs"
            style={{ backgroundColor: 'var(--bg-surface-3)', border: '1px solid var(--border)' }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--ink-muted)' }}>Connected Wallet:</span>
              <span className="font-mono font-bold" style={{ color: 'var(--ink)' }}>
                {address ? shortAddr(address) : 'None'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--ink-muted)' }}>Designated Admin:</span>
              <span className="font-mono font-bold text-indigo-400">
                {shortAddr(adminAddress)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Authorization Status:</span>
              {isDesignatedAdmin ? (
                <span className="font-bold text-emerald-400">Match Verified</span>
              ) : (
                <span className="font-bold text-amber-400">Requires Key / Switch Wallet</span>
              )}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                Developer Passkey (Optional if wallet matches)
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="input-field pr-10 text-xs font-mono"
                  placeholder="Enter ADMIN2026 or developer key"
                  value={accessKeyInput}
                  onChange={(e) => setAccessKeyInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full py-3 text-xs font-bold shadow-lg"
            >
              Sign In to Admin Portal
            </button>
          </form>

          {/* Quick Demo Access Button */}
          <button
            type="button"
            onClick={() => {
              setAccessKeyInput(DEFAULT_ADMIN_DEV_KEY)
              setIsAdminLoggedIn(true)
              sessionStorage.setItem('chainhub_admin_session', 'authenticated')
            }}
            className="w-full py-2.5 rounded-xl text-xs font-bold transition-all text-center"
            style={{
              backgroundColor: 'var(--brand-dim)',
              color: 'var(--brand)',
              border: '1px solid var(--border)',
            }}
          >
            One-Click Admin Demo Login
          </button>

          {/* Bottom Links */}
          <div className="flex items-center justify-between pt-2 text-xs border-t" style={{ borderColor: 'var(--border)' }}>
            <Link to="/" className="font-semibold hover:underline" style={{ color: 'var(--ink-muted)' }}>
              ← Return to Public Site
            </Link>
            <div className="flex items-center gap-2">
              <appkit-button label="Connect Wallet" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════
  // AUTHENTICATED ADMIN DASHBOARD
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      
      {/* ── 1. Top Admin Navigation Header ── */}
      <div
        className="p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg transition-all"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-2)',
        }}
      >
        <div className="flex items-center gap-3.5">
          <AdminShieldLogo />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: 'var(--ink)' }}>
                ChainHub Admin Portal
              </h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: 'var(--green)',
                }}
              >
                Root Active
              </span>
            </div>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--ink-muted)' }}>
              Logged Admin: <span className="font-bold text-indigo-400">{shortAddr(address || adminAddress)}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons & Theme Controls */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-end">
          {/* Quick Theme Toggle */}
          <button
            type="button"
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
            className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Toggle Dark / Light Theme"
          >
            <span style={{ color: 'var(--brand)' }}>
              {mode === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </span>
            <span className="hidden sm:inline capitalize">{mode} Mode</span>
          </button>

          {/* Sepolia Indicator */}
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ backgroundColor: 'var(--bg-surface-3)', border: '1px solid var(--border)', color: 'var(--ink)' }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sepolia Testnet</span>
          </div>

          <Link
            to="/"
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1"
          >
            <span>Public Site</span>
            <span>→</span>
          </Link>

          <button
            type="button"
            onClick={handleAdminLogout}
            className="btn text-xs py-2 px-3.5 font-bold rounded-xl transition-all"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--red)',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Message / Notification Banner */}
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

      {/* ── 2. Standardized Stat Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="card space-y-1 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
            Platform Campaigns
          </p>
          <p className="text-2xl font-black font-mono" style={{ color: 'var(--ink)' }}>
            {campaigns.length}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="card space-y-1 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
            Total ETH Raised
          </p>
          <div className="flex items-center gap-1.5">
            <EthLogo size={18} />
            <p className="text-2xl font-black font-mono" style={{ color: 'var(--ink)' }}>
              {totalRaisedAll.toFixed(4)} ETH
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card space-y-1 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
            Vault Balance
          </p>
          <div className="flex items-center gap-1.5">
            <EthLogo size={18} />
            <p className="text-2xl font-black font-mono text-emerald-400">
              {totalVaultBalance.toFixed(4)} ETH
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="card space-y-1 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
            Account Role
          </p>
          <p className="text-base font-extrabold text-indigo-400">
            Master Administrator
          </p>
          <p className="text-[11px] font-mono truncate" style={{ color: 'var(--ink-muted)' }}>
            Designated: {shortAddr(adminAddress)}
          </p>
        </div>
      </div>

      {/* ── 3. Navigation Tab Switcher ── */}
      <div
        className="p-1.5 rounded-2xl flex flex-wrap gap-1.5 shadow-sm"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <button
          type="button"
          onClick={() => setAdminViewTab('p2p_disputes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminViewTab === 'p2p_disputes'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'hover:bg-slate-700/10'
          }`}
          style={adminViewTab !== 'p2p_disputes' ? { color: 'var(--ink-muted)' } : {}}
        >
          <span>P2P Dispute Resolution Desk</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold"
            style={{
              backgroundColor: adminViewTab === 'p2p_disputes' ? 'rgba(255,255,255,0.25)' : 'rgba(245, 158, 11, 0.2)',
              color: adminViewTab === 'p2p_disputes' ? '#ffffff' : 'var(--amber)',
            }}
          >
            {p2pDisputesList.filter(d => d.status === 2).length} Open
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminViewTab('payouts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminViewTab === 'payouts'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'hover:bg-slate-700/10'
          }`}
          style={adminViewTab !== 'payouts' ? { color: 'var(--ink-muted)' } : {}}
        >
          <span>Campaign Payouts</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
            style={{
              backgroundColor: adminViewTab === 'payouts' ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface-3)',
              color: adminViewTab === 'payouts' ? '#ffffff' : 'var(--ink)',
            }}
          >
            {campaigns.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminViewTab('manage')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminViewTab === 'manage'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'hover:bg-slate-700/10'
          }`}
          style={adminViewTab !== 'manage' ? { color: 'var(--ink-muted)' } : {}}
        >
          <span>Campaign Manager</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminViewTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            adminViewTab === 'security'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'hover:bg-slate-700/10'
          }`}
          style={adminViewTab !== 'security' ? { color: 'var(--ink-muted)' } : {}}
        >
          <span>Admin Security & Keys</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: P2P DISPUTE RESOLUTION & ESCROW ARBITER DESK
          ══════════════════════════════════════════════════════════════ */}
      {adminViewTab === 'p2p_disputes' && (
        <div className="space-y-6">
          
          {/* Header Card */}
          <div
            className="p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="space-y-1">
              <span
                className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--brand-dim)', color: 'var(--brand)' }}
              >
                P2P Arbitration Center (Account 5 Master Admin)
              </span>
              <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>
                Escrow Dispute & Refund Arbiter
              </h2>
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                Arbitrate buyer & seller disputes, verify bank/UPI remarks, and execute single-click escrow refunds.
              </p>
            </div>
            <button
              type="button"
              onClick={loadP2PData}
              disabled={p2pLoading}
              className="btn btn-secondary text-xs py-2 px-4 font-bold flex items-center gap-1.5"
            >
              <span>{p2pLoading ? 'Syncing...' : 'Refresh Disputes'}</span>
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card space-y-1">
              <p className="text-[11px] font-bold uppercase" style={{ color: 'var(--ink-muted)' }}>Total Logged Disputes</p>
              <p className="text-2xl font-black font-mono" style={{ color: 'var(--ink)' }}>{p2pDisputesList.length}</p>
              <p className="text-[11px] font-bold text-amber-400">
                {p2pDisputesList.filter(d => d.status === 2).length} Open (Funds Frozen)
              </p>
            </div>

            <div className="card space-y-1">
              <p className="text-[11px] font-bold uppercase" style={{ color: 'var(--ink-muted)' }}>Settled Disputes</p>
              <p className="text-2xl font-black font-mono text-emerald-400">
                {p2pDisputesList.filter(d => d.status === 6 || d.status === 4).length}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                Buyer Won: {p2pDisputesList.filter(d => d.status === 6).length} | Seller Won: {p2pDisputesList.filter(d => d.status === 4).length}
              </p>
            </div>

            <div className="card space-y-1">
              <p className="text-[11px] font-bold uppercase" style={{ color: 'var(--ink-muted)' }}>P2P On-Chain Admin</p>
              <p className="text-xs font-mono font-bold text-emerald-400 truncate">
                {p2pContractAdmin ? p2pContractAdmin : 'Loading...'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                Designated: <b className="text-indigo-400">{shortAddr(ACCOUNT_5_ADMIN)}</b> (Acc 5)
              </p>
            </div>
          </div>

          {/* KYC & Admin Transfer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* KYC Approver */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--ink)' }}>
                  P2P User KYC Approver
                </h3>
                <span className="text-[10px] font-bold text-emerald-400">Instant On-Chain</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                Instantly grant verified KYC status to any buyer or seller wallet address.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field text-xs font-mono py-2 flex-1"
                  value={p2pKycInput}
                  onChange={(e) => setP2pKycInput(e.target.value)}
                  placeholder="User Wallet Address (0x...)"
                />
                <button
                  type="button"
                  onClick={handleP2PApproveKYC}
                  disabled={txPending}
                  className="btn btn-primary text-xs py-2 px-3.5 whitespace-nowrap font-bold"
                >
                  Approve KYC
                </button>
              </div>
            </div>

            {/* Admin Transfer Tool */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--ink)' }}>
                  P2P Contract Admin Transfer
                </h3>
                <span className="text-[10px] font-bold text-amber-400">Owner Only</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                Set or transfer the P2P contract admin role directly to Account 5 ({shortAddr(ACCOUNT_5_ADMIN)}).
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field text-xs font-mono py-2 flex-1"
                  value={p2pTransferAdminInput}
                  onChange={(e) => setP2pTransferAdminInput(e.target.value)}
                  placeholder="Target Admin Address (0x...)"
                />
                <button
                  type="button"
                  onClick={handleTransferP2PAdmin}
                  disabled={txPending}
                  className="btn btn-secondary text-xs py-2 px-3.5 whitespace-nowrap font-bold"
                >
                  Set P2P Admin
                </button>
              </div>
            </div>
          </div>

          {/* Dispute Cases Ledger */}
          <div className="card space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
                  Live Dispute Cases Dossier
                </h3>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                  Verified smart contract escrow claims logged on Ethereum Sepolia.
                </p>
              </div>
              <span className="text-xs font-mono font-bold" style={{ color: 'var(--ink-muted)' }}>
                {p2pDisputesList.length} Total Records
              </span>
            </div>

            {p2pDisputesList.length === 0 ? (
              <div className="text-center py-10 text-xs" style={{ color: 'var(--ink-muted)' }}>
                No active or historical disputes recorded on the smart contract.
              </div>
            ) : (
              <div className="space-y-4">
                {p2pDisputesList.map((d) => {
                  const pairSymbol = Number(d.bOrder?.pair) === 0 ? 'ETH' : Number(d.bOrder?.pair) === 1 ? 'HUB' : 'USDT'
                  return (
                    <div
                      key={d.disputeId}
                      className="p-4 sm:p-5 rounded-2xl space-y-3.5 transition-all shadow-sm"
                      style={{
                        backgroundColor: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-2)',
                      }}
                    >
                      {/* Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-extrabold text-sm text-amber-400">
                            Dispute #{d.disputeId}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: 'var(--ink-muted)' }}>
                            (Buy Order #{d.buyOrderId} | Sell Ad #{d.mainOrderId})
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                            d.status === 2
                              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                              : d.status === 6
                              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                              : 'bg-indigo-500/15 border border-indigo-500/40 text-indigo-400'
                          }`}
                        >
                          {d.status === 2 ? 'Open (Funds Frozen in Escrow)' :
                           d.status === 6 ? 'Resolved: Refunded to Buyer' : 'Resolved: Returned to Seller'}
                        </span>
                      </div>

                      {/* Reason */}
                      <div
                        className="p-3 rounded-xl text-xs font-semibold"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          borderLeft: '3px solid var(--red)',
                          color: 'var(--ink)',
                        }}
                      >
                        <span className="font-bold text-rose-400 mr-1.5">Reported Reason:</span>
                        <span>"{d.reason}"</span>
                      </div>

                      {/* On-Chain Audit Grid */}
                      <div
                        className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl text-xs font-mono"
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                      >
                        <div>
                          <span className="text-[10px] uppercase font-sans font-bold block" style={{ color: 'var(--ink-muted)' }}>Buyer</span>
                          <span className="font-bold truncate block" style={{ color: 'var(--ink)' }}>{d.bOrder?.buyer || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-sans font-bold block" style={{ color: 'var(--ink-muted)' }}>Seller</span>
                          <span className="font-bold truncate block" style={{ color: 'var(--ink)' }}>{d.bOrder?.seller || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-sans font-bold block" style={{ color: 'var(--ink-muted)' }}>Escrow Amount</span>
                          <div className="flex items-center gap-1 font-bold">
                            <TokenLogo symbol={pairSymbol} size={13} />
                            <span style={{ color: 'var(--green)' }}>{d.bOrder?.amount || '0'} {pairSymbol}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-sans font-bold block" style={{ color: 'var(--ink-muted)' }}>Bank/UPI Ref</span>
                          <span className="font-bold text-amber-400">{d.bOrder?.bankTransferCode || '—'}</span>
                        </div>
                      </div>

                      {/* Admin Arbitration Action Buttons */}
                      {d.status === 2 && (
                        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleP2PRefundBuyer(d.disputeId)}
                            disabled={txPending}
                            className="btn btn-primary flex-1 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 shadow-md"
                          >
                            Refund to Buyer (Transfer Escrow Crypto)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleP2PRefundSeller(d.disputeId)}
                            disabled={txPending}
                            className="btn btn-secondary flex-1 py-2.5 text-xs font-bold"
                            style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}
                          >
                            Return to Seller (Release Escrow Crypto)
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: CAMPAIGN PAYOUTS & COMMISSION MATRIX
          ══════════════════════════════════════════════════════════════ */}
      {adminViewTab === 'payouts' && (
        <div className="space-y-6">
          <div
            className="p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div>
              <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>
                Campaign Payouts & Multi-Tier Commission
              </h2>
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                Monitor and execute multi-tier automated fund releases across all on-chain campaigns.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search campaigns..."
                value={payoutSearch}
                onChange={(e) => setPayoutSearch(e.target.value)}
                className="input-field text-xs py-1.5 px-3"
              />
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="card text-center py-12 text-xs" style={{ color: 'var(--ink-muted)' }}>
              No campaigns deployed on the platform yet.
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.address}
                  className="card space-y-4 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base" style={{ color: 'var(--ink)' }}>{camp.title}</h3>
                        <span className="badge badge-green text-[10px]">
                          {camp.isCompleted ? 'Funds Released' : 'Active Vault'}
                        </span>
                      </div>
                      <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                        Contract: <span className="text-indigo-400">{camp.address}</span>
                      </p>
                    </div>

                    {!camp.isCompleted && parseFloat(camp.balanceEth) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCampaignAddr(camp.address)
                          setReleaseModalOpen(true)
                        }}
                        disabled={txPending}
                        className="btn btn-primary text-xs py-2 px-4 font-bold bg-emerald-600 hover:bg-emerald-500 shadow"
                      >
                        Release Funds (Auto-Split)
                      </button>
                    )}
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                      <span className="text-[10px] font-sans font-bold uppercase block" style={{ color: 'var(--ink-muted)' }}>Total Raised</span>
                      <span className="font-extrabold" style={{ color: 'var(--ink)' }}>{camp.totalCollectedEth} ETH</span>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                      <span className="text-[10px] font-sans font-bold uppercase block" style={{ color: 'var(--ink-muted)' }}>Vault Balance</span>
                      <span className="font-extrabold text-emerald-400">{camp.balanceEth} ETH</span>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                      <span className="text-[10px] font-sans font-bold uppercase block" style={{ color: 'var(--ink-muted)' }}>Qualified Users</span>
                      <span className="font-extrabold text-amber-400">
                        {camp.earningsPreview?.qualifiedMembers?.length || 0} members
                      </span>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                      <span className="text-[10px] font-sans font-bold uppercase block" style={{ color: 'var(--ink-muted)' }}>Organizer Cut</span>
                      <span className="font-extrabold text-indigo-400">
                        {camp.earningsPreview?.organizerCutEth || '0'} ETH
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: CAMPAIGN MANAGER & CREATION
          ══════════════════════════════════════════════════════════════ */}
      {adminViewTab === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Create Platform Campaign Form */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card space-y-4 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
                  Deploy Platform Campaign
                </h2>
                <span className="badge badge-green text-[10px]">Admin Mode</span>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                    Campaign Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Official Platform Grant 2026"
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
                    placeholder="Milestones, deliverables and funding goals..."
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

                {/* Commission Rules Card */}
                <div
                  className="p-3.5 rounded-xl space-y-1.5"
                  style={{ backgroundColor: 'var(--brand-dim)', border: '1px solid var(--border)' }}
                >
                  <p className="font-bold text-indigo-400">Commission Rules:</p>
                  <ul className="space-y-1 pl-4 list-disc text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                    <li><b>Admin Tier 0:</b> ≥ 3 direct users → <b>3% cut</b></li>
                    <li><b>Level 1 (P-tier):</b> ≥ 2 direct users → <b>5% cut</b></li>
                    <li><b>Level 2 (T-tier):</b> ≥ 3 direct users → <b>10% cut</b></li>
                    <li><b>Organizer:</b> Receives remaining balance upon fund release.</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={txPending || !isConnected}
                  className="btn btn-primary w-full py-3 text-xs font-bold shadow-lg"
                >
                  {txPending ? 'Deploying...' : 'Deploy Platform Campaign'}
                </button>
              </form>
            </div>
          </div>

          {/* Campaign Selector & Hierarchy Tree */}
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                Select Campaign to Manage ({campaigns.length}):
              </h3>
              <div className="flex gap-2 flex-wrap">
                {campaigns.map(c => (
                  <button
                    key={c.address}
                    onClick={() => setSelectedCampaignAddr(c.address)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedCampaign?.address === c.address
                        ? 'bg-indigo-600 text-white shadow'
                        : 'border hover:bg-slate-700/10'
                    }`}
                    style={selectedCampaign?.address !== c.address ? {
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--ink-muted)',
                    } : {}}
                  >
                    {c.title} ({c.participantCount} members)
                  </button>
                ))}
              </div>
            </div>

            {selectedCampaign && (
              <div className="card space-y-4 shadow-md">
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <h3 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
                      Member Hierarchy & Referral Directory
                    </h3>
                    <p className="text-xs font-mono text-indigo-400">
                      {selectedCampaign.address}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCampaign(selectedCampaign.address)}
                    disabled={txPending}
                    className="btn text-xs py-1.5 px-3 font-bold rounded-lg"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                  >
                    Delete
                  </button>
                </div>

                {selectedCampaign.members?.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: 'var(--ink-muted)' }}>
                    No members have joined this campaign yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b text-[10px] uppercase font-sans font-bold" style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}>
                          <th className="py-2">Member</th>
                          <th className="py-2">Ref Code</th>
                          <th className="py-2">Invites</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Projected Cut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {selectedCampaign.members.map((m, idx) => (
                          <tr key={m.userAddress + idx}>
                            <td className="py-2.5 font-bold" style={{ color: 'var(--ink)' }}>
                              {shortAddr(m.userAddress)}
                            </td>
                            <td className="py-2.5 text-indigo-400 font-bold">
                              {m.referralCode || '—'}
                            </td>
                            <td className="py-2.5" style={{ color: 'var(--ink)' }}>
                              {m.directReferralCount}
                            </td>
                            <td className="py-2.5">
                              {m.isQualified ? (
                                <span className="badge badge-green text-[10px]">
                                  {m.qualifiedPercentage}% Qualified
                                </span>
                              ) : (
                                <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-right font-bold text-emerald-400">
                              {m.isQualified ? ((parseFloat(selectedCampaign.balanceEth) * m.qualifiedPercentage) / 100).toFixed(4) : '0.0000'} ETH
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: ADMIN SECURITY & KEY CONFIGURATION
          ══════════════════════════════════════════════════════════════ */}
      {adminViewTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="card space-y-4 shadow-md">
            <h3 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
              Designated Admin Wallet
            </h3>
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              Set or update the authorized on-chain Admin wallet address.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter admin address (0x...)"
                value={customAdminInput}
                onChange={(e) => setCustomAdminInput(e.target.value)}
                className="input-field text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => handleSetAdminAddress()}
                className="btn btn-primary w-full text-xs font-bold py-2.5"
              >
                Save Admin Address
              </button>
            </div>
          </div>

          <div className="card space-y-4 shadow-md">
            <h3 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
              Generate Admin Keypair
            </h3>
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              Generate a brand new random Ethereum keypair for developer operations.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGenerateAdminAccount}
                className="btn btn-secondary w-full text-xs font-bold py-2.5"
              >
                Generate New Keypair
              </button>
              {generatedAccount && (
                <div className="p-3 rounded-xl space-y-2 text-xs font-mono" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                  <div>
                    <span className="text-[10px] uppercase font-sans font-bold block" style={{ color: 'var(--ink-muted)' }}>Address</span>
                    <span className="text-emerald-400 font-bold break-all">{generatedAccount.address}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-sans font-bold block" style={{ color: 'var(--ink-muted)' }}>Private Key</span>
                    <span className="text-amber-400 break-all">{generatedAccount.privateKey}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyGeneratedAccount}
                    className="btn btn-primary w-full text-xs font-bold py-1.5 mt-2"
                  >
                    Set as Designated Admin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Fund Release Modal ── */}
      {releaseModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-lg p-6 rounded-3xl space-y-5 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-2)', color: 'var(--ink)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
                Confirm Fund Release & Split
              </h3>
              <button onClick={() => setReleaseModalOpen(false)} className="font-bold opacity-70 hover:opacity-100">✕</button>
            </div>

            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              You are about to release <b className="text-emerald-400">{selectedCampaign.balanceEth} ETH</b>. The smart contract will automatically transfer funds according to qualification percentages.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReleaseModalOpen(false)}
                className="btn btn-secondary flex-1 py-2.5 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReleaseFunds(selectedCampaign.address)}
                disabled={txPending}
                className="btn btn-primary flex-1 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 shadow"
              >
                {txPending ? 'Processing...' : 'Confirm & Release On-Chain'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default AdminPage
