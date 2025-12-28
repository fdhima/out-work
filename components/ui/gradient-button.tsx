import { ThemedText } from '@/components/themed-text'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native'

interface GradientButtonProps {
  title: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  showArrow?: boolean
}

export function GradientButton({
  title,
  onPress,
  loading,
  disabled,
  showArrow = true,
}: GradientButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      style={[styles.button, (loading || disabled) && styles.buttonDisabled]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#ff6b35', '#f7931e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <ThemedText style={styles.buttonText}>{title}</ThemedText>
            {showArrow && (
              <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.arrow} />
            )}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 52,
    shadowColor: '#ff6b35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 52,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  arrow: {
    marginLeft: 8,
  },
})

