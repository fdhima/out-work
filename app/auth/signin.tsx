import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { signInWithProvider, signInWithApple } from '@/lib/auth/social';
import { Colors, BRAND_PURPLE } from '@/constants/theme';

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};
import * as AppleAuthentication from 'expo-apple-authentication';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
  Image,
  SafeAreaView,
  Text,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Provider } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

const SocialButton = ({
  provider,
  onPress,
  loading,
  isDark
}: {
  provider: Provider;
  onPress: (p: Provider) => void;
  loading: boolean;
  isDark: boolean;
}) => {
  const getProviderConfig = (p: Provider) => {
    switch (p) {
      case 'google':
        return {
          name: 'Google',
          icon: 'google' as const,
          color: isDark ? '#fff' : '#000',
          bg: isDark ? '#2c2c2e' : '#fff',
          border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
        };
      case 'github':
        return {
          name: 'GitHub',
          icon: 'github' as const,
          color: isDark ? '#fff' : '#000',
          bg: isDark ? '#2c2c2e' : '#fff',
          border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
        };
      case 'facebook':
        return {
          name: 'Facebook',
          icon: 'facebook' as const,
          color: '#fff',
          bg: '#1877F2',
          border: 'transparent',
        };
      default:
        return { name: p, icon: 'circle' as const, color: '#000', bg: '#fff', border: 'transparent' };
    }
  };

  const config = getProviderConfig(provider);

  return (
    <TouchableOpacity
      style={[
        styles.socialButton,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          borderWidth: 1,
        }
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress(provider);
      }}
      disabled={loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={config.color} />
      ) : (
        <>
          <View style={styles.iconWrapper}>
            <FontAwesome6 name={config.icon} size={19} color={config.color} />
          </View>
          <Text style={[styles.socialButtonText, { color: config.color }]}>
            Continue with {config.name}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const OrDivider = ({ isDark }: { isDark: boolean }) => (
  <View style={styles.dividerRow}>
    <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]} />
    <Text style={[styles.dividerText, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>or</Text>
    <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]} />
  </View>
);

export default function AuthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: Provider) => {
    try {
      setLoadingProvider(provider);
      setError(null);
      await signInWithProvider(provider);
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? `${provider} sign-in failed`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoadingProvider('apple');
      setError(null);
      await signInWithApple();
      router.replace('/');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setError(e.message ?? 'Apple sign-in failed');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const isDark = colorScheme === 'dark';

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#0d0d0d', '#1a1a1a'] : ['#fafafa', '#f0ede8']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blobs — colors sourced from constants/theme.ts */}
      <View
        style={[
          styles.blob,
          styles.blobTop,
          { backgroundColor: hexToRgba(Colors.light.tint, isDark ? 0.07 : 0.1) }
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobBottom,
          { backgroundColor: hexToRgba(BRAND_PURPLE, isDark ? 0.06 : 0.09) }
        ]}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInUp.delay(100).duration(800)}
            style={styles.header}
          >
            <View style={[styles.logoContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              <Image
                source={require("../../assets/images/outwork-logo-standalone.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.titleWrapper}>
              <ThemedText style={styles.title}>OutWork</ThemedText>
              <ThemedText style={styles.subtitle}>
                Find your perfect remote workspace
              </ThemedText>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(300).duration(800)}
            style={styles.footer}
          >
            {error && (
              <View style={[styles.errorContainer, { borderColor: 'rgba(239,68,68,0.25)' }]}>
                <FontAwesome6 name="circle-exclamation" size={15} color="#ef4444" />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            <View style={styles.buttonStack}>
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={16}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              )}

              {Platform.OS === 'ios' && <OrDivider isDark={isDark} />}

              <SocialButton
                provider="google"
                onPress={handleSignIn}
                loading={loadingProvider === 'google'}
                isDark={isDark}
              />
              <SocialButton
                provider="github"
                onPress={handleSignIn}
                loading={loadingProvider === 'github'}
                isDark={isDark}
              />
            </View>

            <ThemedText style={styles.disclaimer}>
              By continuing, you agree to our{' '}
              <ThemedText style={styles.disclaimerLink}>Terms of Service</ThemedText>
              {' '}and{' '}
              <ThemedText style={styles.disclaimerLink}>Privacy Policy</ThemedText>.
            </ThemedText>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: height * 0.1,
    paddingBottom: 32,
  },

  // Decorative blobs
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTop: {
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.3,
    right: -width * 0.2,
  },
  blobBottom: {
    width: width * 0.7,
    height: width * 0.7,
    bottom: -width * 0.25,
    left: -width * 0.2,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: 28,
    marginBottom: 48,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 64,
    height: 64,
  },
  titleWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 44,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.55,
    fontWeight: '500',
  },

  // Footer
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  // Button stack
  buttonStack: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  appleButton: {
    width: '100%',
    height: 54,
  },

  // OR divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Social buttons
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  iconWrapper: {
    marginRight: 12,
    width: 22,
    alignItems: 'center',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Disclaimer
  disclaimer: {
    fontSize: 12.5,
    textAlign: 'center',
    opacity: 0.45,
    lineHeight: 18,
  },
  disclaimerLink: {
    fontSize: 12.5,
    opacity: 0.7,
    fontWeight: '600',
  },
});
