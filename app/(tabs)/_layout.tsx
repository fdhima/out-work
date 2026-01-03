import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Redirect href="../auth/signin" />

  // Design System Colors
  const BRAND_BLUE = '#4A90E2';
  const INACTIVE_COLOR = '#999999';
  const BG_COLOR = colorScheme === 'dark' ? '#1c1c1e' : '#ffffff';

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
            backgroundColor: colorScheme === 'dark' ? 'rgba(28,28,30,0.9)' : 'rgba(255,255,255,0.9)',
            borderTopWidth: 0,
            elevation: 0,
            height: 85,
            paddingBottom: 25,
            // Blur effect simulation via background opacity
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          android: {
            backgroundColor: BG_COLOR,
            borderColor: 'rgba(0,0,0,0.05)',
            borderTopWidth: 1,
            height: 65,
            paddingBottom: 10,
            paddingTop: 10,
            elevation: 8,
          },
          default: {},
        }),
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
          title: 'Saved', // Renaming Explore to Saved or similar if it's meant to be that? Or Keep Explore if it's list? 
          // The prompt implied "Explore" -> "paperplane", usually list view. 
          // But previous index.tsx has "Map first" and toggle for List. 
          // Let's stick to "Explore" or maybe "Places" if user didn't specify. 
          // Actually index.tsx IS the main map/list. 
          // So "index" = "Home/Map". 
          // What is the previous "explore" tab? It was paperplane. 
          // Let's look at file structure... actually let's just keep "Explore" as is but use a relevant icon.
          // Maybe "travel-explore" or "search".
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="explore" color={color} />
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
