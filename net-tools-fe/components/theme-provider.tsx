'use client'

import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'

export interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark' | undefined
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

const DEFAULT_STORAGE_KEY = 'net-tools-theme'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = DEFAULT_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark' | undefined>(undefined)

  React.useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setThemeState(stored)
    }
  }, [storageKey])

  React.useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    applyTheme(resolved)
    setResolvedTheme(resolved)

    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = mq.matches ? 'dark' : 'light'
      applyTheme(next)
      setResolvedTheme(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = React.useCallback(
    (next: Theme) => {
      setThemeState(next)
      localStorage.setItem(storageKey, next)
    },
    [storageKey],
  )

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
