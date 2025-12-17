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

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const colorScheme = useColorScheme() ?? 'light'
  const textColor = useThemeColor({}, 'text')
  const tintColor = useThemeColor({}, 'tint')
  const iconColor = useThemeColor({}, 'icon')

  const signIn = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      router.replace('/')
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  colorScheme === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.95)',
              },
            ]}
          >
            <ThemedText type="title" style={styles.title}>
              Welcome back
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Sign in to continue
            </ThemedText>

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

            {error ? (
              <ThemedText style={[styles.error, { color: '#ef4444' }]}>
                {error}
              </ThemedText>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    colorScheme === 'dark'
                      ? 'rgba(255, 255, 255, 0.15)'
                      : '#e5e7eb',
                },
              ]}
              onPress={signIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText
                  lightColor="#fff"
                  darkColor="#fff"
                  style={styles.primaryText}
                >
                  Sign In
                </ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor:
                    colorScheme === 'dark'
                      ? 'rgba(255, 255, 255, 0.15)'
                      : '#e5e7eb',
                },
              ]}
              onPress={() => router.push('/auth/signup')}
              disabled={loading}
            >
              <ThemedText style={styles.secondaryText}>
                Create an account
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

