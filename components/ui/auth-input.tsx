import { ThemedText } from '@/components/themed-text'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'

interface AuthInputProps {
  label: string
  placeholder: string
  value: string
  onChangeText: (text: string) => void
  icon?: keyof typeof Ionicons.glyphMap
  secureTextEntry?: boolean
  showToggle?: boolean
  onToggleSecure?: () => void
  textColor: string
  iconColor: string
  backgroundColor: string
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad'
    | 'number-pad'
  [key: string]: any
}

export function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  secureTextEntry,
  showToggle,
  onToggleSecure,
  textColor,
  iconColor,
  backgroundColor,
  autoCapitalize,
  keyboardType,
  ...props
}: AuthInputProps) {
  return (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.label, { color: textColor }]}>{label}</ThemedText>
      <View style={styles.inputContainer}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
        )}
        <TextInput
          {...props}
          style={[
            styles.input,
            {
              backgroundColor,
              color: textColor,
              paddingLeft: icon ? 48 : 16,
              paddingRight: showToggle ? 48 : 16,
              borderColor:
                backgroundColor === 'rgba(255, 255, 255, 0.1)'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'transparent',
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={iconColor}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
        />
        {showToggle && (
          <TouchableOpacity
            onPress={onToggleSecure}
            style={styles.eyeButton}
            hitSlop={10}
          >
            <Ionicons
              name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={iconColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.9,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 52,
    borderWidth: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
})

