import axios from 'axios'

const TOKEN_KEY = 'chainhub_jwt'

// ── Token helpers ─────────────────────────────────────────────────────────────
export const tokenStore = {
  get:    ()      => localStorage.getItem(TOKEN_KEY),
  set:    (token) => localStorage.setItem(TOKEN_KEY, token),
  remove: ()      => localStorage.removeItem(TOKEN_KEY),
}

// ── Pre-configured Axios instance ─────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor – attach JWT Bearer token automatically ───────────────
apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor – handle 401 (token expired / invalid) ──────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const msg    = error.response?.data?.message ?? error.message ?? 'Unknown error'

    // Token expired or invalid → clear it so user re-connects
    if (status === 401) {
      console.warn('[API] 401 – clearing stored token')
      tokenStore.remove()
    }

    console.error(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} →`, msg)
    return Promise.reject(error)
  }
)
