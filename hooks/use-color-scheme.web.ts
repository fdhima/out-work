import { useTheme } from '@/context/ThemeContext'

/**
 * Web-compatible version — delegates to ThemeContext which handles
 * both user preference and system scheme.
 */
export function useColorScheme() {
  const { colorScheme } = useTheme()
  return colorScheme
}
