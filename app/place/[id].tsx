import { PlaceDetailed } from '../components/PlaceDetailed';
import { getPlaceEnhancedById, PlaceEnhanced } from '@/services/places';
import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { ThemedView } from '@/components/themed-view';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Shimmer skeleton shown while the place is loading ───────────────────────

function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  const isDark = (useColorScheme() ?? 'light') === 'dark';

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea',
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

function PlaceDetailSkeleton() {
  return (
    <View style={{ flex: 1 }}>
      {/* Hero image placeholder */}
      <SkeletonBlock width="100%" height={320} borderRadius={0} />

      {/* Content */}
      <View style={styles.skeletonContent}>
        <SkeletonBlock width="70%" height={28} />
        <SkeletonBlock width="40%" height={18} style={{ marginTop: 10 }} />
        <SkeletonBlock width="100%" height={16} style={{ marginTop: 24 }} />
        <SkeletonBlock width="90%" height={16} style={{ marginTop: 8 }} />
        <SkeletonBlock width="80%" height={16} style={{ marginTop: 8 }} />

        <View style={styles.skeletonPills}>
          <SkeletonBlock width={80} height={32} borderRadius={16} />
          <SkeletonBlock width={90} height={32} borderRadius={16} />
          <SkeletonBlock width={75} height={32} borderRadius={16} />
        </View>
      </View>
    </View>
  );
}

// ─── Route screen ─────────────────────────────────────────────────────────────

export default function PlaceScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [place, setPlace] = useState<PlaceEnhanced | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 15,
        },
        loc => setUserLocation(loc.coords)
      );
    })();
    return () => sub?.remove();
  }, []);

  const fetchPlace = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPlaceEnhancedById(Number(id));
      setPlace(data);
    } catch (e) {
      console.error('Failed to fetch place', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      const data = await getPlaceEnhancedById(Number(id));
      setPlace(data);
    } catch (e) {
      console.error('Failed to refresh place', e);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlace();
  }, [fetchPlace]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      {loading || !place ? (
        <PlaceDetailSkeleton />
      ) : (
        <PlaceDetailed
          selectedPlace={place}
          onClose={() => router.back()}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          userLocation={userLocation}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  skeletonContent: {
    padding: 24,
    gap: 0,
  },
  skeletonPills: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
});
