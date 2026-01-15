import { AuthProvider } from '@/context/AuthContext'
import { FavoritesProvider } from '@/context/FavoritesContext'
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <FavoritesProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </FavoritesProvider>
  )
}