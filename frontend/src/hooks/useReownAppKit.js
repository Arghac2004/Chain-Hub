import { useCallback } from 'react'
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi'
import { appKit } from '../config/web3.js'


export function useReownAppKit() {
  const { address, isConnected, isConnecting, isReconnecting, chain, connector } = useAccount()
  const { disconnect, isPending: isDisconnecting } = useDisconnect()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()

  //  Connect Function (Opens Reown AppKit Modal) ──
  const connect = useCallback(async () => {
    try {
      if (appKit && typeof appKit.open === 'function') {
        await appKit.open({ view: 'Connect' })
      }
    } catch (e) {
      console.warn('[useReownAppKit] connect fallback:', e)
      try {
        if (appKit && typeof appKit.open === 'function') {
          await appKit.open()
        }
      } catch {}
    }
  }, [])

  //  Disconnect Function 
  const handleDisconnect = useCallback(async () => {
    try {
      if (disconnect) {
        disconnect()
      }
      if (appKit && typeof appKit.close === 'function') {
        appKit.close()
      }
    } catch (e) {
      console.warn('[useReownAppKit] disconnect error:', e)
      if (disconnect) disconnect()
    }
  }, [disconnect])

  //  Open Account View in Reown AppKit ──
  const openAccount = useCallback(async () => {
    try {
      if (appKit && typeof appKit.open === 'function') {
        await appKit.open({ view: 'Account' })
      }
    } catch (e) {
      try {
        if (appKit && typeof appKit.open === 'function') {
          await appKit.open()
        }
      } catch {}
    }
  }, [])

  //  Open Network Switcher in Reown AppKit ──
  const openNetworks = useCallback(async () => {
    try {
      if (appKit && typeof appKit.open === 'function') {
        await appKit.open({ view: 'Networks' })
      }
    } catch (e) {
      try {
        if (appKit && typeof appKit.open === 'function') {
          await appKit.open()
        }
      } catch {}
    }
  }, [])

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
  const walletName = connector?.name || 'Wallet'

  return {
    address,
    shortAddress,
    isConnected: Boolean(isConnected),
    isConnecting: Boolean(isConnecting || isReconnecting),
    isDisconnecting: Boolean(isDisconnecting),
    chain,
    walletName,
    connect,
    disconnect: handleDisconnect,
    openAccount,
    openNetworks,
    switchChain,
    isSwitchingChain: Boolean(isSwitchingChain),
  }
}

export default useReownAppKit
