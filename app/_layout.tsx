// import { supabase } from '@/lib/supabase'
// import { Stack } from 'expo-router'
// import { useEffect, useState } from 'react'

// export default function RootLayout() {
//   const [session, setSession] = useState<any>(null)
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     supabase.auth.getSession().then(({ data }) => {
//       setSession(data.session)
//       setLoading(false)
//     })

//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange((_event, session) => {
//       setSession(session)
//     })

//     return () => subscription.unsubscribe()
//   }, [])

//   if (loading) return null

//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//       {!session ? (
//         <Stack.Screen name="(auth)" />
//       ) : (
//         <Stack.Screen name="(tabs)" />
//       )}
//     </Stack>
//   )
// }
import { AuthProvider } from '@/context/AuthContext'
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  )
}
