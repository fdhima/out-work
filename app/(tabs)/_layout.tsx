import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs, usePathname } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return null
  if (!session) return <Redirect href="../auth/signin" />

  const isDark = colorScheme === 'dark';
  const BRAND_BLUE = '#4A90E2';
  const INACTIVE_COLOR = '#999999';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BRAND_BLUE,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            borderTopWidth: 0,
            elevation: 0,
            height: 85,
            paddingBottom: 25,
            backgroundColor: 'transparent',
          },
          android: {
            position: 'absolute',
            borderTopWidth: 0,
            elevation: 8,
            height: 70,
            paddingBottom: 12,
            paddingTop: 10,
            backgroundColor: 'transparent',
            marginHorizontal: 20,
            marginBottom: 20,
            borderRadius: 35,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          },
          default: {},
        }),
        tabBarBackground: () => (
          <BlurView
            key={pathname} // Force refresh on tab change
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons size={28} name="map" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Post',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="post-add" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
