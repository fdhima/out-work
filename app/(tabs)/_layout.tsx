import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Svg, { Path } from 'react-native-svg';
import { Redirect, Tabs, usePathname } from 'expo-router';
import React, { useRef } from 'react';
import { Dimensions, Platform, StyleSheet } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TAB_ORDER = ['home', 'index', 'favorites', 'explore', 'settings'];

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
      initialRouteName="home"
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
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: isDark ? '#2C2C2E' : '#E0E0E0',
            height: 85,
            paddingBottom: 25,
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          },
          android: {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: isDark ? '#2C2C2E' : '#E0E0E0',
            elevation: 8,
            height: 70,
            paddingBottom: 12,
            paddingTop: 10,
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          },
          default: {},
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => focused ? (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
              <Path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
              <Path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
            </Svg>
          ) : (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => focused ? (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
              <Path fillRule="evenodd" d="M8.161 2.58a1.875 1.875 0 0 1 1.678 0l4.993 2.498c.106.052.23.052.336 0l3.869-1.935A1.875 1.875 0 0 1 21.75 4.82v12.485c0 .71-.401 1.36-1.037 1.677l-4.875 2.437a1.875 1.875 0 0 1-1.676 0l-4.994-2.497a.375.375 0 0 0-.336 0l-3.868 1.935A1.875 1.875 0 0 1 2.25 19.18V6.695c0-.71.401-1.36 1.036-1.677l4.875-2.437ZM9 6a.75.75 0 0 1 .75.75V15a.75.75 0 0 1-1.5 0V6.75A.75.75 0 0 1 9 6Zm6.75 3a.75.75 0 0 0-1.5 0v8.25a.75.75 0 0 0 1.5 0V9Z" clipRule="evenodd" />
            </Svg>
          ) : (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, focused }) => focused ? (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
              <Path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
            </Svg>
          ) : (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
          title: 'Post',
          tabBarIcon: ({ color }) => (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 4.5v15m7.5-7.5h-15" />
            </Svg>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => focused ? (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
              <Path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
            </Svg>
          ) : (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </Svg>
          ),
        }}
      />
    </Tabs>
  );
}
