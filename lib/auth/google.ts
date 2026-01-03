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

  // Attempt to complete the Supabase auth flow. On web browsers
  // `getSessionFromUrl()` exists and will parse + persist the session.
  // On some React Native setups that method is undefined, so fall
  // back to parsing the returned URL and calling `setSession()`.
  if (typeof (supabase.auth as any).getSessionFromUrl === 'function') {
    try {
      await (supabase.auth as any).getSessionFromUrl()
      return
    } catch (e) {
      throw e
    }
  }

  // Fallback: parse the returned URL for access/refresh tokens and
  // set the session directly. The returned url from `openAuthSessionAsync`
  // typically contains a hash fragment like `#access_token=...&refresh_token=...`.
  const returnedUrl = (result as any).url as string | undefined
  if (!returnedUrl) throw new Error('No redirect URL returned')

  const parseFragment = (url: string) => {
    const hashIndex = url.indexOf('#')
    if (hashIndex === -1) return {}
    const fragment = url.substring(hashIndex + 1)
    return fragment.split('&').reduce<Record<string, string>>((acc, pair) => {
      const [k, v] = pair.split('=')
      if (!k) return acc
      acc[decodeURIComponent(k)] = decodeURIComponent(v || '')
      return acc
    }, {})
  }

  const params = parseFragment(returnedUrl)
  const access_token = params['access_token']
  const refresh_token = params['refresh_token']

  if (!access_token) {
    throw new Error('No access token found in redirect URL')
  }

  // Use setSession if available to persist the tokens and trigger
  // auth state change. If `setSession` doesn't exist, surface an
  // informative error so the developer can adjust based on SDK.
  if (typeof (supabase.auth as any).setSession === 'function') {
    try {
      await (supabase.auth as any).setSession({ access_token, refresh_token })
      return
    } catch (e) {
      throw e
    }
  }

  throw new Error('Cannot complete OAuth: neither getSessionFromUrl nor setSession are available on supabase.auth')
}
