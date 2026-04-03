import { AuthProvider } from '@/context/AuthContext'
import { FavoritesProvider } from '@/context/FavoritesContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

SplashScreen.preventAutoHideAsync()

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    // GestureHandlerRootView must wrap the entire app for react-native-gesture-handler v2
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <ThemeProvider>
        <AuthProvider>
          <FavoritesProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </FavoritesProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}