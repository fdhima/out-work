import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useThemeColor } from '@/hooks/use-theme-color'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

export default function RegisterScreen() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const colorScheme = useColorScheme() ?? 'light'
  const textColor = useThemeColor({}, 'text')
  const tintColor = useThemeColor({}, 'tint')
  const iconColor = useThemeColor({}, 'icon')

  const signUp = async () => {
    if (!username.trim()) {
      setError('Username is required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setMessage(null)

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username, // 👈 stored in user_metadata
          },
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      setMessage('Check your email to confirm your account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <ThemedText type="title" style={styles.title}>
              Create account
            </ThemedText>

            <ThemedText type="subtitle" style={styles.subtitle}>
              Join us to get started
            </ThemedText>

            {/* Username */}
            <Input
              label="Username"
              placeholder="your_username"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
              textColor={textColor}
              iconColor={iconColor}
              backgroundColor={
                colorScheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : '#f3f4f6'
              }
            />

            {/* Email */}
            <Input
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              textColor={textColor}
              iconColor={iconColor}
              backgroundColor={
                colorScheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : '#f3f4f6'
              }
            />

            {/* Password */}
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              textColor={textColor}
              iconColor={iconColor}
              backgroundColor={
                colorScheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : '#f3f4f6'
              }
            />

            {error && (
              <ThemedText style={[styles.error, { color: '#ef4444' }]}>
                {error}
              </ThemedText>
            )}

            {message && (
              <ThemedText style={[styles.success, { color: '#16a34a' }]}>
                {message}
              </ThemedText>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={signUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.primaryText}>
                  Sign Up
                </ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/auth/signin')}
            >
              <ThemedText style={styles.secondaryText}>
                Already have an account? Sign in
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  )
}

interface InputProps {
  label: string
  textColor: string
  iconColor: string
  backgroundColor: string
  [key: string]: any
}

function Input({
  label,
  textColor,
  iconColor,
  backgroundColor,
  ...props
}: InputProps) {
  return (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        {...props}
        style={[
          styles.input,
          {
            backgroundColor,
            color: textColor,
            borderColor:
              backgroundColor === 'rgba(255, 255, 255, 0.1)'
                ? 'rgba(255, 255, 255, 0.2)'
                : 'transparent',
          },
        ]}
        placeholderTextColor={iconColor}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 24,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.9,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 52,
    borderWidth: 1,
  },
  error: {
    textAlign: 'center',
    marginVertical: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  success: {
    textAlign: 'center',
    marginVertical: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    // shadowColor: '#0a7ea4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryText: {
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryText: {
    fontWeight: '600',
    fontSize: 16,
  },
})
