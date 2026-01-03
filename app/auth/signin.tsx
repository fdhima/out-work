import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AuthContainer } from '@/components/ui/auth-container';
import { AuthInput } from '@/components/ui/auth-input';
import { GradientButton } from '@/components/ui/gradient-button';
import { SocialButton } from '@/components/ui/social-button';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { signInWithGoogle } from '@/lib/auth/google';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

supabase.auth.onAuthStateChange((event, session) => {
  console.log('AUTH EVENT:', event);
  console.log('SESSION:', session);
});

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(
    () => (params.tab === 'signup' ? 'signup' : 'signin')
  );

  // Sign in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [reset, setReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Sign up state
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const colorScheme = useColorScheme() ?? 'light';
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const inputBg = colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
  const borderColor = colorScheme === 'dark' ? '#9BA1A6' : '#d1d5db';

  useEffect(() => {
    setError(null);
    setMessage(null);
    setReset(false);
    setResetSent(false);
  }, [activeTab]);

  const resetPassword = async () => {
    try {
      setResetLoading(true);
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://out-work.online/reset-password',
      });
      if (error) setError(error.message);
      else setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  };

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    if (!fullName.trim()) return setError('Full name is required');
    if (signupPassword !== confirmPassword) return setError('Passwords do not match');

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      });
      if (signUpError) return setError(signUpError.message);

      const user = data.user;
      if (!user) return setError('User creation failed');

      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        full_name: fullName,
      });
      if (profileError) return setError(profileError.message);

      setMessage('Check your email to confirm your account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      // After successful OAuth and session persistence, navigate to root
      // so the `Index` redirect logic picks up the authenticated session.
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => console.log('Apple sign in');

  // Forms
  const renderSignInForm = () => (
    <>
      <AuthInput
        label="Email Address"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        icon="mail-outline"
        textColor={textColor}
        iconColor={iconColor}
        backgroundColor={inputBg}
      />
      <AuthInput
        label="Password"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        icon="lock-closed-outline"
        textColor={textColor}
        iconColor={iconColor}
        backgroundColor={inputBg}
      />
      <View style={styles.rememberForgotRow}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setRememberMe(!rememberMe)}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor, backgroundColor: rememberMe ? '#ff6b35' : 'transparent' },
            ]}
          >
            {rememberMe && <ThemedText style={styles.checkmark}>✓</ThemedText>}
          </View>
          <ThemedText style={[styles.checkboxLabel, { color: textColor }]}>
            Remember me
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setReset(true);
            setResetSent(false);
            setResetEmail(email);
          }}
        >
          <ThemedText style={[styles.forgotPassword, { color: '#ff6b35' }]}>
            Forgot password?
          </ThemedText>
        </TouchableOpacity>
      </View>

      {reset && (
        <>
          <AuthInput
            label="Reset email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={resetEmail}
            onChangeText={setResetEmail}
            icon="mail-outline"
            textColor={textColor}
            iconColor={iconColor}
            backgroundColor={inputBg}
          />
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : '#e5e7eb' },
            ]}
            onPress={resetPassword}
            disabled={resetLoading}
          >
            {resetLoading ? (
              <ActivityIndicator color={textColor} />
            ) : (
              <ThemedText style={[styles.secondaryText, { color: textColor }]}>
                Send reset email
              </ThemedText>
            )}
          </TouchableOpacity>
        </>
      )}

      {resetSent && (
        <ThemedText style={{ textAlign: 'center', marginVertical: 10, color: '#22c55e', fontWeight: '500' }}>
          Password reset email sent 📧
        </ThemedText>
      )}

      <GradientButton title="Sign In" onPress={signIn} loading={loading} disabled={loading} />
    </>
  );

  const renderSignUpForm = () => (
    <>
      <AuthInput
        label="Full name"
        placeholder="John Doe"
        value={fullName}
        onChangeText={setFullName}
        icon="person-outline"
        textColor={textColor}
        iconColor={iconColor}
        backgroundColor={inputBg}
      />
      <AuthInput
        label="Email Address"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={signupEmail}
        onChangeText={setSignupEmail}
        icon="mail-outline"
        textColor={textColor}
        iconColor={iconColor}
        backgroundColor={inputBg}
      />
      <AuthInput
        label="Password"
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        showToggle
        onToggleSecure={() => setShowPassword((v) => !v)}
        value={signupPassword}
        onChangeText={setSignupPassword}
        icon="lock-closed-outline"
        textColor={textColor}
        iconColor={iconColor}
        backgroundColor={inputBg}
      />
      <AuthInput
        label="Confirm password"
        placeholder="••••••••"
        secureTextEntry={!showConfirmPassword}
        showToggle
        onToggleSecure={() => setShowConfirmPassword((v) => !v)}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        icon="lock-closed-outline"
        textColor={textColor}
        iconColor={iconColor}
        backgroundColor={inputBg}
      />
      <GradientButton title="Sign Up" onPress={signUp} loading={loading} disabled={loading} />
    </>
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AuthContainer activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'signin' ? renderSignInForm() : renderSignUpForm()}

            {error && <ThemedText style={[styles.error, { color: '#ef4444' }]}>{error}</ThemedText>}
            {message && <ThemedText style={[styles.success, { color: '#16a34a' }]}>{message}</ThemedText>}

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
              <ThemedText style={[styles.dividerText, { color: iconColor }]}>or continue with</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            </View>

            <View style={styles.socialButtons}>
              <SocialButton provider="google" onPress={handleGoogleSignIn} textColor={textColor} borderColor={borderColor} />
              <SocialButton provider="apple" onPress={handleAppleSignIn} textColor={textColor} borderColor={borderColor} />
            </View>
          </AuthContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  rememberForgotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 14 },
  forgotPassword: { fontSize: 14, fontWeight: '500' },
  error: { textAlign: 'center', marginVertical: 8, fontSize: 14, fontWeight: '500' },
  success: { textAlign: 'center', marginVertical: 8, fontSize: 14, fontWeight: '500' },
  secondaryButton: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  secondaryText: { fontWeight: '600', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 14 },
  socialButtons: { flexDirection: 'row', gap: 12 },
});
