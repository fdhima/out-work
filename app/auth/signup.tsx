import { Redirect } from 'expo-router'

export default function RegisterScreen() {
  // Redirect to signin with signup tab
  return <Redirect href="/auth/signin?tab=signup" />
}
