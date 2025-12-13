import { supabase } from '@/lib/supabase'
import { createUser } from '@/services/users'
import { useRouter } from 'expo-router'
import { sha256 } from 'js-sha256'
import { useState } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

export default function SignupScreen() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const signUp = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'All fields are required')
      return
    }

    try {
      setLoading(true)

      /* 1️⃣ Supabase Auth user */
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error

      /* 2️⃣ App users table */
      await createUser({
        username,
        email,
        password_hash: sha256(password),
      })

      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Signup failed', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={signUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  link: {
    marginTop: 16,
    textAlign: 'center',
    color: '#2563eb',
    fontWeight: '500',
  },
})
