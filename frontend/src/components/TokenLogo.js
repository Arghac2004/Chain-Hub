import React from 'react'

export function EthLogo({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={`flex-shrink-0 ${className}`}>
      <circle cx="16" cy="16" r="16" fill="#627EEA" fillOpacity="0.2" />
      <g transform="translate(8, 4) scale(0.5)">
        <path d="M16 0L15.65 1.18V21.87L16 22.22L25.6 16.54L16 0Z" fill="#8C9FEE" />
        <path d="M16 0L6.40002 16.54L16 22.22V11.89V0Z" fill="#627EEA" />
        <path d="M16 24.18L15.75 24.49V32.48L16 33.22L25.61 18.51L16 24.18Z" fill="#8C9FEE" />
        <path d="M16 33.22V24.18L6.40002 18.51L16 33.22Z" fill="#627EEA" />
        <path d="M16 22.22L25.6 16.54L16 11.89V22.22Z" fill="#3B5998" fillOpacity="0.4" />
        <path d="M6.40002 16.54L16 22.22V11.89L6.40002 16.54Z" fill="#1B365D" fillOpacity="0.4" />
      </g>
    </svg>
  )
}

export function HubLogo({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={`flex-shrink-0 ${className}`}>
      <circle cx="16" cy="16" r="16" fill="#a855f7" fillOpacity="0.2" />
      <rect x="6" y="6" width="20" height="20" rx="6" fill="linear-gradient(135deg, #6366f1, #a855f7)" />
      <path d="M12 16L15 11H19L22 16L19 21H15L12 16Z" stroke="#ffffff" strokeWidth="1.8" fill="none" />
      <circle cx="17" cy="16" r="2" fill="#ffffff" />
    </svg>
  )
}

export function UsdtLogo({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={`flex-shrink-0 ${className}`}>
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        d="M17.9 14.8c-.1 0-.7.1-1.9.1-1 0-1.7 0-1.9-.1-4.2-.2-7.3-.9-7.3-1.8s3.1-1.6 7.3-1.8v2.8c.2 0 .9.1 1.9.1 1.1 0 1.8 0 1.9-.1V11.2c4.2.2 7.3.9 7.3 1.8 0 .9-3.1 1.6-7.3 1.8zm0 1.1c4.1-.2 7.2-.9 7.2-1.7 0-.6-1.7-1.1-4.2-1.4v2.5c-.7.1-1.8.2-3 .2s-2.3-.1-3-.2v-2.5c-2.5.3-4.2.8-4.2 1.4 0 .8 3.1 1.5 7.2 1.7v6.6h-2.8v1.9h7.5v-1.9h-2.8v-6.6z"
        fill="#ffffff"
      />
    </svg>
  )
}

export function TokenLogo({ symbol, size = 16, className = '' }) {
  const sym = (symbol || '').toUpperCase()
  if (sym.includes('ETH')) return <EthLogo size={size} className={className} />
  if (sym.includes('HUB')) return <HubLogo size={size} className={className} />
  if (sym.includes('USDT') || sym.includes('USD')) return <UsdtLogo size={size} className={className} />
  
  // Generic Fallback Token
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-[9px] flex-shrink-0 ${className}`}
    >
      {sym.slice(0, 2)}
    </div>
  )
}

export function ChainHubLogo({ size = 36, className = '' }) {
  return (
    <div className={`relative flex-shrink-0 flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="chLogoChromeGrad" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="45%" stopColor="#4f46e5" />
            <stop offset="75%" stopColor="#2e1065" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id="chLogoSpecularGlow" x1="6" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
          <filter id="chLogoShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.45" />
          </filter>
        </defs>
        
        {/* Background 3D Hex Shield */}
        <rect x="2" y="2" width="32" height="32" rx="9" fill="url(#chLogoChromeGrad)" filter="url(#chLogoShadow)" />
        <rect x="2" y="2" width="32" height="32" rx="9" stroke="url(#chLogoSpecularGlow)" strokeWidth="1.2" />

        {/* Intertwined Geometric Node Link */}
        <path
          d="M11 18L15 12H21L25 18L21 24H15L11 18Z"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="18" r="3.2" fill="#c084fc" />
        <path d="M18 10V14M18 22V26M11 18H14M22 18H25" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default TokenLogo
