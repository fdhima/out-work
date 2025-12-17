import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useAuth } from '@/context/AuthContext'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useThemeColor } from '@/hooks/use-theme-color'
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

export default function Profile() {
  const { session, signOut } = useAuth()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const textColor = useThemeColor({}, 'text')
  const iconColor = useThemeColor({}, 'icon')

  // Form States
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(session?.user?.user_metadata?.full_name || '')
  const [email, setEmail] = useState(session?.user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleSignOut = async () => {
    await signOut()
    router.replace('/auth/signin')
  }

  const handleUpdateProfile = async () => {
    setLoading(true)
    // Add your supabase.auth.updateUser logic here
    setTimeout(() => setLoading(false), 1000) 
  }

  const inputBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6'
  const cardBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)'

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
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <ThemedText type="title" style={styles.title}>
              Your Profile
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Manage your account settings
            </ThemedText>

            {/* Account Details Section */}
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              textColor={textColor}
              iconColor={iconColor}
              backgroundColor={inputBg}
            />

            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              editable={false} // Usually email is locked or requires specific flow
              textColor={textColor}
              iconColor={iconColor}
              backgroundColor={inputBg}
              style={{ opacity: 0.6 }}
            />

            <View style={styles.separator} />

            {/* Password Change Section */}
            <ThemedText style={styles.sectionLabel}>Security</ThemedText>
            
            <Input
              label="Current Password"
              placeholder="••••••••"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              textColor={textColor}
              iconColor={iconColor}
              backgroundColor={inputBg}
            />

            <Input
              label="New Password"
              placeholder="••••••••"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              textColor={textColor}
              iconColor={iconColor}
              backgroundColor={inputBg}
            />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#2563eb' }]} // Using a primary brand color
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.primaryText} lightColor="#fff" darkColor="#fff">
                  Update Profile
                </ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.15)' : '#fee2e2' },
              ]}
              onPress={handleSignOut}
            >
              <ThemedText style={[styles.secondaryText, { color: '#ef4444' }]}>
                Sign Out
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  )
}

// Reusable Input Component (Matching your Login screen)
function Input({ label, textColor, iconColor, backgroundColor, style, ...props }: any) {
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
            borderColor: backgroundColor === 'rgba(255, 255, 255, 0.1)' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
          },
          style,
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
    paddingTop: 60, // Extra padding for top tabs
    paddingBottom: 32,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    gap: 8,
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
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 10,
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
  primaryButton: {
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryText: {
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontWeight: '600',
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginVertical: 20,
  },
})