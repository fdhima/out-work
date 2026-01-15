import { AuthProvider } from '@/context/AuthContext'
import { FavoritesProvider } from '@/context/FavoritesContext'
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </FavoritesProvider>
    </AuthProvider>
  )
}