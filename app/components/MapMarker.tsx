/**
 * MapMarker — custom rating pill rendered inside a react-native-maps Marker.
 *
 * When a marker is selected (isSelected changes to true) a Reanimated spring
 * animates the scale from 1 → 1.25, making the selected place visually pop
 * without triggering a React re-render on every frame.
 *
 * `tracksViewChanges` is set to `true` only while the scale animation is
 * running (i.e. while isSelected is true) to minimise the performance cost
 * of view tracking on iOS MapKit.
 */
import { BRAND_BLUE, isDark } from '@/constants/theme';
import { PlaceEnhanced } from '@/services/places';
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Marker } from 'react-native-maps';

interface MapMarkerProps {
  place: PlaceEnhanced;
  isSelected: boolean;
  isFavorite: boolean;
  onPress: (place: PlaceEnhanced) => void;
}

const SPRING_CONFIG = { damping: 14, stiffness: 220, mass: 0.6 };

const MapMarker = memo(
  ({ place, isSelected, isFavorite, onPress }: MapMarkerProps) => {
    // ── Scale spring ──────────────────────────────────────────────────────────
    const scale = useSharedValue(1);

    useEffect(() => {
      scale.value = withSpring(isSelected ? 1.25 : 1, SPRING_CONFIG);
    }, [isSelected]);

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    // ── Visual states ─────────────────────────────────────────────────────────
    const bg = isSelected ? BRAND_BLUE : isDark ? '#1c1c1e' : '#fff';
    const textColor = isSelected ? '#fff' : isDark ? '#fff' : '#111';
    const borderColor = isSelected
      ? BRAND_BLUE
      : isFavorite
      ? '#ff4081'
      : isDark
      ? '#3a3a3c'
      : '#d1d1d6';

    return (
      <Marker
        coordinate={{
          latitude: place.latitude,
          longitude: place.longitude,
        }}
        onPress={e => {
          e.stopPropagation();
          onPress(place);
        }}
        // Only track view changes while selected so the spring animation
        // is reflected on the native layer. Disabling it for unselected
        // markers is a significant performance win on large datasets.
        tracksViewChanges={isSelected}
      >
        <Animated.View
          style={[
            styles.pill,
            {
              backgroundColor: bg,
              borderColor,
              borderWidth: isFavorite && !isSelected ? 2 : 1.5,
              shadowOpacity: isSelected ? 0.3 : 0.15,
            },
            animStyle,
          ]}
        >
          <Text style={[styles.label, { color: textColor }]}>
            {place.rating_avg.toFixed(1)}
          </Text>
        </Animated.View>
      </Marker>
    );
  },
  // Custom equality: only re-render when visual state changes
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.isFavorite === next.isFavorite &&
    prev.place.id === next.place.id &&
    prev.place.latitude === next.place.latitude &&
    prev.place.longitude === next.place.longitude &&
    prev.place.rating_avg === next.place.rating_avg
);

MapMarker.displayName = 'MapMarker';
export default MapMarker;

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
