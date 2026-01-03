import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  const redirectTo = 'out-work://auth/callback';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true, // IMPORTANT for Expo
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo
  );

  if (result.type !== 'success') {
    throw new Error('Google sign-in cancelled');
  }

  // Supabase auto-detects the session from the redirect
}
