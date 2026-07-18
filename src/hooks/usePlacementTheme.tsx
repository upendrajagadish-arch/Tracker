import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'

export type PlacementTheme = 'light' | 'dark' | 'system'

interface PlacementThemeContextValue {
  theme: PlacementTheme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: PlacementTheme) => void
}

const PlacementThemeContext = createContext<PlacementThemeContextValue | null>(null)
const STORAGE_KEY = 'codetrace-placement-theme'

export function PlacementThemeProvider({ children }: { children: ReactNode }) {
  const theme: PlacementTheme = 'dark'
  const resolvedTheme = 'dark' as const
  const setTheme = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  }, [])

  useEffect(() => {
    setTheme()
  }, [setTheme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [setTheme],
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

