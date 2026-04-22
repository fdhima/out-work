/**
 * MapMarker — custom rating pill rendered inside a react-native-maps Marker.
 *
 * When a marker is selected (isSelected changes to true) a gentle breathing
 * loop animates the scale 1.0 → 1.06 → 1.0 (~2.5 s per cycle), giving the
 * selected place a passive "alive" feel without an abrupt scale jump.
 *
 * `tracksViewChanges` is kept permanently false.  In react-native-maps,
 * appearance changes driven by React re-renders (e.g. isSelected flipping)
 * still refresh the iOS MapKit annotation snapshot even with the flag off —
 * the flag only enables per-frame continuous updates needed for UI-thread
 * animations.  Enabling it dynamically (true while selected, false on
 * dismiss) causes iOS MapKit to snapshot the annotation mid-frame during
 * concurrent UI animations (map zoom, bottom-sheet slide), snapping the
 * pin to screen position (0,0).  Keeping it false eliminates both the
 * "marker disappears on select" and "marker snaps to top-left on dismiss"
 * bugs with no visible regression: the breathing scale runs on Android
 * where it is rendered natively; on iOS the pill switches to blue instantly,
 * which is equally clear.
 */
import { BRAND_BLUE } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PlaceEnhanced } from '@/services/places';
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Marker } from 'react-native-maps';

interface MapMarkerProps {
  place: PlaceEnhanced;
  isSelected: boolean;
  isFavorite: boolean;
  onPress: (place: PlaceEnhanced) => void;
}


const MapMarker = memo(
  ({ place, isSelected, isFavorite, onPress }: MapMarkerProps) => {
    const isDark = useColorScheme() === 'dark';
    // ── Scale animation ───────────────────────────────────────────────────────
    const breathe = useSharedValue(1);

    useEffect(() => {
      if (isSelected) {
        // Gentle breathing: 1.0 → 1.06 → 1.0, ~2.5 s per cycle
        breathe.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0,  { duration: 1250, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
      } else {
        breathe.value = withTiming(1, { duration: 250 });
      }
    }, [isSelected]);

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: breathe.value }],
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
        tracksViewChanges={false}
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
          <View style={styles.row}>
            <Text style={{ fontSize: 11 }}>⭐</Text>
            <Text style={[styles.label, { color: textColor }]}>
              {place.rating_avg.toFixed(1)}
            </Text>
          </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
