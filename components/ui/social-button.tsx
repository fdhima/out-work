import { ThemedText } from '@/components/themed-text'
import { FontAwesome, Ionicons } from '@expo/vector-icons'
import { StyleSheet, TouchableOpacity } from 'react-native'

interface SocialButtonProps {
  provider: 'google' | 'apple'
  onPress: () => void
  textColor: string
  borderColor: string
}

export function SocialButton({
  provider,
  onPress,
  textColor,
  borderColor,
}: SocialButtonProps) {
  const isGoogle = provider === 'google'

  return (
    <TouchableOpacity
      style={[styles.button, { borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isGoogle ? (
        <FontAwesome name="google" size={24} color="#4285F4" />
      ) : (
        <Ionicons name="logo-apple" size={24} color={textColor} />
      )}
      <ThemedText style={[styles.buttonText, { color: textColor }]}>
        {isGoogle ? 'Google' : 'Apple'}
      </ThemedText>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 52,
    gap: 8,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
})

