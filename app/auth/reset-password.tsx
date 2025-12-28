import { ThemedText } from '@/components/themed-text'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Ensure recovery session exists
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError('Invalid or expired recovery link.')
      }
    })
  }, [])

  const updatePassword = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      router.replace('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText type="title">Reset password</ThemedText>

      <TextInput
        placeholder="New password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}

      <TouchableOpacity
        style={styles.button}
        onPress={updatePassword}
        disabled={loading}
      >
        <ThemedText>
          {loading ? 'Updating...' : 'Update password'}
        </ThemedText>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  input: {
    borderRadius: 12,
    padding: 14,
    marginVertical: 16,
    backgroundColor: '#f3f4f6',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  error: {
    color: '#ef4444',
    marginBottom: 12,
  },
})
