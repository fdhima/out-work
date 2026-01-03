import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { signInWithGoogle } from '@/lib/auth/google';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// --- Components Hoisted Outside Component ---

const AuthInput = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType = "default",
  icon,
  showToggle,
  onToggleSecure,
  // Theme props
  backgroundColor,
  borderColor,
  textColor,
  iconColor,
  placeholderColor
}: any) => (
  <View style={[styles.inputContainer, { backgroundColor, borderColor }]}>
    {icon && <MaterialIcons name={icon} size={20} color={iconColor} style={styles.inputIcon} />}
    <TextInput
      style={[styles.input, { color: textColor }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
    />
    {showToggle && (
      <TouchableOpacity onPress={onToggleSecure} style={styles.toggleButton}>
        <MaterialIcons name={secureTextEntry ? "visibility-off" : "visibility"} size={20} color={iconColor} />
      </TouchableOpacity>
    )}
  </View>
);

const PrimaryButton = ({ title, onPress, loading, backgroundColor }: any) => (
  <TouchableOpacity
    style={[styles.primaryButton, { backgroundColor }]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
  >
    {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryButtonText}>{title}</ThemedText>}
  </TouchableOpacity>
);

const TabSwitcher = ({ activeTab, onTabChange, backgroundColor, placeholderColor }: any) => (
  <View style={[styles.tabContainer, { backgroundColor }]}>
    <TouchableOpacity
      style={[styles.tab, activeTab === 'signin' && styles.tabActive]}
      onPress={() => onTabChange('signin')}
      activeOpacity={0.9}
    >
      <ThemedText style={[styles.tabText, activeTab === 'signin' ? styles.tabTextActive : { color: placeholderColor }]}>Sign In</ThemedText>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.tab, activeTab === 'signup' && styles.tabActive]}
      onPress={() => onTabChange('signup')}
      activeOpacity={0.9}
    >
      <ThemedText style={[styles.tabText, activeTab === 'signup' ? styles.tabTextActive : { color: placeholderColor }]}>Sign Up</ThemedText>
    </TouchableOpacity>
  </View>
);

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(
    () => (params.tab === 'signup' ? 'signup' : 'signin')
  );

  // Brand Colors
  const BRAND_BLUE = "#4A90E2";
  const PRIMARY_COLOR = BRAND_BLUE;

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

  const inputBg = colorScheme === 'dark' ? '#1c1c1e' : '#f3f4f6';
  const borderColor = colorScheme === 'dark' ? '#2c2c2e' : '#e5e5ea';
  const placeholderColor = colorScheme === 'dark' ? '#636366' : '#9ca3af';

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
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  // Forms
  const renderSignInForm = () => (
    <View style={styles.formContainer}>
      <AuthInput
        placeholder="Email Address"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        icon="email"
        // Theme
        backgroundColor={inputBg}
        borderColor={borderColor}
        textColor={textColor}
        iconColor={iconColor}
        placeholderColor={placeholderColor}
      />
      <AuthInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        icon="lock"
        // Theme
        backgroundColor={inputBg}
        borderColor={borderColor}
        textColor={textColor}
        iconColor={iconColor}
        placeholderColor={placeholderColor}
      />

      <View style={styles.rememberForgotRow}>
        <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.8}>
          <MaterialIcons name={rememberMe ? "check-box" : "check-box-outline-blank"} size={22} color={rememberMe ? PRIMARY_COLOR : placeholderColor} />
          <ThemedText style={{ fontSize: 14, opacity: 0.8 }}>Remember me</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setReset(true);
            setResetSent(false);
            setResetEmail(email);
          }}
        >
          <ThemedText style={[styles.forgotPassword, { color: PRIMARY_COLOR }]}>
            Forgot password?
          </ThemedText>
        </TouchableOpacity>
      </View>

      {reset && (
        <View style={styles.resetContainer}>
          <ThemedText style={{ marginBottom: 8, fontSize: 13, textAlign: 'center' }}>Enter your email to receive a reset link</ThemedText>
          <AuthInput
            placeholder="Recovery Email"
            keyboardType="email-address"
            value={resetEmail}
            onChangeText={setResetEmail}
            icon="mark-email-read"
            // Theme
            backgroundColor={inputBg}
            borderColor={borderColor}
            textColor={textColor}
            iconColor={iconColor}
            placeholderColor={placeholderColor}
          />
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: borderColor }]}
            onPress={resetPassword}
            disabled={resetLoading}
          >
            {resetLoading ? <ActivityIndicator color={textColor} /> : <ThemedText style={{ fontWeight: '600' }}>Send Reset Link</ThemedText>}
          </TouchableOpacity>
        </View>
      )}

      {resetSent && (
        <ThemedText style={{ textAlign: 'center', marginVertical: 10, color: '#22c55e', fontWeight: '500' }}>
          Password reset email sent 📧
        </ThemedText>
      )}

      <PrimaryButton
        title="Sign In"
        onPress={signIn}
        loading={loading}
        backgroundColor={PRIMARY_COLOR}
      />
    </View>
  );

  const renderSignUpForm = () => (
    <View style={styles.formContainer}>
      <AuthInput
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        icon="person"
        autoCapitalize="words"
        // Theme
        backgroundColor={inputBg}
        borderColor={borderColor}
        textColor={textColor}
        iconColor={iconColor}
        placeholderColor={placeholderColor}
      />
      <AuthInput
        placeholder="Email Address"
        keyboardType="email-address"
        value={signupEmail}
        onChangeText={setSignupEmail}
        icon="email"
        // Theme
        backgroundColor={inputBg}
        borderColor={borderColor}
        textColor={textColor}
        iconColor={iconColor}
        placeholderColor={placeholderColor}
      />
      <AuthInput
        placeholder="Password"
        secureTextEntry={!showPassword}
        showToggle
        onToggleSecure={() => setShowPassword(!showPassword)}
        value={signupPassword}
        onChangeText={setSignupPassword}
        icon="lock"
        // Theme
        backgroundColor={inputBg}
        borderColor={borderColor}
        textColor={textColor}
        iconColor={iconColor}
        placeholderColor={placeholderColor}
      />
      <AuthInput
        placeholder="Confirm Password"
        secureTextEntry={!showConfirmPassword}
        showToggle
        onToggleSecure={() => setShowConfirmPassword(!showConfirmPassword)}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        icon="lock"
        // Theme
        backgroundColor={inputBg}
        borderColor={borderColor}
        textColor={textColor}
        iconColor={iconColor}
        placeholderColor={placeholderColor}
      />
      <PrimaryButton
        title="Sign Up"
        onPress={signUp}
        loading={loading}
        backgroundColor={PRIMARY_COLOR}
      />
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <View style={[styles.logoPlaceholder, { backgroundColor: PRIMARY_COLOR }]}>
              <MaterialIcons name="map" size={32} color="#fff" />
            </View>
            <ThemedText style={styles.title}>Welcome to OutWork</ThemedText>
            <ThemedText style={styles.subtitle}>Find your perfect workspace</ThemedText>
          </View>

          <TabSwitcher
            activeTab={activeTab}
            onTabChange={setActiveTab}
            backgroundColor={inputBg}
            placeholderColor={placeholderColor}
          />

          {activeTab === 'signin' ? renderSignInForm() : renderSignUpForm()}

          {error && <ThemedText style={[styles.error, { color: '#ef4444' }]}>{error}</ThemedText>}
          {message && <ThemedText style={[styles.success, { color: '#16a34a' }]}>{message}</ThemedText>}

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            <ThemedText style={[styles.dividerText, { color: placeholderColor }]}>or continue with</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
          </View>

          <TouchableOpacity
            style={[styles.socialButton, { borderColor }]}
            onPress={handleGoogleSignIn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="public" size={24} color={textColor} />
            <ThemedText style={{ fontWeight: '600', marginLeft: 8 }}>Continue with Google</ThemedText>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    transform: [{ rotate: '-5deg' }]
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.5,
    textAlign: 'center'
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    height: 50
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#000',
  },

  // Inputs
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  toggleButton: {
    padding: 8,
  },

  // Actions
  primaryButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  rememberForgotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  forgotPassword: { fontSize: 14, fontWeight: '600' },

  error: { textAlign: 'center', marginVertical: 12, fontSize: 14, fontWeight: '500' },
  success: { textAlign: 'center', marginVertical: 12, fontSize: 14, fontWeight: '500' },

  resetContainer: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 32, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: '500' },

  socialButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
});
