import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { supabase } from '@/lib/supabase'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { getProfileById } from '@/services/profiles'
import { getUserId } from '@/services/users'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  SafeAreaView,
} from 'react-native'

export default function ProfileScreen() {
  const { session, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const isDark = colorScheme === 'dark'

  const bg = isDark ? '#000' : '#F2F2F7'
  const cardBg = isDark ? '#1c1c1e' : '#fff'
  const profileCardBg = isDark ? '#1e2a3a' : '#EAF0FB'
  const avatarBg = isDark ? '#2c4a7a' : '#B8CBF0'
  const textPrimary = isDark ? '#fff' : '#000'
  const textSecondary = isDark ? '#8e8e93' : '#6c6c70'
  const sectionTitleColor = isDark ? '#8e8e93' : '#6c6c70'
  const separatorColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const destructiveColor = '#ef4444'

  const [fullName, setFullName] = useState('')
  const [email] = useState(session?.user?.email || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const userId = await getUserId()
        if (userId) {
          const profile = await getProfileById(userId)
          setFullName(profile?.full_name ?? '')
        }
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  const avatarLetter = fullName.trim().charAt(0).toUpperCase() || '?'

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut()
          router.replace('/auth/signin')
        },
      },
    ])
  }

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true)
              const { data: { session: s } } = await supabase.auth.getSession()
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
                {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${s?.access_token}` },
                }
              )
              if (!response.ok) {
                const body = await response.json()
                throw new Error(body.error ?? 'Failed to delete account')
              }
              await signOut()
              router.replace('/auth/signin')
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to delete account')
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  const menuItems = [
    {
      label: 'Help & FAQ',
      onPress: () => { Haptics.selectionAsync(); router.push('/help') },
    },
    {
      label: 'Feedback',
      onPress: () => { Haptics.selectionAsync(); router.push('/feedback') },
    },
    {
      label: 'Report NSFW Content',
      onPress: () => { Haptics.selectionAsync(); router.push('/report-nsfw') },
    },
    {
      label: 'Privacy Policy',
      onPress: () => { Haptics.selectionAsync(); Linking.openURL('https://out-work.online/privacy-policy') },
    },
  ]

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page heading ── */}
        <Text style={[styles.pageTitle, { color: textPrimary }]}>Profile</Text>

        {/* ── Profile card ── */}
        <View style={[styles.profileCard, { backgroundColor: profileCardBg }]}>
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.avatarLetter}>{avatarLetter}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: textPrimary }]} numberOfLines={1}>
              {fullName || 'Your Name'}
            </Text>
            <Text style={[styles.profileSub, { color: textSecondary }]} numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>

        {/* ── Appearance section ── */}
        <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
          Appearance
        </Text>
        <View style={[styles.menuCard, { backgroundColor: cardBg, marginBottom: 28 }]}>
          <View style={styles.themeSegmentRow}>
            {(['light', 'system', 'dark'] as const).map((option, idx, arr) => {
              const isSelected = theme === option
              const label = option.charAt(0).toUpperCase() + option.slice(1)
              const isFirst = idx === 0
              const isLast = idx === arr.length - 1
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.themeSegment,
                    isFirst && styles.themeSegmentFirst,
                    isLast && styles.themeSegmentLast,
                    isSelected && { backgroundColor: '#ff6b35' },
                    !isSelected && { backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0' },
                    idx > 0 && { borderLeftWidth: 1, borderLeftColor: isDark ? '#3a3a3c' : '#ddd' },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setTheme(option) }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.themeSegmentText,
                    { color: isSelected ? '#fff' : textSecondary },
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* ── Account Management section ── */}
        <Text style={[styles.sectionTitle, { color: sectionTitleColor }]}>
          Account Management
        </Text>

        <View style={[styles.menuCard, { backgroundColor: cardBg }]}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,
                idx < menuItems.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor },
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuLabel, { color: textPrimary }]}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={22} color={textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity
          style={[styles.menuCard, styles.actionRow, { backgroundColor: cardBg }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={[styles.menuLabel, { color: destructiveColor }]}>Log Out</Text>
          <MaterialIcons name="chevron-right" size={22} color={destructiveColor} />
        </TouchableOpacity>

        {/* ── Delete account ── */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: textSecondary }]}>Version 1.0.2.1</Text>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingTop: Platform.OS === 'android' ? 24 : 8,
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 24,
    marginTop: 8,
  },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 28,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarLetter: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
  },
  profileSub: {
    fontSize: 13,
    fontWeight: '400',
  },

  // Section title
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },

  // Menu card
  menuCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Theme segmented control
  themeSegmentRow: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
  },
  themeSegment: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSegmentFirst: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  themeSegmentLast: {
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  themeSegmentText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Delete & version
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
    opacity: 0.5,
  },
})
