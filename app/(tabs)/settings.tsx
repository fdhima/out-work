import { ThemedText } from '@/components/themed-text'
import { useAuth } from '@/context/AuthContext'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useThemeColor } from '@/hooks/use-theme-color'
import { supabase } from '@/lib/supabase'
import { getProfileById, updateProfile } from '@/services/profiles'
import { getUserId } from '@/services/users'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { File } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
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
  const isDark = colorScheme === 'dark'

  // Brand Colors
  const BRAND_BLUE = "#4A90E2";
  const primaryColor = BRAND_BLUE;

  const textColor = useThemeColor({}, 'text')
  const iconColor = useThemeColor({}, 'icon')
  // Grouped list background style
  const screenBg = isDark ? '#000' : '#f2f2f6';
  const groupBg = isDark ? '#1c1c1e' : '#fff';
  const separatorColor = isDark ? '#38383a' : '#e5e5ea'; // iOS separator colors
  const placeholderColor = isDark ? '#636366' : '#c7c7cc';

  // Data State
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [email] = useState(session?.user?.email || '')
  const [avatarUrl, setAvatarUrl] = useState('')

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
        const profile = await getProfileById(userId);
        setFullName(profile?.full_name ?? '')
        setAvatarUrl(profile?.avatar_url ?? 'Avatar not found');
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

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo access')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled) {
      await uploadAvatar(result.assets[0].uri)
    }
  }

  const uploadAvatar = async (uri: string) => {
    try {
      setLoading(true)

      const userId = await getUserId()
      if (!userId) throw new Error('No user found')

      const file = new File(uri)
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const filePath = `${userId}-avatar.${ext}`

      const mimeType = ext === 'jpg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : `image/${ext}`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, bytes, {
          contentType: mimeType,
          upsert: true,
        })

      if (error) throw error

      // Try to create a signed URL (works for private buckets). Fallback to public URL if available.
      const { data: signedData, error: signedError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days

      let finalUrl: string | undefined = signedData?.signedUrl

      if (!finalUrl) {
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)
        finalUrl = data?.publicUrl
      }

      if (!finalUrl) throw new Error('Failed to get avatar URL')

      await updateProfile(userId, { avatar_url: finalUrl, updated_at: new Date().toISOString() })
      setAvatarUrl(finalUrl)
      Alert.alert('Success', 'Avatar uploaded')

    } catch (err: any) {
      console.error(err)
      Alert.alert('Error', err?.message || 'Failed to upload avatar')
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

  // --- UI Components for Settings ---

  const SettingsGroup = ({ children, title }: { children: React.ReactNode, title?: string }) => (
    <View style={styles.groupContainer}>
      {title && <ThemedText style={styles.groupTitle}>{title.toUpperCase()}</ThemedText>}
      <View style={[styles.group, { backgroundColor: groupBg }]}>
        {children}
      </View>
    </View>
  );

  const SettingsItem = ({
    label,
    value,
    placeholder,
    onChangeText,
    isLast = false,
    readOnly = false,
    secureTextEntry = false,
    icon
  }: {
    label: string,
    value?: string,
    placeholder?: string,
    onChangeText?: (text: string) => void,
    isLast?: boolean,
    readOnly?: boolean,
    secureTextEntry?: boolean,
    icon?: string
  }) => (
    <View style={[styles.itemRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor }]}>
      {icon && <MaterialIcons name={icon as any} size={22} color={primaryColor} style={{ marginRight: 12 }} />}
      <ThemedText style={styles.itemLabel}>{label}</ThemedText>
      {readOnly ? (
        <ThemedText style={[styles.itemValue, { color: placeholderColor }]}>{value}</ThemedText>
      ) : (
        <TextInput
          style={[styles.itemInput, { color: textColor }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          secureTextEntry={secureTextEntry}
          textAlign="right"
        />
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
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
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={styles.avatarWrapper}>
              <Image
                source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
                resizeMode="cover"
              />
              <View style={[styles.editIconBadge, { backgroundColor: BRAND_BLUE }]}>
                <MaterialIcons name="edit" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>{fullName || 'User'}</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {email}
            </ThemedText>
          </View>

          {/* Form */}
          <SettingsGroup title="Personal Information">
            <SettingsItem
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Required"
            />
            <SettingsItem
              label="Email"
              value={email}
              readOnly
              isLast
            />
          </SettingsGroup>


          <SettingsGroup title="Security">
            <TouchableOpacity
              style={[styles.itemRowSwitch, { borderBottomWidth: showSecurity ? StyleSheet.hairlineWidth : 0, borderBottomColor: separatorColor }]}
              onPress={() => setShowSecurity(!showSecurity)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="lock" size={22} color={primaryColor} style={{ marginRight: 12 }} />
                <ThemedText style={styles.itemLabel}>Change Password</ThemedText>
              </View>
              <MaterialIcons name={showSecurity ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={22} color={placeholderColor} />
            </TouchableOpacity>

            {showSecurity && (
              <>
                <SettingsItem
                  label="Current Password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Required"
                  secureTextEntry
                  icon="vpn-key" // Visual indent
                />
                <SettingsItem
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Required"
                  secureTextEntry
                  isLast
                  icon="vpn-key"
                />
              </>
            )}
          </SettingsGroup>

          {/* Actions */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: primaryColor }]}
              onPress={handleUpdateProfile}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>Save Changes</ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.signOutText}>Log Out</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />


        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? 50 : 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20
  },
  avatarWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 16
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    // Note: Dark mode border color might need manual handling if strictly needed, but white border usually looks good on avatars
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    opacity: 0.5,
    marginTop: 2
  },

  // Groups
  groupContainer: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 13,
    opacity: 0.5,
    fontWeight: '600',
    marginLeft: 20,
    marginBottom: 8,
  },
  group: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    minHeight: 50
  },
  itemRowSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    minHeight: 50
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 16,
    padding: 0,
  },
  itemValue: {
    fontSize: 16,
    opacity: 0.6,
  },

  actionContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
    gap: 16,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  }
})