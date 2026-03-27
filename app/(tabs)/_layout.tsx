import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs, usePathname } from 'expo-router';
import React, { useRef } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TAB_ORDER = ['index', 'favorites', 'explore', 'settings'];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const prevTabIndex = useRef(0);

  if (loading) return null
  if (!session) return <Redirect href="../auth/signin" />

  const isDark = colorScheme === 'dark';
  const BRAND_BLUE = '#4A90E2';
  const INACTIVE_COLOR = '#999999';

  const currentTabName = pathname.replace('/', '') || 'index';

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          prevTabIndex.current = TAB_ORDER.indexOf(currentTabName);
        },
      }}
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: BRAND_BLUE,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        headerShown: false,
        tabBarButton: HapticTab,
        sceneStyleInterpolator: ({ current }) => {
          const targetIndex = TAB_ORDER.indexOf(route.name);
          const direction = targetIndex >= prevTabIndex.current ? 1 : -1;
          return {
            sceneStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [direction * SCREEN_WIDTH * 0.3, 0],
                  }),
                },
              ],
              opacity: current.progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.5, 1],
              }),
            },
          };
        },
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
            key={pathname}
            intensity={100}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)' }]} />
          </BlurView>
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color }) => (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Post',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 size={24} name="plus" color={color} iconStyle="regular" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </Svg>
          ),
        }}
      />
    </Tabs>
  );
}
