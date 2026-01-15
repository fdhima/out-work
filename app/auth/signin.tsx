import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { signInWithProvider } from '@/lib/auth/social';
import { MaterialIcons, FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
  Image
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
          icon: 'google',
          color: isDark ? '#fff' : '#000',
          bg: isDark ? '#2c2c2e' : '#fff'
        };
      case 'github':
        return {
          name: 'GitHub',
          icon: 'github',
          color: isDark ? '#fff' : '#000',
          bg: isDark ? '#2c2c2e' : '#fff'
        };
      case 'facebook':
        return {
          name: 'Facebook',
          icon: 'facebook',
          color: '#fff',
          bg: '#1877F2'
        };
      case 'apple':
        return {
          name: 'Apple',
          icon: 'apple',
          color: isDark ? '#000' : '#fff',
          bg: isDark ? '#fff' : '#000'
        };
      default:
        return { name: p, icon: 'public', color: '#000', bg: '#fff' };
    }
  };

  const config = getProviderConfig(provider);

  return (
    <TouchableOpacity
      style={[styles.socialButton, { backgroundColor: config.bg }]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress(provider);
      }}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={config.color} />
      ) : (
        <>
          <View style={styles.iconWrapper}>
            <FontAwesome6 name={config.icon} size={20} color={config.color} />
          </View>
          <ThemedText style={[styles.socialButtonText, { color: config.color }]}>
            Continue with {config.name}
          </ThemedText>
        </>
      )}
    </TouchableOpacity>
  );
};

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

  const isDark = colorScheme === 'dark';

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={isDark ? ['#1a1a1a', '#000000'] : ['#f8f9fa', '#e9ecef']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInUp.delay(200).duration(1000)}
          style={styles.content}
        >
          <View style={styles.header}>
            <View style={styles.logoGlassContainer}>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.logoBlur}>
                <Image
                  source={require("../../assets/images/outwork-logo-standalone.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </BlurView>
            </View>

            <View style={styles.titleWrapper}>
              <ThemedText style={styles.title}>OutWork</ThemedText>
              <ThemedText style={styles.subtitle}>
                Find your perfect remote workspace.
              </ThemedText>
            </View>
          </View>

          <Animated.View
            entering={FadeInDown.delay(400).duration(1000)}
            style={styles.footer}
          >
            {error && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color="#ef4444" />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            <View style={styles.buttonStack}>
              <SocialButton
                provider="google"
                onPress={handleSignIn}
                loading={loadingProvider === 'google'}
                isDark={isDark}
              />
              {/* <SocialButton
                provider="apple"
                onPress={handleSignIn}
                loading={loadingProvider === 'apple'}
                isDark={isDark}
              />
              <SocialButton
                provider="facebook"
                onPress={handleSignIn}
                loading={loadingProvider === 'facebook'}
                isDark={isDark}
              /> */}
              <SocialButton
                provider="github"
                onPress={handleSignIn}
                loading={loadingProvider === 'github'}
                isDark={isDark}
              />
            </View>

            <ThemedText style={styles.disclaimer}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </ThemedText>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: height * 0.12,
    paddingBottom: height * 0.08,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoGlassContainer: {
    marginBottom: 32,
    borderRadius: 35,
    overflow: 'hidden',
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', // Subtle backing
    transform: [{ rotate: '-6deg' }], // Slight stylish tilt
  },
  logoBlur: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  titleWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: '900', // Extra bold
    lineHeight: 48,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.6,
    paddingHorizontal: 40,
    fontWeight: '500',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 10,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonStack: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
    borderRadius: 20, // Updated radius
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrapper: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '700', // Bolder text
  },
  disclaimer: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.4,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
