import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

interface AuthContainerProps {
  activeTab: 'signin' | 'signup'
  onTabChange: (tab: 'signin' | 'signup') => void
  children: React.ReactNode
}

export function AuthContainer({
  activeTab,
  onTabChange,
  children,
}: AuthContainerProps) {
  const colorScheme = useColorScheme() ?? 'light'
  const textColor = useColorScheme() === 'dark' ? '#ECEDEE' : '#11181C'
  const activeColor = '#ff6b35'
  const inactiveColor = colorScheme === 'dark' ? '#9BA1A6' : '#687076'

  const cardBg =
    colorScheme === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(255, 255, 255, 0.95)'

  return (
    <ThemedView style={styles.container}>
      <View style={styles.logoContainer}>
        <LinearGradient
          colors={['#ff6b35', '#f7931e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoIcon}
        >
          <Ionicons name="location" size={32} color="#fff" />
        </LinearGradient>
        <ThemedText
          style={[
            styles.logoText,
            { color: textColor, fontWeight: 'bold' },
          ]}
        >
          WorkSpot
        </ThemedText>
        <ThemedText
          style={[
            styles.tagline,
            {
              color: inactiveColor,
            },
          ]}
        >
          Find your perfect work & study space.
        </ThemedText>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
          },
        ]}
      >
        <View style={styles.tabs}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabChange('signin')}
          >
            <ThemedText
              style={[
                styles.tabText,
                {
                  color: activeTab === 'signin' ? activeColor : inactiveColor,
                  fontWeight: activeTab === 'signin' ? '600' : '500',
                },
              ]}
            >
              Sign In
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabChange('signup')}
          >
            <ThemedText
              style={[
                styles.tabText,
                {
                  color: activeTab === 'signup' ? activeColor : inactiveColor,
                  fontWeight: activeTab === 'signup' ? '600' : '500',
                },
              ]}
            >
              Sign Up
            </ThemedText>
          </TouchableOpacity>
        </View>

        {children}
      </View>

      <TouchableOpacity style={styles.supportLink}>
        <ThemedText
          style={[
            styles.supportText,
            {
              color: inactiveColor,
            },
          ]}
        >
          Need help?{' '}
          <ThemedText style={{ color: activeColor }}>Contact Support</ThemedText>
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tagline: {
    marginTop: 4,
    fontSize: 14,
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
    marginBottom: 24,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 16,
  },
  supportLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  supportText: {
    fontSize: 14,
  },
})

