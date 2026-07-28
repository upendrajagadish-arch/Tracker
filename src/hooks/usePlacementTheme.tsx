import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type PlacementTheme = 'light' | 'dark' | 'system'

interface PlacementThemeContextValue {
  theme: PlacementTheme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: PlacementTheme) => void
}

const PlacementThemeContext = createContext<PlacementThemeContextValue | null>(null)
const STORAGE_KEY = 'codetrace-placement-theme'

export function PlacementThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<PlacementTheme>(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark'
  })

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    if (theme === 'light' || theme === 'dark') return theme
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [theme])

  const setTheme = useCallback((nextTheme: PlacementTheme) => {
    setThemeState(nextTheme)
    localStorage.setItem(STORAGE_KEY, nextTheme)
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return (
    <PlacementThemeContext.Provider value={value}>
      {children}
    </PlacementThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlacementTheme() {
  const value = useContext(PlacementThemeContext)
  if (!value) throw new Error('usePlacementTheme must be used inside PlacementThemeProvider')
  return value
}

