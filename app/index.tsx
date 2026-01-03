// import { useAuth } from '@/context/AuthContext'
// import { Redirect } from 'expo-router'

// export default function Index() {
//   const { session, loading } = useAuth()

//   if (loading) return null

//   if (!session) {
//     return <Redirect href="./auth/signin" />
//   }

//   return <Redirect href="/(tabs)" />
// }
import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) return null;

  if (!session) {
    return <Redirect href="/auth/signin" />;
  }

  return <Redirect href="/(tabs)" />;
}
