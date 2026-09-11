import { useState, useCallback } from 'react'
import { apiClient, tokenStore } from '../api/client.js'

function useWallet() {
  const [user, setUser]                 = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [token, setToken]               = useState(() => tokenStore.get())

  // ── Register / login → get JWT 
  const registerOrLogin = useCallback(async (address) => {
    if (!address) return

    // If we already have a valid stored token, skip re-login
    const existing = tokenStore.get()
    if (existing) {
      try {
        const { data } = await apiClient.get('/users/me')
        setUser(data.user)
        await fetchTransactions(address)
        return
      } catch {
        // token expired/invalid – continue to fresh login
        tokenStore.remove()
        setToken(null)
      }
    }

    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/users/connect', {
        walletAddress: address,
      })

      // ── Store JWT 
      tokenStore.set(data.token)
      setToken(data.token)
      setUser(data.user)

      await fetchTransactions(address)
    } catch (err) {
      console.error('[registerOrLogin]', err)
      setError(err.response?.data?.message ?? err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch transactions (JWT sent automatically)
  const fetchTransactions = useCallback(async (address) => {
    if (!address) return
    try {
      const { data } = await apiClient.get(`/transactions/${address}`)
      setTransactions(data.transactions ?? [])
    } catch (err) {
      console.error('[fetchTransactions]', err)
    }
  }, [])

  // ── Save a transaction
  const saveTransaction = useCallback(async (txData) => {
    try {
      const { data } = await apiClient.post('/transactions', txData)
      setTransactions((prev) => [data.transaction, ...prev])
      return data.transaction
    } catch (err) {
      console.error('[saveTransaction]', err)
      setError(err.response?.data?.message ?? err.message)
      return null
    }
  }, [])

  // ── Logout – clear token + state 
  const logout = useCallback(() => {
    tokenStore.remove()
    setToken(null)
    setUser(null)
    setTransactions([])
  }, [])

  return {
    user,
    token,
    transactions,
    loading,
    error,
    isAuthenticated: !!token,
    registerOrLogin,
    fetchTransactions,
    saveTransaction,
    logout,
  }
}

export default useWallet
