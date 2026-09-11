import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './config/web3.js'
import { ThemeProvider } from './hooks/ThemeContext.js'

import Navbar from './components/Navbar.js'
import DashboardPage from './pages/DashboardPage.js'
import TransactionsPage from './pages/TransactionsPage.js'
import PortfolioPage from './pages/PortfolioPage.js'
import CampaignManagerPage from './pages/CampaignManagerPage.js'
import AdminPage from './pages/AdminPage.js'
import LoginPage from './pages/LoginPage.js'
import P2PPage from './pages/P2PPage.js'
import DisputeRefundPage from './pages/DisputeRefundPage.js'

import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

function App() {
  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <div className="min-h-screen app-root">
              <Navbar />
              <main className="w-full pl-0 pr-2.5 sm:pr-4 lg:pr-5 py-2.5 pb-12">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/p2p" element={<P2PPage />} />
                  <Route path="/p2p/refunds" element={<DisputeRefundPage />} />
                  <Route path="/disputes" element={<DisputeRefundPage />} />
                  <Route path="/campaigns" element={<CampaignManagerPage />} />
                  <Route path="/contract-manager" element={<CampaignManagerPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/portfolio" element={<PortfolioPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin-login" element={<AdminPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}

export default App
