import React, { useEffect } from 'react'
import { useAccount } from 'wagmi'
import WalletCard from './WalletCard.js'
import TransactionList from './TransactionList.js'
import useWallet from '../hooks/useWallet.js'

/**
 * Dashboard – main page shown after connecting wallet.
 */
function Dashboard() {
  const { address, isConnected } = useAccount()
  const { user, transactions, loading, registerOrLogin, saveTransaction } = useWallet()

  // Auto-register / login when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      registerOrLogin(address)
    }
  }, [isConnected, address])

  return (
    <div className="space-y-8">

      {/* ── Hero banner (shown when not connected) ── */}
      {!isConnected && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br
                             from-brand-900 via-gray-900 to-gray-950 border border-brand-900/50
                             p-10 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
                          from-brand-600/20 via-transparent to-transparent" />
          <div className="relative space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Welcome to <span className="text-brand-400">ChainHub</span>
            </h1>
            <p className="text-gray-400 max-w-md mx-auto text-lg">
              Connect any wallet – MetaMask, Coinbase, Rainbow & more.
              Powered by <span className="text-white font-medium">Reown AppKit</span>.
            </p>
            <div className="flex justify-center pt-2">
              <appkit-button label="Connect Wallet" size="lg" />
            </div>
          </div>
        </section>
      )}

      {/* ── Main grid (shown when connected) ── */}
      {isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sidebar – wallet & stats */}
          <div className="space-y-4">
            <WalletCard />

            {/* User profile card */}
            {user && (
              <div className="card space-y-3">
                <h3 className="font-semibold text-gray-200 text-sm">Profile</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center
                                  justify-center font-bold text-white text-sm">
                    {(user.username ?? address?.slice(2, 4) ?? '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-200 text-sm">
                      {user.username ?? 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <p className="text-xs text-gray-500">Transactions</p>
                <p className="text-2xl font-bold text-brand-400">
                  {loading ? '…' : transactions.length}
                </p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-gray-500">Networks</p>
                <p className="text-2xl font-bold text-brand-400">5</p>
              </div>
            </div>
          </div>

          {/* Main content – transactions */}
          <div className="lg:col-span-2">
            <TransactionList
              transactions={transactions}
              loading={loading}
              address={address}
              onSave={saveTransaction}
            />
          </div>

        </div>
      )}
    </div>
  )
}

export default Dashboard
