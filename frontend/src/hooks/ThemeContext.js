/**
 * ThemeContext.js
 * ──────────────────────────────────────────────────────────────
 * 4-Mode Theme Engine:
 *   'dark'   → Always dark
 *   'light'  → Always light
 *   'system' → Follows OS prefers-color-scheme
 *   'auto'   → Time-based: 7:00–19:00 = light, else dark
 * ──────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'chainhub-theme-mode'
const AUTO_DAY_START = 7   // 7:00 AM
const AUTO_DAY_END   = 19  // 7:00 PM

/** Returns 'dark' | 'light' based on current hour */
function getAutoTheme() {
  const h = new Date().getHours()
  return h >= AUTO_DAY_START && h < AUTO_DAY_END ? 'light' : 'dark'
}

/** Returns 'dark' | 'light' from OS preference */
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Apply or remove 'dark'/'light' class from <html> */
function applyTheme(resolved) {
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }
}

export function ThemeProvider({ children }) {
  const [mode, setModeRaw] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'dark'
  })

  /** Resolve the actual dark/light from the current mode */
  const resolveTheme = useCallback((m) => {
    if (m === 'dark')   return 'dark'
    if (m === 'light')  return 'light'
    if (m === 'system') return getSystemTheme()
    if (m === 'auto')   return getAutoTheme()
    return 'dark'
  }, [])

  /** Set mode and persist to localStorage */
  const setMode = useCallback((m) => {
    setModeRaw(m)
    localStorage.setItem(STORAGE_KEY, m)
    applyTheme(resolveTheme(m))
  }, [resolveTheme])

  /** Apply theme on first render */
  useEffect(() => {
    applyTheme(resolveTheme(mode))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** System mode: listen to OS theme changes */
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(getSystemTheme())
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  /** Auto mode: check every minute if time boundary crossed */
  useEffect(() => {
    if (mode !== 'auto') return
    applyTheme(getAutoTheme()) // apply immediately

    const tick = setInterval(() => {
      applyTheme(getAutoTheme())
    }, 60 * 1000) // check every 60s

    return () => clearInterval(tick)
  }, [mode])

  const resolved = resolveTheme(mode)

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved, isDark: resolved === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

/** Hook to consume theme context */
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export default ThemeContext
