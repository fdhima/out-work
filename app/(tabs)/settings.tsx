import { ThemedText } from '@/components/themed-text'
import { BRAND_BLUE } from '@/constants/theme'
import { useAuth } from '@/context/AuthContext'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useThemeColor } from '@/hooks/use-theme-color'
import { supabase } from '@/lib/supabase'
import { getProfileById, updateProfile } from '@/services/profiles'
import { getUserId } from '@/services/users'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { BlurView } from 'expo-blur'
import { File } from 'expo-file-system'
import * as Haptics from 'expo-haptics'
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
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated'

export default function ProfileScreen() {
  const { session, signOut } = useAuth()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'

  const textColor = useThemeColor({}, 'text')
  const iconColor = useThemeColor({}, 'icon')

  // Refined Colors for Pro Max look
  const screenBg = isDark ? '#000000' : '#F2F2F7'; // System gray 6
  const groupBg = isDark ? 'rgba(28, 28, 30, 0.6)' : 'rgba(255, 255, 255, 0.7)';
  const separatorColor = isDark ? '#38383A' : '#C6C6C8';
  const placeholderColor = isDark ? '#636366' : '#AEAEB2';

  // Data State
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [email] = useState(session?.user?.email || '')
  const [avatarUrl, setAvatarUrl] = useState('')



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
        setAvatarUrl(profile?.avatar_url ?? '');
      }
    } catch (e) {
      console.error(e)
    } finally {
      setProfileLoading(false)
    }
  }

  const pickAvatar = async () => {
    if (loading) return
    Haptics.selectionAsync()

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
        .upload(filePath, bytes, { contentType: mimeType, upsert: true })

      if (error) throw error

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const finalUrl = data.publicUrl

      await updateProfile(userId, { avatar_url: finalUrl, updated_at: new Date().toISOString() })
      setAvatarUrl(finalUrl)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Error', err?.message || 'Failed to upload avatar')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
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

  const SettingsGroup = ({ children, title, delay = 0 }: { children: React.ReactNode, title?: string, delay?: number }) => (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(20)}
      style={styles.groupContainer}
    >
      {title && <ThemedText style={styles.groupTitle}>{title.toUpperCase()}</ThemedText>}
      <View style={styles.groupShadow}>
        <BlurView intensity={Platform.OS === 'ios' ? 70 : 0} tint={isDark ? "dark" : "light"} style={styles.groupBlur}>
          <View style={[styles.group, { backgroundColor: groupBg }]}>
            {children}
          </View>
        </BlurView>
      </View>
    </Animated.View>
  );

  const SettingsItem = ({
    label,
    value,
    placeholder,
    onChangeText,
    isLast = false,
    readOnly = false,
    icon,
    onPress,
    rightElement
  }: {
    label: string,
    value?: string,
    placeholder?: string,
    onChangeText?: (text: string) => void,
    isLast?: boolean,
    readOnly?: boolean,
    icon?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode
  }) => {
    const Component = onPress ? TouchableOpacity : View;

    return (
      <Component
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        style={[
          styles.itemRow,
          !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor }
        ]}
      >
        <View style={styles.itemLeft}>
          {icon && (
            <View style={styles.iconContainer}>
              <MaterialIcons name={icon as any} size={20} color="#fff" />
            </View>
          )}
          <ThemedText style={styles.itemLabel}>{label}</ThemedText>
        </View>

        <View style={styles.itemRight}>
          {rightElement ? rightElement : (
            readOnly ? (
              <ThemedText style={[styles.itemValue, { color: placeholderColor }]}>{value}</ThemedText>
            ) : (
              <TextInput
                style={[styles.itemInput, { color: textColor }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={placeholderColor}
                textAlign="right"
              />
            )
          )}
          {onPress && !rightElement && (
            <MaterialIcons name="chevron-right" size={24} color={placeholderColor} style={{ marginLeft: 8 }} />
          )}
        </View>
      </Component>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.springify()} style={styles.header}>
            <TouchableOpacity
              onPress={pickAvatar}
              activeOpacity={0.8}
              style={styles.avatarWrapper}
            >
              <Image
                source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
                resizeMode="cover"
              />
              <BlurView intensity={40} tint="dark" style={styles.editIconBlur}>
                <MaterialIcons name="camera-alt" size={16} color="#fff" />
              </BlurView>
            </TouchableOpacity>

            <ThemedText type="title" style={styles.headerTitle}>{fullName || 'Display Name'}</ThemedText>
            <ThemedText style={styles.headerSubtitle}>{email}</ThemedText>
          </Animated.View>

          {/* Form */}
          <SettingsGroup title="Personal Information" delay={100}>
            <SettingsItem
              label="Display Name"
              value={fullName}
              onChangeText={setFullName}
              readOnly
              placeholder="Your Name"
            />
            <SettingsItem
              label="Email"
              value={email}
              icon="email"
              readOnly
              isLast
            />
          </SettingsGroup>

          <SettingsGroup title="Preferences" delay={200}>
            <SettingsItem
              label="Dark Mode"
              icon="dark-mode"
              isLast
              rightElement={
                <Switch
                  value={isDark}
                  disabled // System controlled for now
                  trackColor={{ false: "#767577", true: BRAND_BLUE }}
                  thumbColor={"#f4f3f4"}
                />
              }
            />
          </SettingsGroup>

          <SettingsGroup title="Support" delay={300}>
            <SettingsItem
              label="Help & FAQ"
              icon="help"
              onPress={() => {
                Haptics.selectionAsync()
                router.push('/help')
              }}
            />
            <SettingsItem
              label="Privacy Policy"
              icon="privacy-tip"
              isLast
              onPress={() => {
                Haptics.selectionAsync()
                Alert.alert('Coming Soon', 'Privacy Policy will be available soon.')
              }}
            />
          </SettingsGroup>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={{ marginTop: 24, paddingHorizontal: 16 }}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.signOutText}>Log Out</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.versionText}>Version 1.0.0</ThemedText>
          </Animated.View>


          <View style={{ height: 120 }} />

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
    paddingTop: Platform.OS === 'android' ? 60 : 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20
  },
  avatarWrapper: {
    marginBottom: 16,
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#fff',
  },
  editIconBlur: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    opacity: 0.5,
    fontWeight: '500'
  },
  editProfileButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_BLUE
  },

  // Groups
  groupContainer: {
    marginBottom: 24,
    marginHorizontal: 16,
  },
  groupShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 16,
  },
  groupBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  group: {
    overflow: 'hidden',
  },
  groupTitle: {
    fontSize: 13,
    opacity: 0.5,
    fontWeight: '700',
    marginLeft: 12,
    marginBottom: 8,
    letterSpacing: 0.5
  },

  // Items
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    minHeight: 56
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: BRAND_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.8,
    justifyContent: 'flex-end',
  },
  itemInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    fontWeight: '500'
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '500'
  },

  // Actions
  signOutButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // Light red bg
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.3,
    fontSize: 12
  },

  // Floating Button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
    left: 20,
    right: 20,
    borderRadius: 24,
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  blurButtonContainer: {
    width: '100%',
    padding: 4,
  },
  primaryButton: {
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
})