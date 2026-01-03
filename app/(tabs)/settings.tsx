import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useAuth } from '@/context/AuthContext'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useThemeColor } from '@/hooks/use-theme-color'
import { supabase } from '@/lib/supabase'
import { getUsernameById, updateProfile } from '@/services/profiles'
import { getUserId } from '@/services/users'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

export default function ProfileScreen() {
  const { session, signOut } = useAuth()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'

  // Theme Colors
  const textColor = useThemeColor({}, 'text')
  const iconColor = useThemeColor({}, 'icon')
  const backgroundColor = useThemeColor({}, 'background')
  const primaryColor = '#ff6b35' // OutWork Orange
  const inputBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#f9fafb'

  // Data State
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [email] = useState(session?.user?.email || '')

  // Security State
  const [showSecurity, setShowSecurity] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setProfileLoading(true)
      const userId = await getUserId()
      if (userId) {
        const name = await getUsernameById(userId)
        setFullName(name ?? '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    setLoading(true)
    try {
      const userId = await getUserId()
      if (!userId) throw new Error('No user found')

      // 1. Update Profile Name
      if (fullName.trim()) {
        await updateProfile(userId, { full_name: fullName, updated_at: new Date().toISOString() })
      }

      // 2. Update Password if provided
      if (currentPassword && newPassword) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email,
          password: currentPassword,
        })
        if (authError) throw new Error('Current password is incorrect')

        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        })
        if (updateError) throw updateError

        // Clear password fields
        setCurrentPassword('')
        setNewPassword('')
        setShowSecurity(false)
        Alert.alert('Success', 'Profile and password updated')
      } else {
        Alert.alert('Success', 'Profile updated')
      }

    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut()
            router.replace('/auth/signin')
          }
        }
      ]
    )
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <ThemedText style={styles.avatarText}>
                {fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
              </ThemedText>
              <View style={styles.editIconBadge}>
                <MaterialIcons name="edit" size={14} color="#fff" />
              </View>
            </View>
            <ThemedText type="title" style={styles.headerTitle}>Profile</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Manage your personal details
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your Name"
                placeholderTextColor={iconColor}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email Address</ThemedText>
              <View style={[styles.readOnlyInput, { backgroundColor: inputBg }]}>
                <ThemedText style={{ color: iconColor }}>{email}</ThemedText>
                <MaterialIcons name="lock-outline" size={16} color={iconColor} />
              </View>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Security Toggle */}
          <TouchableOpacity
            style={styles.securityHeader}
            onPress={() => setShowSecurity(!showSecurity)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 107, 53, 0.1)' }]}>
                <MaterialIcons name="security" size={20} color={primaryColor} />
              </View>
              <View>
                <ThemedText type="defaultSemiBold">Login & Security</ThemedText>
                <ThemedText style={{ fontSize: 13, opacity: 0.6 }}>Change password</ThemedText>
              </View>
            </View>
            <MaterialIcons name={showSecurity ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color={iconColor} />
          </TouchableOpacity>

          {showSecurity && (
            <View style={styles.securitySection}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Current Password</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={iconColor}
                  secureTextEntry
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>New Password</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={iconColor}
                  secureTextEntry
                />
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: primaryColor }]}
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>Update Profile</ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <ThemedText style={styles.signOutText}>Log Out</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />


        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 50 : 70,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#ff6b35',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  section: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    marginLeft: 4,
  },
  input: {
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  readOnlyInput: {
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.7,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 32,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securitySection: {
    marginTop: 24,
    gap: 20,
  },
  actionContainer: {
    marginTop: 48,
    gap: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#ff6b35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  }
})