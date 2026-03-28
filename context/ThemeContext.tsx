import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useState } from 'react'
import { useColorScheme as useSystemColorScheme } from 'react-native'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedColorScheme = 'light' | 'dark'

const STORAGE_KEY = '@theme_preference'

interface ThemeContextValue {
  theme: ThemePreference
  colorScheme: ResolvedColorScheme
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  colorScheme: 'light',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? 'light'
  const [theme, setThemeState] = useState<ThemePreference>('system')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored)
      }
      setLoaded(true)
    })
  }, [])

  const setTheme = (preference: ThemePreference) => {
    setThemeState(preference)
    AsyncStorage.setItem(STORAGE_KEY, preference)
  }

  const colorScheme: ResolvedColorScheme =
    theme === 'system' ? systemScheme : theme

  if (!loaded) return null

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
