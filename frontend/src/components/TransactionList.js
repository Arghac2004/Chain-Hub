import React from 'react'

const STATUS_BADGE = {
  success:  'badge-green',
  pending:  'badge-yellow',
  failed:   'badge-red',
  unknown:  'badge-blue',
}

function shortHash(hash) {
  if (!hash) return '—'
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

function shortAddr(addr) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

/**
 * TransactionList – table of saved on-chain transactions.
 */
function TransactionList({ transactions = [], loading, address, onSave }) {

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Loading transactions…</span>
        </div>
      </div>
    )
  }

  return (
    <div id="transactions" className="card space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-200">Transaction History</h2>
        <span className="text-xs text-gray-500">{transactions.length} records</span>
      </div>

      {/* Empty state */}
      {transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24"
               stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0
                 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2
                 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 text-sm">No transactions saved yet.</p>
        </div>
      )}

      {/* Table */}
      {transactions.length > 0 && (
        <div className="overflow-x-auto -mx-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Tx Hash', 'From', 'To', 'Value', 'Network', 'Status', 'Date'].map(h => (
                  <th key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500
                               uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-brand-400 whitespace-nowrap">
                    {shortHash(tx.txHash)}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">
                    {shortAddr(tx.from)}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">
                    {shortAddr(tx.to)}
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {tx.value} ETH
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {tx.network}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`badge ${STATUS_BADGE[tx.status] ?? STATUS_BADGE.unknown}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

export default TransactionList
