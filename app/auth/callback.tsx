import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const finalizeSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace('/');
      } else {
        router.replace('/auth');
      }
    };

    finalizeSession();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
