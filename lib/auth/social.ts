import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Provider } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithProvider(provider: Provider) {
    const redirectTo = 'out-work://auth/callback';

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo,
            skipBrowserRedirect: true,
        },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('No OAuth URL returned');

    const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
    );

    if (result.type !== 'success') {
        throw new Error(`${provider} sign-in cancelled`);
    }

    // Attempt to complete the Supabase auth flow
    if (typeof (supabase.auth as any).getSessionFromUrl === 'function') {
        try {
            await (supabase.auth as any).getSessionFromUrl();
            return;
        } catch (e) {
            // Fallback if needed
        }
    }

    const returnedUrl = (result as any).url as string | undefined;
    if (!returnedUrl) throw new Error('No redirect URL returned');

    const parseFragment = (url: string) => {
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return {};
        const fragment = url.substring(hashIndex + 1);
        return fragment.split('&').reduce<Record<string, string>>((acc, pair) => {
            const [k, v] = pair.split('=');
            if (!k) return acc;
            acc[decodeURIComponent(k)] = decodeURIComponent(v || '');
            return acc;
        }, {});
    };

    const params = parseFragment(returnedUrl);
    const access_token = params['access_token'];
    const refresh_token = params['refresh_token'];

    if (!access_token) {
        throw new Error('No access token found in redirect URL');
    }

    if (typeof (supabase.auth as any).setSession === 'function') {
        await (supabase.auth as any).setSession({ access_token, refresh_token });
        return;
    }

    throw new Error('Cannot complete OAuth: session handlers not available');
}

export async function signInWithApple() {
    const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
    });

    if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple');
    }

    const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
    });

    if (error) throw error;
}
