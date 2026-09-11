import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { formatEther } from 'viem'
import { P2P_CONTRACT_ADDRESS, P2P_ABI } from '../config/p2pContract.js'
import { TokenLogo } from '../components/TokenLogo.js'
import './DisputeRefundPage.css'

const DISPUTE_REASONS = [
  'Paid via UPI/Bank, but Seller has not released crypto',
  "Buyer marked 'Paid', but no payment received in bank",
  'Payment amount received is less than agreed order amount',
  'Seller bank details or UPI ID was incorrect',
  'Other issue (Enter custom remarks)',
]

export const ACCOUNT_5_ADMIN = '0x3Dc08222B824a86f2d15A1b8e6D7C0C5BB5aD5C9'

function shortAddr(addr) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function DisputeRefundPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)
  const [activeSubTab, setActiveSubTab] = useState('RAISE_DISPUTE') 

  // Raise Dispute Form State
  const [buyOrderIdInput, setBuyOrderIdInput] = useState('')
  const [selectedReason, setSelectedReason] = useState(DISPUTE_REASONS[0])
  const [customRemark, setCustomRemark] = useState('')

  // Disputes List State
  const [disputesList, setDisputesList] = useState([])
  const [contractAdmin, setContractAdmin] = useState('')
  const [fetching, setFetching] = useState(false)

  const getPairSymbol = (p) => {
    const num = Number(p)
    if (num === 0) return 'ETH'
    if (num === 1) return 'HUB'
    return 'USDT'
  }

  // Fetch On-Chain Admin
  const fetchContractAdmin = useCallback(async () => {
    if (!publicClient || !P2P_CONTRACT_ADDRESS) return
    try {
      const adm = await publicClient.readContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'admin',
      })
      if (adm) setContractAdmin(adm)
    } catch (e) {
      console.warn('Could not read P2P contract admin:', e)
    }
  }, [publicClient])

  const isAdmin = Boolean(
    address &&
    (address.toLowerCase() === ACCOUNT_5_ADMIN.toLowerCase() ||
     (contractAdmin && address.toLowerCase() === contractAdmin.toLowerCase()))
  )

  // Fetch All Disputes from Smart Contract
  const fetchAllDisputes = useCallback(async () => {
    if (!publicClient || !P2P_CONTRACT_ADDRESS) return
    setFetching(true)
    try {
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
            console.warn('Could not fetch buy order details:', err)
          }

          list.push({
            disputeId: Number(disputeId),
            mainOrderId: Number(info[0]),
            buyOrderId: Number(info[1]),
            reason: info[2],
            status: Number(info[4]),
            bOrder: bOrderData,
          })
          idx++
        } catch {
          break
        }
      }
      setDisputesList(list)
    } catch (err) {
      console.warn('Disputes fetch error:', err)
    } finally {
      setFetching(false)
    }
  }, [publicClient])

  useEffect(() => {
    if (isConnected) {
      fetchContractAdmin()
      fetchAllDisputes()
    }
  }, [isConnected, fetchContractAdmin, fetchAllDisputes])

  // Filter disputes for the current connected user
  const userDisputes = disputesList.filter(d => {
    if (!address) return false
    const u = address.toLowerCase()
    const buyer = d.bOrder?.buyer?.toLowerCase()
    const seller = d.bOrder?.seller?.toLowerCase()
    return buyer === u || seller === u
  })

  // Handle Raise Dispute Submit
  const handleRaiseDispute = async (e) => {
    e.preventDefault()
    if (!walletClient || !publicClient || !buyOrderIdInput) {
      return alert('Please enter Buy Order ID')
    }

    const finalReason =
      selectedReason === 'Other issue (Enter custom remarks)'
        ? customRemark.trim()
        : selectedReason

    if (!finalReason) return alert('Please enter a dispute reason')

    setLoading(true)
    setStatusMsg({ type: 'info', text: 'Submitting dispute to Smart Contract Escrow...' })

    try {
      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'raiseDispute',
        args: [BigInt(buyOrderIdInput), finalReason],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setStatusMsg({ type: 'success', text: 'Dispute Raised. Funds frozen in Escrow for Admin settlement.' })
      setBuyOrderIdInput('')
      setCustomRemark('')
      setActiveSubTab(isAdmin ? 'ALL_DISPUTES' : 'MY_DISPUTES')
      fetchAllDisputes()
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error: ' + (err.shortMessage || err.message) })
    } finally {
      setLoading(false)
    }
  }

  // Admin Decision: Refund to Buyer
  const handleRefundBuyer = async (dId) => {
    if (!walletClient || !publicClient) return
    setLoading(true)
    try {
      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'refundToBuyer',
        args: [BigInt(dId)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setStatusMsg({ type: 'success', text: `Dispute #${dId} resolved. Crypto successfully refunded to Buyer.` })
      fetchAllDisputes()
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.shortMessage || err.message })
    } finally {
      setLoading(false)
    }
  }

  // Admin Release back to Seller
  const handleRefundSeller = async (dId) => {
    if (!walletClient || !publicClient) return
    setLoading(true)
    try {
      const hash = await walletClient.writeContract({
        address: P2P_CONTRACT_ADDRESS,
        abi: P2P_ABI,
        functionName: 'refundToseller',
        args: [BigInt(dId)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      setStatusMsg({ type: 'success', text: `Dispute #${dId} resolved. Crypto returned to Seller.` })
      fetchAllDisputes()
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.shortMessage || err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="refund-page-container">
      {/* Top Banner */}
      <div className="refund-header-card">
        <div>
          <span className="refund-badge-pill">ESCROW RESOLUTION CENTER</span>
          <h1 className="refund-title">P2P Dispute & Refund Desk</h1>
          <p className="refund-subtitle">
            {isAdmin 
              ? 'Admin Mode Active (Account 5). Review on-chain proof, freeze disputed funds, and execute single-click refunds.'
              : 'Submit claims to smart contract escrow or track existing dispute arbitrations.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Link
              to="/admin"
              className="btn btn-primary text-xs py-2 px-3.5 font-bold"
            >
              Open Admin Console →
            </Link>
          )}
          <button className="refund-btn-refresh" onClick={fetchAllDisputes} disabled={fetching}>
            {fetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className="p-3.5 rounded-xl text-xs font-semibold mb-4 flex items-center justify-between"
          style={{
            backgroundColor: statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${statusMsg.type === 'error' ? 'var(--red)' : 'var(--green)'}`,
            color: statusMsg.type === 'error' ? 'var(--red)' : 'var(--green)',
          }}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="font-bold opacity-70 hover:opacity-100 ml-2">✕</button>
        </div>
      )}

      {/* Sub Navigation */}
      <div className="refund-nav-tabs">
        <button
          className={`refund-tab-btn ${activeSubTab === 'RAISE_DISPUTE' ? 'active-tab' : ''}`}
          onClick={() => setActiveSubTab('RAISE_DISPUTE')}
        >
          Raise Dispute / Refund Request
        </button>

        <button
          className={`refund-tab-btn ${activeSubTab === 'MY_DISPUTES' ? 'active-tab' : ''}`}
          onClick={() => setActiveSubTab('MY_DISPUTES')}
        >
          My Disputed Orders ({userDisputes.length})
        </button>

        {isAdmin && (
          <button
            className={`refund-tab-btn ${activeSubTab === 'ALL_DISPUTES' ? 'active-tab' : ''}`}
            onClick={() => setActiveSubTab('ALL_DISPUTES')}
          >
            All Active Dispute Cases ({disputesList.length}) [Admin View]
          </button>
        )}
      </div>

      {/* TAB 1: RAISE DISPUTE FORM */}
      {activeSubTab === 'RAISE_DISPUTE' && (
        <div className="refund-form-card">
          <h2 className="text-base font-extrabold mb-1" style={{ color: 'var(--ink)' }}>
            Submit Dispute to Smart Contract Escrow
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>
            Funds will be instantly frozen in the smart contract. Platform Admin will review off-chain proof and settle the order.
          </p>

          <form onSubmit={handleRaiseDispute}>
            <div className="refund-input-group">
              <label>Buy Order ID *</label>
              <input
                type="number"
                placeholder="e.g. 2"
                value={buyOrderIdInput}
                onChange={(e) => setBuyOrderIdInput(e.target.value)}
                required
              />
            </div>

            <div className="refund-input-group">
              <label>Select Reason Category</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
              >
                {DISPUTE_REASONS.map((r, i) => (
                  <option key={i} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {selectedReason === 'Other issue (Enter custom remarks)' && (
              <div className="refund-input-group">
                <label>Custom Remarks</label>
                <input
                  type="text"
                  placeholder="Explain the issue in detail..."
                  value={customRemark}
                  onChange={(e) => setCustomRemark(e.target.value)}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="refund-action-btn btn-submit-dispute"
              disabled={loading || !isConnected}
            >
              {loading ? 'Submitting to Blockchain...' : 'Freeze Funds & Open Dispute'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: MY DISPUTED ORDERS */}
      {activeSubTab === 'MY_DISPUTES' && (
        <div>
          {userDisputes.length === 0 ? (
            <div className="refund-empty-card">
              You have no active disputed orders. All your trades are settled normally.
            </div>
          ) : (
            <div className="space-y-4">
              {userDisputes.map((d) => {
                const pairSymbol = getPairSymbol(d.bOrder?.pair)
                return (
                  <div key={d.disputeId} className="refund-case-card">
                    <div className="refund-case-header">
                      <div>
                        <span className="refund-case-id">Dispute Case #{d.disputeId}</span>
                        <span className="refund-case-order">Buy Order ID: #{d.buyOrderId}</span>
                      </div>
                      <span className={
                        d.status === 2 ? 'status-pill-open' :
                        d.status === 6 ? 'status-pill-buyer' : 'status-pill-seller'
                      }>
                        {d.status === 2 ? 'Open (Under Admin Review)' :
                         d.status === 6 ? 'Resolved (Refunded to Buyer)' : 'Resolved (Returned to Seller)'}
                      </span>
                    </div>

                    <div className="refund-reason-box">
                      <strong>Reported Issue:</strong> "{d.reason}"
                    </div>

                    <div className="refund-audit-grid">
                      <div className="audit-col">
                        <label>Buyer Wallet</label>
                        <span>{shortAddr(d.bOrder?.buyer)}</span>
                      </div>
                      <div className="audit-col">
                        <label>Seller Wallet</label>
                        <span>{shortAddr(d.bOrder?.seller)}</span>
                      </div>
                      <div className="audit-col">
                        <label>Escrow Amount</label>
                        <div className="flex items-center gap-1">
                          <TokenLogo symbol={pairSymbol} size={14} />
                          <span className="audit-amount">
                            {d.bOrder?.amount} {pairSymbol}
                          </span>
                        </div>
                      </div>
                      <div className="audit-col">
                        <label>Bank / UPI Ref</label>
                        <span style={{ color: 'var(--amber)' }}>{d.bOrder?.bankTransferCode || '—'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-surface-3)', color: 'var(--ink-muted)' }}>
                      {d.status === 2
                        ? 'Funds are locked in smart contract escrow. Platform Admin is reviewing payment proofs.'
                        : 'This dispute has been settled on-chain.'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALL DISPUTES AUDIT LIST (ADMIN ONLY) */}
      {isAdmin && activeSubTab === 'ALL_DISPUTES' && (
        <div>
          {disputesList.length === 0 ? (
            <div className="refund-empty-card">
              No active dispute cases found on the blockchain.
            </div>
          ) : (
            <div className="space-y-4">
              {disputesList.map((d) => {
                const pairSymbol = getPairSymbol(d.bOrder?.pair)
                return (
                  <div key={d.disputeId} className="refund-case-card">
                    <div className="refund-case-header">
                      <div>
                        <span className="refund-case-id">Dispute Case #{d.disputeId}</span>
                        <span className="refund-case-order">Buy Order ID: #{d.buyOrderId}</span>
                      </div>
                      <span className={
                        d.status === 2 ? 'status-pill-open' :
                        d.status === 6 ? 'status-pill-buyer' : 'status-pill-seller'
                      }>
                        {d.status === 2 ? 'Open (Funds Frozen in Escrow)' :
                         d.status === 6 ? 'Settled (Refunded to Buyer)' : 'Settled (Returned to Seller)'}
                      </span>
                    </div>

                    <div className="refund-reason-box">
                      <strong>Reported Issue:</strong> "{d.reason}"
                    </div>

                    <div className="refund-audit-grid">
                      <div className="audit-col">
                        <label>Buyer Wallet</label>
                        <span>{d.bOrder?.buyer || '—'}</span>
                      </div>
                      <div className="audit-col">
                        <label>Seller Wallet</label>
                        <span>{d.bOrder?.seller || '—'}</span>
                      </div>
                      <div className="audit-col">
                        <label>Escrow Amount</label>
                        <div className="flex items-center gap-1">
                          <TokenLogo symbol={pairSymbol} size={14} />
                          <span className="audit-amount">
                            {d.bOrder?.amount} {pairSymbol}
                          </span>
                        </div>
                      </div>
                      <div className="audit-col">
                        <label>Bank / UPI Ref</label>
                        <span style={{ color: 'var(--amber)' }}>{d.bOrder?.bankTransferCode || '—'}</span>
                      </div>
                    </div>

                    {d.status === 2 && (
                      <div className="refund-actions-row">
                        <button
                          className="refund-action-btn btn-buyer-win"
                          onClick={() => handleRefundBuyer(d.disputeId)}
                          disabled={loading}
                        >
                          Refund Crypto to Buyer (Transfer Escrow)
                        </button>
                        <button
                          className="refund-action-btn btn-seller-win"
                          onClick={() => handleRefundSeller(d.disputeId)}
                          disabled={loading}
                        >
                          Return Crypto to Seller (Release Escrow)
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
