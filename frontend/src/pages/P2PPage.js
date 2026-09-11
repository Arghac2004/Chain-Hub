import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import {
  P2P_CONTRACT_ADDRESS,
  P2P_ABI,
  HUB_TOKEN_ADDRESS,
  USDT_TOKEN_ADDRESS,
  ERC20_ABI,
} from '../config/p2pContract.js'
import { TokenLogo, EthLogo, HubLogo, UsdtLogo, ChainHubLogo } from '../components/TokenLogo.js'
import './P2PPage.css'

const DISPUTE_REASONS = [
  'Paid via UPI/Bank, but Seller has not released crypto',
  "Buyer marked 'Paid', but no payment received in bank",
  'Payment amount received is less than agreed order amount',
  'Seller bank details or UPI ID was incorrect',
  'Other issue (Enter custom remarks)',
]

export default function P2PPage() {
  const { address, isConnected, chain } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isSepolia = chain?.id === 11155111

  // Trading Mode Tabs: 'P2P' | 'EXPRESS' | 'BLOCK'
  const [tradingMode, setTradingMode] = useState('P2P')
  // Sub-navigation: 'MARKET' | 'MY_ADS' | 'SELL_FORM' | 'TRADES'
  const [mainNavTab, setMainNavTab] = useState('MARKET')
  // Buy / Sell Action Switch
  const [marketAction, setMarketAction] = useState('BUY') // 'BUY' | 'SELL'

  const [kycStatus, setKycStatus] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)

  // Filters
  const [selectedCurrency, setSelectedCurrency] = useState('INR') // 'INR' | 'USD' | 'EUR'
  const [selectedPair, setSelectedPair] = useState(0) // 0 = ETH, 1 = HUB, 2 = USDT
  const [filterAmount, setFilterAmount] = useState('')
  const [filterPayment, setFilterPayment] = useState('ALL')

  // Expanded Accordion State for Table Rows
  const [expandedAdId, setExpandedAdId] = useState(null)
  const [youPayAmount, setYouPayAmount] = useState('')
  const [convertedAmount, setConvertedAmount] = useState('')
  const [bankRefCode, setBankRefCode] = useState('')

  // Live Ads from Blockchain Smart Contract
  const [adsList, setAdsList] = useState([])
  const [fetchingAds, setFetchingAds] = useState(false)

  // Sell Ad Form State
  const [sellPair, setSellPair] = useState(0)
  const [sellCurrency, setSellCurrency] = useState('INR')
  const [sellQuantity, setSellQuantity] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellMinLimit, setSellMinLimit] = useState('')
  const [sellMaxLimit, setSellMaxLimit] = useState('')

  // Edit Ad Modal State
  const [editingAd, setEditingAd] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [editMinLimit, setEditMinLimit] = useState('')
  const [editMaxLimit, setEditMaxLimit] = useState('')
  const [editPaymentMethods, setEditPaymentMethods] = useState(['Bank Transfer', 'UPI', 'IMPS'])
  const [editRemarks, setEditRemarks] = useState('')
  const [editIsPaused, setEditIsPaused] = useState(false)

  // Trade Room / Orders State
  const [tradeOrderId, setTradeOrderId] = useState('')
  const [disputeCategory, setDisputeCategory] = useState(DISPUTE_REASONS[0])
  const [customDisputeReason, setCustomDisputeReason] = useState('')
  const [myOrdersList, setMyOrdersList] = useState([])
  const [fetchingMyOrders, setFetchingMyOrders] = useState(false)

  // Admin State
  const ACCOUNT_5_ADMIN = '0x3Dc08222B824a86f2d15A1b8e6D7C0C5BB5aD5C9'
  const [contractAdmin, setContractAdmin] = useState('')

  const isP2PAdmin = Boolean(
    address &&
    (address.toLowerCase() === ACCOUNT_5_ADMIN.toLowerCase() ||
     (contractAdmin && address.toLowerCase() === contractAdmin.toLowerCase()))
  )

  const getPairSymbol = (p) => {
    const num = Number(p)
    if (num === 0) return 'ETH'
    if (num === 1) return 'HUB'
    return 'USDT'
  }

  const getCurrencySymbol = (c) => {
    if (c === 'INR') return '₹'
    if (c === 'EUR') return '€'
    return '$'
  }

  const checkAdmin = useCallback(async () => {
    if (!publicClient) return
    try {
      const a = await publicClient.readContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'admin',
      })
      if (a) setContractAdmin(a)
    } catch (e) {
      console.warn('Could not fetch P2P admin:', e)
    }
  }, [publicClient])

  useEffect(() => {
    checkAdmin()
  }, [checkAdmin])

  // Check KYC status via smart contract getUserData
  const checkUserKYC = useCallback(async () => {
    if (!publicClient || !address) return
    try {
      const res = await publicClient.readContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'getUserData',
        args: [address],
      })
      if (res) {
        setKycStatus(Boolean(res[1]))
      }
    } catch (e) {
      console.warn('KYC check error:', e)
    }
  }, [publicClient, address])

  useEffect(() => {
    if (isConnected && address) {
      checkUserKYC()
    }
  }, [isConnected, address, checkUserKYC])

  // Fetch Live On-Chain Ads from Sepolia P2P Contract
  const fetchLiveAds = useCallback(async () => {
    if (!publicClient) return
    setFetchingAds(true)
    try {
      const totalOrders = await publicClient.readContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'totalOrders',
      })

      const overrides = JSON.parse(localStorage.getItem('chainhub_ad_overrides') || '{}')
      const loadedAds = []
      const total = Number(totalOrders || 0n)

      for (let i = 1; i <= total; i++) {
        try {
          const ad = await publicClient.readContract({
            address: P2P_CONTRACT_ADDRESS,
            abi: P2P_ABI,
            functionName: 'orderInfo',
            args: [BigInt(i)],
          })

          // ad structure: [orderID, pair, totalQuantity, min, max, status, price, userAddress, creationTime, _type, country, buyStatus]
          if (ad && ad[7] !== '0x0000000000000000000000000000000000000000') {
            const statusNum = Number(ad[5])
            const isCompleted = statusNum !== 8
            const pairNum = Number(ad[1])
            const totalQty = formatEther(ad[2])
            let minLim = formatEther(ad[3])
            let maxLim = formatEther(ad[4])
            let priceVal = ad[6].toString()
            let isPausedVal = false
            let paymentMethodsVal = ['UPI', 'Bank Transfer', 'IMPS']
            let remarksVal = 'I accept direct verified payments. Instant crypto escrow release upon confirmation.'

            if (overrides[i]) {
              if (overrides[i].price !== undefined && overrides[i].price !== '') priceVal = overrides[i].price
              if (overrides[i].min !== undefined && overrides[i].min !== '') minLim = overrides[i].min
              if (overrides[i].max !== undefined && overrides[i].max !== '') maxLim = overrides[i].max
              if (overrides[i].isPaused !== undefined) isPausedVal = overrides[i].isPaused
              if (overrides[i].paymentMethods) paymentMethodsVal = overrides[i].paymentMethods
              if (overrides[i].remarks !== undefined) remarksVal = overrides[i].remarks
            }

            loadedAds.push({
              orderID: i,
              seller: ad[7],
              pair: pairNum,
              cryptoSym: getPairSymbol(pairNum),
              totalQuantity: totalQty,
              price: priceVal,
              min: minLim,
              max: maxLim,
              status: statusNum,
              isCompleted: isCompleted,
              isPaused: isPausedVal,
              paymentMethods: paymentMethodsVal,
              remarks: remarksVal,
              creationTime: Number(ad[8]),
              orderType: Number(ad[9]),
              rating: '4.98',
              completionRate: '99.4%',
              totalTrades: '1,420',
              avgReleaseTime: '2 min',
            })
          }
        } catch (err) {
          console.warn(`Could not read order #${i}:`, err)
        }
      }

      setAdsList(loadedAds.reverse())
    } catch (err) {
      console.warn('Could not fetch ads:', err)
    } finally {
      setFetchingAds(false)
    }
  }, [publicClient])

  useEffect(() => {
    fetchLiveAds()
    const interval = setInterval(fetchLiveAds, 12000)
    return () => clearInterval(interval)
  }, [fetchLiveAds])

  // Fetch My Orders for Trade Room
  const fetchMyOrders = useCallback(async () => {
    if (!publicClient || !address) return
    setFetchingMyOrders(true)
    try {
      let total = 0
      try {
        const totalBuyOrders = await publicClient.readContract({
          address: P2P_CONTRACT_ADDRESS,
          abi: P2P_ABI,
          functionName: 'totalBuyOrders',
        })
        total = Number(totalBuyOrders || 0n)
      } catch {
        total = 20
      }

      const orders = []
      for (let i = 1; i <= total; i++) {
        try {
          const ord = await publicClient.readContract({
            address: P2P_CONTRACT_ADDRESS,
            abi: P2P_ABI,
            functionName: 'buyOrderInfo',
            args: [BigInt(i)],
          })

          if (ord && ord[9] !== '0x0000000000000000000000000000000000000000') {
            const isBuyer = ord[9].toLowerCase() === address.toLowerCase()
            const isSeller = ord[10].toLowerCase() === address.toLowerCase()

            if (isBuyer || isSeller || isP2PAdmin) {
              orders.push({
                buyOrderID: i,
                mainOrderID: Number(ord[1]),
                amount: formatEther(ord[2]),
                pair: Number(ord[3]),
                status: Number(ord[4]),
                createdAt: Number(ord[5]),
                expireTime: Number(ord[6]),
                price: ord[7].toString(),
                bankTransferCode: ord[8],
                buyer: ord[9],
                seller: ord[10],
                completedTime: Number(ord[11]),
                isBuyer,
                isSeller,
              })
            }
          }
        } catch (e) {
          // continue
        }
      }
      setMyOrdersList(orders.reverse())
    } catch (err) {
      console.warn('Could not fetch orders:', err)
    } finally {
      setFetchingMyOrders(false)
    }
  }, [publicClient, address, isP2PAdmin])

  useEffect(() => {
    if (isConnected && address) {
      fetchMyOrders()
      const interval = setInterval(fetchMyOrders, 10000)
      return () => clearInterval(interval)
    }
  }, [isConnected, address, fetchMyOrders])

  // Filter Ads based on Pair, Payment Method, and Amount
  const publicAdsList = adsList.filter((ad) => {
    if (ad.isCompleted || ad.isPaused) return false
    if (Number(ad.pair) !== Number(selectedPair)) return false
    if (filterPayment !== 'ALL' && !ad.paymentMethods?.some(m => m.toLowerCase().includes(filterPayment.toLowerCase()))) return false
    if (filterAmount && Number(filterAmount) > 0) {
      const minVal = parseFloat(ad.min)
      const maxVal = parseFloat(ad.max)
      const req = parseFloat(filterAmount)
      if (req < minVal || req > maxVal) return false
    }
    return true
  })

  // User's own live posted sell ads
  const myAdsList = adsList.filter(
    (ad) => address && ad.seller.toLowerCase() === address.toLowerCase() && !ad.isCompleted
  )

  // 1. Post Sell Order (Smart Contract createOrder)
  const handlePostSellAd = async (e) => {
    e.preventDefault()
    if (!isConnected) return alert('Please connect wallet')
    if (!walletClient || !publicClient) return
    setLoading(true)
    setStatusMsg('Locking crypto into P2P Smart Contract Escrow...')
    try {
      const qWei = parseEther(sellQuantity.toString())
      const minWei = parseEther(sellMinLimit.toString())
      const maxWei = parseEther(sellMaxLimit.toString())
      const pBig = BigInt(sellPrice.toString())
      const pairIndex = BigInt(sellPair)
      const orderType = 0n // 0 = Sell Order
      const localStr = sellCurrency

      let hash
      if (Number(sellPair) === 0) {
        // Native ETH Sell Order
        hash = await walletClient.writeContract({
          address: P2P_CONTRACT_ADDRESS,
          abi: P2P_ABI,
          functionName: 'createOrder',
          args: [qWei, minWei, maxWei, pBig, pairIndex, orderType, localStr],
          value: qWei,
        })
      } else {
        const tokenAddr = Number(sellPair) === 2 ? USDT_TOKEN_ADDRESS : HUB_TOKEN_ADDRESS
        // Approve Token transfer
        const appHash = await walletClient.writeContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [P2P_CONTRACT_ADDRESS, qWei],
        })
        await publicClient.waitForTransactionReceipt({ hash: appHash })

        // Create Order
        hash = await walletClient.writeContract({
          address: P2P_CONTRACT_ADDRESS,
          abi: P2P_ABI,
          functionName: 'createOrder',
          args: [qWei, minWei, maxWei, pBig, pairIndex, orderType, localStr],
        })
      }

      await publicClient.waitForTransactionReceipt({ hash })
      setStatusMsg('Sell order posted successfully! Funds locked in Smart Contract Escrow.')
      setSellQuantity('')
      setSellPrice('')
      setSellMinLimit('')
      setSellMaxLimit('')
      fetchLiveAds()
      setMainNavTab('MARKET')
    } catch (err) {
      alert(err.shortMessage || err.message)
      setStatusMsg(null)
    } finally {
      setLoading(false)
    }
  }

  // 2. Buy Order via Accordion Execution
  const handleExecuteAccordionBuy = async (ad) => {
    if (!convertedAmount) {
      return alert('Please enter amount to buy')
    }
    if (!walletClient || !publicClient) {
      return alert('Please connect wallet on Ethereum Sepolia')
    }
    setLoading(true)
    setStatusMsg('Placing buy order on-chain into Smart Contract Escrow...')
    try {
      const amtWei = parseEther(convertedAmount.toString())
      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'buyOrder',
        args: [BigInt(ad.orderID), amtWei, bankRefCode || 'CHAINHUB-ESCROW-REF'],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setStatusMsg(`Buy order created for Order #${ad.orderID}! Please transfer fiat payment in Escrow Room.`)
      setExpandedAdId(null)
      setYouPayAmount('')
      setConvertedAmount('')
      setBankRefCode('')
      fetchMyOrders()
      setMainNavTab('TRADES')
    } catch (err) {
      alert(err.shortMessage || err.message)
      setStatusMsg(null)
    } finally {
      setLoading(false)
    }
  }

  // 3. Confirm Payment
  const handleConfirmPaid = async (buyOrdId) => {
    if (!walletClient || !publicClient || !buyOrdId) return
    setLoading(true)
    try {
      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'confirmPayment',
        args: [BigInt(buyOrdId)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      alert(`Order #${buyOrdId} marked as Paid! Waiting for seller to release escrow funds.`)
      fetchMyOrders()
    } catch (err) {
      alert(err.shortMessage || err.message)
    } finally {
      setLoading(false)
    }
  }

  // 4. Release Funds
  const handleReleaseCrypto = async (buyOrdId) => {
    if (!walletClient || !publicClient || !buyOrdId) return
    setLoading(true)
    try {
      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'releaseFunds',
        args: [BigInt(buyOrdId)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      alert(`Crypto escrow released for Order #${buyOrdId}! Trade completed.`)
      fetchMyOrders()
      fetchLiveAds()
    } catch (err) {
      alert(err.shortMessage || err.message)
    } finally {
      setLoading(false)
    }
  }

  // 5. Raise Dispute
  const handleDispute = async () => {
    if (!walletClient || !publicClient || !tradeOrderId) return alert('Enter Buy Order ID')
    setLoading(true)
    try {
      const reasonText =
        disputeCategory === 'Other issue (Enter custom remarks)'
          ? customDisputeReason || 'Custom dispute raised'
          : disputeCategory

      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'raiseDispute',
        args: [BigInt(tradeOrderId), reasonText],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      alert(`Dispute raised for Order #${tradeOrderId}! Escrow held for Admin review.`)
      setTradeOrderId('')
      fetchMyOrders()
    } catch (err) {
      alert(err.shortMessage || err.message)
    } finally {
      setLoading(false)
    }
  }

  // Open Edit Modal for a specific Ad
  const handleOpenEditModal = (ad) => {
    setEditingAd(ad)
    setEditPrice(ad.price || '')
    setEditMinLimit(ad.min || '')
    setEditMaxLimit(ad.max || '')
    setEditPaymentMethods(ad.paymentMethods || ['Bank Transfer', 'UPI', 'IMPS'])
    setEditRemarks(ad.remarks || '')
    setEditIsPaused(Boolean(ad.isPaused))
  }

  // Save changes to Ad
  const handleSaveEditAd = (e) => {
    e.preventDefault()
    if (!editingAd) return

    const overrides = JSON.parse(localStorage.getItem('chainhub_ad_overrides') || '{}')
    overrides[editingAd.orderID] = {
      price: editPrice,
      min: editMinLimit,
      max: editMaxLimit,
      paymentMethods: editPaymentMethods,
      remarks: editRemarks,
      isPaused: editIsPaused,
    }
    localStorage.setItem('chainhub_ad_overrides', JSON.stringify(overrides))

    setAdsList((prev) =>
      prev.map((item) =>
        item.orderID === editingAd.orderID
          ? {
              ...item,
              price: editPrice,
              min: editMinLimit,
              max: editMaxLimit,
              paymentMethods: editPaymentMethods,
              remarks: editRemarks,
              isPaused: editIsPaused,
            }
          : item
      )
    )

    setStatusMsg(`Listing Order #${editingAd.orderID} updated successfully.`)
    setEditingAd(null)
  }

  // Toggle active / paused status for My Ad
  const handleTogglePauseAd = (orderId) => {
    const overrides = JSON.parse(localStorage.getItem('chainhub_ad_overrides') || '{}')
    const current = overrides[orderId] || {}
    const newPaused = !current.isPaused
    overrides[orderId] = {
      ...current,
      isPaused: newPaused,
    }
    localStorage.setItem('chainhub_ad_overrides', JSON.stringify(overrides))

    setAdsList((prev) =>
      prev.map((item) =>
        item.orderID === orderId
          ? { ...item, isPaused: newPaused }
          : item
      )
    )
  }

  return (
    <div className="p2p-exlm-root">
      {/* ══════════════════════════════════════════════════════════════════
          1. LEFT SIDEBAR (ChainHub Navigation)
          ══════════════════════════════════════════════════════════════════ */}
      <aside className="p2p-exlm-sidebar">
        <div>
          {/* Real App Brand Logo */}
          <Link to="/" className="p2p-exlm-logo-wrap" style={{ textDecoration: 'none' }}>
            <ChainHubLogo size={32} />
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight leading-none" style={{ color: 'var(--ink)' }}>
                Chain<span style={{ color: 'var(--brand)' }}>Hub</span>
              </span>
              <span className="text-[9px] font-bold tracking-widest text-indigo-400 uppercase leading-none mt-1">
                DeFi Protocol
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="p2p-exlm-nav-list">
            <Link to="/dashboard" className="p2p-exlm-nav-item">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard</span>
            </Link>

            <Link to="/portfolio" className="p2p-exlm-nav-item">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Assets</span>
            </Link>

            <button
              className={`p2p-exlm-nav-item ${mainNavTab === 'TRADES' ? 'active' : ''}`}
              onClick={() => setMainNavTab('TRADES')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Orders / Escrow</span>
              {myOrdersList.length > 0 && (
                <span className="badge badge-blue ml-auto text-[10px] py-0 px-1.5">{myOrdersList.length}</span>
              )}
            </button>

            <Link to="/campaigns" className="p2p-exlm-nav-item">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <span>Campaigns</span>
            </Link>

            <Link to="/transactions" className="p2p-exlm-nav-item">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>History</span>
            </Link>

            <button
              className={`p2p-exlm-nav-item ${mainNavTab === 'MARKET' ? 'active' : ''}`}
              onClick={() => { setMainNavTab('MARKET'); setTradingMode('P2P') }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>P2P Trading</span>
              <span className="p2p-nav-dot-active" />
            </button>
          </nav>
        </div>

        {/* Real User Profile in Sidebar */}
        <div>
          <div className="p2p-exlm-user-pill">
            <div className="p2p-exlm-user-avatar">
              {address ? address.slice(2, 4).toUpperCase() : 'W'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="p2p-exlm-user-name truncate">
                {localStorage.getItem('chainhub_username') || 'Merchant'}
              </p>
              <p className="p2p-exlm-user-id truncate">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          2. MAIN CENTER SECTION (P2P Trading Table & Controls)
          ══════════════════════════════════════════════════════════════════ */}
      <main className="p2p-exlm-center">
        {/* Top Sub-Navigation Header */}
        <div className="p2p-top-subnav-bar">
          <div className="p2p-subnav-links">
            <span className={`p2p-subnav-link ${mainNavTab === 'MARKET' ? 'active' : ''}`} onClick={() => setMainNavTab('MARKET')}>
              Marketplace
            </span>
            <span className={`p2p-subnav-link ${mainNavTab === 'MY_ADS' ? 'active' : ''}`} onClick={() => setMainNavTab('MY_ADS')}>
              My Ads {myAdsList.length > 0 ? `(${myAdsList.length})` : ''}
            </span>
            <span className={`p2p-subnav-link ${mainNavTab === 'SELL_FORM' ? 'active' : ''}`} onClick={() => setMainNavTab('SELL_FORM')}>
              + Post Sell Ad
            </span>
            <span className={`p2p-subnav-link ${mainNavTab === 'TRADES' ? 'active' : ''}`} onClick={() => setMainNavTab('TRADES')}>
              Escrow Room {myOrdersList.length > 0 ? `(${myOrdersList.length})` : ''}
            </span>
          </div>

          <div className="p2p-subnav-actions">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sepolia Escrow Live</span>
            </div>
          </div>
        </div>

        {/* Network Switch Notice if not Sepolia */}
        {isConnected && !isSepolia && (
          <div
            style={{
              background: 'var(--brand-dim)',
              border: '1px solid var(--brand-bd)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span style={{ fontSize: '12px', color: 'var(--ink)' }}>
                Connected to <strong>{chain?.name || 'Unknown'}</strong>. Please switch to Ethereum Sepolia Testnet.
              </span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => switchChain && switchChain({ chainId: 11155111 })}
              disabled={isSwitching}
            >
              {isSwitching ? 'Switching…' : 'Switch to Sepolia'}
            </button>
          </div>
        )}

        {statusMsg && (
          <div
            style={{
              background: 'var(--gold-dim)',
              border: '1px solid var(--gold-bd)',
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              fontSize: '12px',
              color: 'var(--gold)',
            }}
          >
            {statusMsg}
          </div>
        )}

        <div className="p2p-filter-bar-one">
          <div className="p2p-mode-pill-group">
            {[ 'P2P'].map((mode) => (
              <button
                key={mode}
                className={`p2p-mode-pill ${tradingMode === mode.toUpperCase() ? 'active' : ''}`}
                onClick={() => setTradingMode(mode.toUpperCase())}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Crypto Asset Pills */}
          <div className="p2p-asset-pill-group">
            {[
              { sym: 'ETH', id: 0 },
              { sym: 'HUB', id: 1 },
              { sym: 'USDT', id: 2 },
            ].map((crypto) => (
              <button
                key={crypto.sym}
                className={`p2p-asset-btn ${selectedPair === crypto.id ? 'active' : ''}`}
                onClick={() => setSelectedPair(crypto.id)}
              >
                <TokenLogo symbol={crypto.sym} size={15} />
                <span>{crypto.sym}</span>
              </button>
            ))}
          </div>

          {/* Currency / Refresh Controls */}
          <div className="p2p-filter-right-meta">
            <select
              className="p2p-dropdown-pill"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
            <button
              className="p2p-subnav-icon-btn"
              onClick={fetchLiveAds}
              disabled={fetchingAds}
              title="Refresh Blockchain Listings"
            >
              <svg className={`w-4 h-4 ${fetchingAds ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Bar 2: Buy / Sell + Payment Methods + Amount filter */}
        <div className="p2p-filter-bar-two">
          <div className="p2p-filter-left-controls">
            <select
              className="p2p-dropdown-pill"
              value={marketAction}
              onChange={(e) => setMarketAction(e.target.value)}
            >
              <option value="BUY">Buy ▾</option>
              <option value="SELL">Sell ▾</option>
            </select>

            <select
              className="p2p-dropdown-pill"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            >
              <option value="ALL">All Payment Methods ▾</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="IMPS">IMPS</option>
              <option value="Paytm">Paytm</option>
            </select>

            <input
              type="number"
              placeholder={`Enter amount in ${selectedCurrency}...`}
              className="input-field py-1 px-3 text-xs"
              style={{ width: '170px' }}
              value={filterAmount}
              onChange={(e) => setFilterAmount(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 12px' }}
              onClick={() => setMainNavTab(mainNavTab === 'MY_ADS' ? 'MARKET' : 'MY_ADS')}
            >
              {mainNavTab === 'MY_ADS' ? '← Back to Market' : `My Ads (${myAdsList.length})`}
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ fontSize: '11px', padding: '4px 12px' }}
              onClick={() => setMainNavTab('SELL_FORM')}
            >
              + Post Sell Ad
            </button>
          </div>
        </div>

        {/* Active My Ads Banner if present */}
        {isConnected && myAdsList.length > 0 && mainNavTab === 'MARKET' && (
          <div
            style={{
              background: 'var(--brand-dim)',
              border: '1px solid var(--brand-bd)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span style={{ fontSize: '12px', color: 'var(--ink)' }}>
                <strong>You have {myAdsList.length} active sell advertisement(s) running live:</strong> (
                {myAdsList.map(a => `Order #${a.orderID}: ${getCurrencySymbol(selectedCurrency)}${a.price}/${getPairSymbol(a.pair)}`).join(', ')}
                )
              </span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setMainNavTab('MY_ADS')}
            >
              Manage My Ads →
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            3. CENTRAL DATA TABLE (Live On-Chain Listings)
            ══════════════════════════════════════════════════════════════ */}
        {mainNavTab === 'MARKET' && (
          <div className="p2p-dribbble-table-wrap">
            {/* Header Row */}
            <div className="p2p-dribbble-header-row">
              <div>Type</div>
              <div>Price</div>
              <div>Available / Order Limit</div>
              <div>Bank / Payment</div>
              <div>Rating</div>
              <div style={{ textAlign: 'right' }}>Trade</div>
            </div>

            {/* Listings Loop */}
            {fetchingAds && publicAdsList.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--ink-muted)' }}>
                Loading live on-chain P2P listings from blockchain…
              </div>
            ) : publicAdsList.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                  No active sell ads found for {getPairSymbol(selectedPair)}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  Be the first merchant to post a sell ad with your desired price!
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setMainNavTab('SELL_FORM')}
                >
                  + Post {getPairSymbol(selectedPair)} Sell Advertisement
                </button>
              </div>
            ) : (
              publicAdsList.map((ad) => {
                const isExpanded = expandedAdId === ad.orderID
                const isMyAd = address && ad.seller.toLowerCase() === address.toLowerCase()
                const pairSym = getPairSymbol(ad.pair)

                return (
                  <div
                    key={ad.orderID}
                    className={`p2p-dribbble-row-container ${isExpanded ? 'active-expanded' : ''}`}
                  >
                    {/* Table Row */}
                    <div className="p2p-dribbble-row">
                      {/* 1. Type / User Info */}
                      <div className="p2p-col-type-user">
                        <div
                          className="p2p-user-hex-avatar"
                          style={isMyAd ? { background: 'linear-gradient(135deg, #6366f1, #06b6d4)' } : {}}
                        >
                          {ad.seller.slice(2, 4).toUpperCase()}
                        </div>
                        <div className="p2p-user-details-wrap">
                          <span className="p2p-user-handle">
                            {isMyAd ? `${localStorage.getItem('chainhub_username') || 'You (Seller)'}` : `Merchant_${ad.seller.slice(2, 6)}`}
                            {isMyAd && (
                              <span className="badge badge-blue ml-1 text-[9px] py-0 px-1">You</span>
                            )}
                            <span className="inline-flex items-center text-emerald-400" title="Verified Merchant">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          </span>
                          <span className="p2p-user-perf-subtext">
                            {ad.completionRate || '99.4%'} | Avg. release: {ad.avgReleaseTime || '2 min'}
                          </span>
                        </div>
                      </div>

                      {/* 2. Price */}
                      <div className="p2p-col-price-val">
                        {getCurrencySymbol(selectedCurrency)}{ad.price}
                      </div>

                      {/* 3. Available / Order Limit */}
                      <div className="p2p-col-limits-box">
                        <span className="p2p-avail-crypto">{ad.totalQuantity} {pairSym}</span>
                        <span className="p2p-limit-fiat">
                          {ad.min} - {ad.max} {pairSym}
                        </span>
                      </div>

                      {/* 4. Bank / Payment Methods */}
                      <div className="p2p-col-bank-badges">
                        <span className="p2p-bank-name">
                          {(ad.paymentMethods || ['UPI', 'Bank Transfer'])[0]}
                        </span>
                        <span className="p2p-bank-sub">
                          {(ad.paymentMethods || ['UPI', 'Bank Transfer']).slice(1).join(', ') || 'Instant Transfer'}
                        </span>
                      </div>

                      {/* 5. Rating */}
                      <div className="p2p-col-rating-box">
                        <span className="p2p-orders-count">{ad.totalTrades || '1,420'} orders</span>
                        <span className="p2p-completion-percent">{ad.completionRate || '99.4%'} completion</span>
                      </div>

                      {/* 6. Trade Button */}
                      <div className="p2p-col-action-btn-wrap">
                        {isMyAd ? (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '11px', padding: '4px 12px' }}
                            onClick={() => setMainNavTab('MY_ADS')}
                          >
                            My Listing
                          </button>
                        ) : (
                          <button
                            className={`p2p-btn-action-buy-pill ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedAdId(null)
                              } else {
                                setExpandedAdId(ad.orderID)
                                setYouPayAmount('')
                                setConvertedAmount('')
                                setBankRefCode('')
                              }
                            }}
                          >
                            {isExpanded ? 'Close ✕' : `Buy ${pairSym}`}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ════════════════════════════════════════════════════
                        4. EXPANDED ACCORDION STATE (In-Place Order Entry)
                        ════════════════════════════════════════════════════ */}
                    {isExpanded && !isMyAd && (
                      <div className="p2p-expanded-accordion-panel">
                        <div className="p2p-accordion-2col-layout">
                          {/* Left: Verification Badges + Terms */}
                          <div className="p2p-accordion-left-panel">
                            <div className="p2p-verification-tags-row">
                              <span className="p2p-v-tag">Email ✓</span>
                              <span className="p2p-v-tag">Identity verification ✓</span>
                              <span className="p2p-v-tag">SMS ✓</span>
                            </div>

                            <h5 className="p2p-terms-title-heading">
                              Advertiser's Terms
                            </h5>

                            <div className="p2p-terms-bullet-list">
                              <div className="p2p-terms-bullet-item">
                                <span>🟢</span>
                                <span>I accept transfers from any bank account or verified wallet.</span>
                              </div>
                              <div className="p2p-terms-bullet-item">
                                <span>🔴</span>
                                <span>No third-party intermediaries or suspicious payments.</span>
                              </div>
                              <div className="p2p-terms-bullet-item">
                                <span>🟡</span>
                                <span>Send proof of transfer in chat after payment.</span>
                              </div>
                              <div className="p2p-terms-bullet-item">
                                <span>⚠️</span>
                                <span>Orders without confirmation may be cancelled automatically.</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Order Entry Form ("You Pay" + "Converted to") */}
                          <div className="p2p-accordion-right-form">
                            {/* You Pay Box */}
                            <div className="p2p-calc-entry-box">
                              <div className="p2p-calc-label-row">
                                <span>You Pay:</span>
                                <span>Min: {ad.min} {pairSym}</span>
                              </div>
                              <div className="p2p-calc-input-row">
                                <input
                                  type="number"
                                  className="p2p-calc-input"
                                  value={youPayAmount}
                                  onChange={(e) => {
                                    setYouPayAmount(e.target.value)
                                    const calc = (Number(e.target.value) / Number(ad.price)).toFixed(4)
                                    setConvertedAmount(isNaN(calc) ? '' : calc)
                                  }}
                                  placeholder="0"
                                />
                                <span className="p2p-calc-currency-tag">{selectedCurrency}</span>
                              </div>
                            </div>

                            {/* Converted To Box */}
                            <div className="p2p-calc-entry-box">
                              <div className="p2p-calc-label-row">
                                <span>Converted to:</span>
                              </div>
                              <div className="p2p-calc-input-row">
                                <input
                                  type="number"
                                  className="p2p-calc-input"
                                  value={convertedAmount}
                                  onChange={(e) => {
                                    setConvertedAmount(e.target.value)
                                    const calc = (Number(e.target.value) * Number(ad.price)).toFixed(2)
                                    setYouPayAmount(isNaN(calc) ? '' : calc)
                                  }}
                                  placeholder="0"
                                />
                                <span className="p2p-calc-currency-tag">{pairSym}</span>
                              </div>
                            </div>

                            {/* Price note */}
                            <div className="p2p-calc-price-note">
                              <span>🏷️ Price: {ad.price} {selectedCurrency}</span>
                              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                                Bank / UPI &gt;
                              </span>
                            </div>

                            {/* Bank/UPI Ref input */}
                            <input
                              type="text"
                              placeholder="Enter bank/UPI transfer reference code..."
                              className="input-field py-1.5 px-2 text-xs"
                              value={bankRefCode}
                              onChange={(e) => setBankRefCode(e.target.value)}
                            />

                            {/* Execute Button */}
                            <button
                              className="p2p-btn-execute-buy"
                              onClick={() => handleExecuteAccordionBuy(ad)}
                              disabled={loading}
                            >
                              {loading ? 'Processing Escrow…' : `Buy ${pairSym}`}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MY ADS MANAGER TAB
            ══════════════════════════════════════════════════════════════ */}
        {mainNavTab === 'MY_ADS' && (
          <div className="p2p-dribbble-table-wrap p-5 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-extrabold text-base" style={{ color: 'var(--ink)' }}>
                  My Posted Advertisements ({myAdsList.length})
                </h3>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                  Manage price, limits, active status, or edit your smart contract listings.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setMainNavTab('SELL_FORM')}>
                + Post New Ad
              </button>
            </div>

            {myAdsList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  You have not posted any sell ads yet
                </p>
                <p className="text-xs mt-1 mb-3" style={{ color: 'var(--ink-muted)' }}>
                  Lock crypto into smart contract escrow to start selling.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => setMainNavTab('SELL_FORM')}>
                  Post Your First Sell Ad
                </button>
              </div>
            ) : (
              myAdsList.map((ad) => (
                <div key={ad.orderID} className="p2p-myads-card">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--gold)' }}>
                        Order #{ad.orderID}
                      </span>
                      <span
                        className={`badge ${ad.isPaused ? 'badge-gray' : 'badge-green'}`}
                        style={{ marginLeft: '8px' }}
                      >
                        {ad.isPaused ? 'Paused' : 'Active Escrow'}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
                      <strong>{getCurrencySymbol(selectedCurrency)}{ad.price}</strong> / {getPairSymbol(ad.pair)}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                      Balance: <strong style={{ color: 'var(--ink)' }}>{ad.totalQuantity} {getPairSymbol(ad.pair)}</strong>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                      Limits: <strong>{ad.min} – {ad.max}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                      onClick={() => handleTogglePauseAd(ad.orderID)}
                    >
                      {ad.isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleOpenEditModal(ad)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Ad
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            POST SELL AD TAB
            ══════════════════════════════════════════════════════════════ */}
        {mainNavTab === 'SELL_FORM' && (
          <div className="p2p-dribbble-table-wrap p-6 max-w-lg mx-auto w-full">
            <h3 className="font-extrabold text-base mb-1" style={{ color: 'var(--ink)' }}>
              Create Sell Advertisement
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
              Your crypto will be locked securely into Sepolia Smart Contract Escrow.
            </p>

            <form onSubmit={handlePostSellAd} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="input-label">Crypto Asset</label>
                  <select
                    className="select-field"
                    value={sellPair}
                    onChange={(e) => setSellPair(Number(e.target.value))}
                  >
                    <option value={0}>ETH (Sepolia)</option>
                    <option value={1}>HUB Token</option>
                    <option value={2}>USDT</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Fiat Currency</label>
                  <select
                    className="select-field"
                    value={sellCurrency}
                    onChange={(e) => setSellCurrency(e.target.value)}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Price per unit ({sellCurrency})</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 250000"
                  className="input-field"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="input-label">Total Quantity</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.05"
                    className="input-field"
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Min Limit</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.001"
                    className="input-field"
                    value={sellMinLimit}
                    onChange={(e) => setSellMinLimit(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Max Limit</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.05"
                    className="input-field"
                    value={sellMaxLimit}
                    onChange={(e) => setSellMaxLimit(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full py-2.5 font-bold mt-2"
                disabled={loading}
              >
                {loading ? 'Locking in Escrow…' : 'Publish Sell Ad (Lock Crypto)'}
              </button>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ORDERS / ESCROW ROOM TAB
            ══════════════════════════════════════════════════════════════ */}
        {mainNavTab === 'TRADES' && (
          <div className="p2p-dribbble-table-wrap p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base" style={{ color: 'var(--ink)' }}>
                  Escrow Trade Orders ({myOrdersList.length})
                </h3>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                  Confirm payment, release locked crypto, or raise arbitration disputes.
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={fetchMyOrders} disabled={fetchingMyOrders}>
                ↻ Refresh
              </button>
            </div>

            {myOrdersList.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'var(--ink-muted)' }}>
                No active escrow orders found for this account.
              </p>
            ) : (
              myOrdersList.map((ord) => (
                <div key={ord.buyOrderID} className="p2p-escrow-order-card">
                  <div className="flex justify-between items-center flex-wrap gap-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <strong style={{ color: 'var(--gold)', fontSize: '14px' }}>
                        Order #{ord.buyOrderID}
                      </strong>
                      <span className={`badge ${ord.isBuyer ? 'badge-blue' : 'badge-green'}`}>
                        {ord.isBuyer ? 'You are Buyer' : 'You are Seller'}
                      </span>
                    </div>

                    <div>
                      {ord.status === 5 && <span className="badge badge-yellow">Waiting Payment</span>}
                      {ord.status === 7 && <span className="badge badge-blue">Payment Sent</span>}
                      {ord.status === 6 && <span className="badge badge-green">Completed</span>}
                      {ord.status === 2 && <span className="badge badge-red">In Dispute</span>}
                      {ord.status === 4 && <span className="badge badge-gray">Cancelled</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
                    <div className="p-2 rounded bg-slate-800/10">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Crypto Amount</div>
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {ord.amount} {getPairSymbol(ord.pair)}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-800/10">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Bank / UPI Ref</div>
                      <div className="text-sm font-bold font-mono">{ord.bankTransferCode || 'N/A'}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-800/10">
                      <div className="text-[10px] uppercase font-bold text-slate-400">{ord.isBuyer ? 'Seller' : 'Buyer'}</div>
                      <div className="text-sm font-mono text-slate-400 truncate">
                        {ord.isBuyer ? ord.seller : ord.buyer}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {ord.isBuyer && ord.status === 5 && (
                      <button
                        className="btn btn-primary btn-sm flex-1"
                        onClick={() => handleConfirmPaid(ord.buyOrderID)}
                        disabled={loading}
                      >
                        Buyer: I Have Transferred Payment
                      </button>
                    )}

                    {ord.isSeller && ord.status === 7 && (
                      <button
                        className="btn btn-success btn-sm flex-1"
                        onClick={() => handleReleaseCrypto(ord.buyOrderID)}
                        disabled={loading}
                      >
                        Seller: Confirm Received & Release Crypto
                      </button>
                    )}

                    {(ord.status === 5 || ord.status === 7) && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--red)', borderColor: 'var(--red-bd)' }}
                        onClick={() => {
                          setTradeOrderId(ord.buyOrderID.toString())
                          const r = window.prompt(`Enter dispute reason for Order #${ord.buyOrderID}:`)
                          if (r) {
                            setCustomDisputeReason(r)
                            handleDispute()
                          }
                        }}
                      >
                        Raise Dispute
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>


      {/* ══════════════════════════════════════════════════════════════════
          EDIT AD MODAL
          ══════════════════════════════════════════════════════════════════ */}
      {editingAd && (
        <div className="p2p-modal-overlay">
          <div className="p2p-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 className="p2p-modal-title" style={{ margin: 0 }}>
                Edit Advertisement #{editingAd.orderID}
              </h3>
              <span className="badge badge-blue">
                {getPairSymbol(editingAd.pair)}
              </span>
            </div>
            <p className="p2p-modal-desc">
              Update your selling price, trade limits, payment methods, or pause listing.
            </p>

            <form onSubmit={handleSaveEditAd} className="space-y-3">
              <div>
                <label className="input-label">Unit Price ({selectedCurrency} per {getPairSymbol(editingAd.pair)})</label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="e.g. 250000"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="input-label">Min Limit ({getPairSymbol(editingAd.pair)})</label>
                  <input
                    type="number"
                    step="any"
                    className="input-field"
                    value={editMinLimit}
                    onChange={(e) => setEditMinLimit(e.target.value)}
                    placeholder="0.001"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Max Limit ({getPairSymbol(editingAd.pair)})</label>
                  <input
                    type="number"
                    step="any"
                    className="input-field"
                    value={editMaxLimit}
                    onChange={(e) => setEditMaxLimit(e.target.value)}
                    placeholder="0.05"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Accepted Payment Methods</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {['Bank Transfer', 'UPI', 'IMPS', 'Paytm'].map((method) => {
                    const isChecked = editPaymentMethods.includes(method)
                    return (
                      <button
                        type="button"
                        key={method}
                        className={`p2p-pay-tag ${isChecked ? 'active' : ''}`}
                        style={{
                          cursor: 'pointer',
                          background: isChecked ? 'var(--brand)' : 'var(--bg-surface-3)',
                          color: isChecked ? '#ffffff' : 'var(--ink)',
                          border: isChecked ? '1px solid var(--brand)' : '1px solid var(--border)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                        onClick={() => {
                          if (isChecked) {
                            if (editPaymentMethods.length > 1) {
                              setEditPaymentMethods(editPaymentMethods.filter((m) => m !== method))
                            }
                          } else {
                            setEditPaymentMethods([...editPaymentMethods, method])
                          }
                        }}
                      >
                        {isChecked ? '✓ ' : '+ '}{method}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="input-label">Payment Instructions / Auto-Reply Note</label>
                <input
                  type="text"
                  className="input-field"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="e.g. Pay to UPI: user@okhdfcbank, instant release"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Listing Status</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                    {editIsPaused ? 'Currently Hidden / Paused from Marketplace' : 'Currently Active on Marketplace'}
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${editIsPaused ? 'btn-secondary' : 'btn-outline'}`}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => setEditIsPaused(!editIsPaused)}
                >
                  {editIsPaused ? 'Resume Listing' : 'Pause Listing'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                <button
                  type="submit"
                  className="btn btn-primary flex-1 py-2"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  className="btn btn-secondary py-2"
                  onClick={() => setEditingAd(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
