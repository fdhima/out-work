import { AuthProvider } from '@/context/AuthContext'
import { FavoritesProvider } from '@/context/FavoritesContext'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'

export default function RootLayout() {
  return (
    // GestureHandlerRootView must wrap the entire app for react-native-gesture-handler v2
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <AuthProvider>
        <FavoritesProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </FavoritesProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  )
}