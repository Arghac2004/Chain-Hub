import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { http, fallback } from 'viem'
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  avalanche,
  sepolia,
  polygonAmoy,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
  bscTestnet,
  avalancheFuji,
} from '@reown/appkit/networks'

const projectId = '131bd357f25e32786c71a7d466f86a5e'

// ─── Mainnets & Testnets ───────────────────────────────────────────────────
export const mainnetNetworks = [
  bsc,              // BNB Chain (Primary)
  mainnet,          // Ethereum Mainnet
  polygon,          // Polygon POS
  arbitrum,         // Arbitrum One
  optimism,         // OP Mainnet
  base,             // Base
  avalanche,        // Avalanche C-Chain
]

export const testnetNetworks = [
  sepolia,          // Ethereum Sepolia (Primary)
  bscTestnet,       // BNB Testnet
  polygonAmoy,      // Polygon Amoy
  arbitrumSepolia,  // Arbitrum Sepolia
  optimismSepolia,  // Optimism Sepolia
  baseSepolia,      // Base Sepolia
  avalancheFuji,    // Avalanche Fuji
]

export const networks = [
  ...testnetNetworks,
  ...mainnetNetworks,
]

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
  transports: {
    [sepolia.id]: fallback([
      http('https://ethereum-sepolia-rpc.publicnode.com'),
      http('https://rpc.sepolia.org'),
      http('https://1rpc.io/sepolia'),
      http('https://rpc2.sepolia.org'),
    ]),
    [bscTestnet.id]: fallback([
      http('https://data-seed-prebsc-1-s1.binance.org:8545'),
      http('https://bsc-testnet.publicnode.com'),
      http('https://1rpc.io/bnb-testnet'),
      http('https://bsc-testnet-rpc.publicnode.com'),
    ]),
    [bsc.id]: fallback([
      http('https://bsc-dataseed.binance.org'),
      http('https://bsc.publicnode.com'),
      http('https://1rpc.io/bnb'),
    ]),
  },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

const metadata = {
  name: 'ChainHub',
  description: 'Web3 P2P & Referral Platform',
  url: 'http://localhost:5173',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: sepolia,   // Default: Ethereum Sepolia Testnet
  projectId,
  metadata,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#6366f1',
    '--w3m-border-radius-master': '12px',
    '--w3m-font-family': 'Inter, sans-serif',
  },
  features: {
    analytics: true,
    email: false,
    socials: false,
    onramp: true,
  },
})
