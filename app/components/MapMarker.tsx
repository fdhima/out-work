/**
 * MapMarker — custom rating pill rendered inside a react-native-maps Marker.
 *
 * When a marker is selected (isSelected changes to true) a gentle breathing
 * loop animates the scale 1.0 → 1.06 → 1.0 (~2.5 s per cycle), giving the
 * selected place a passive "alive" feel without an abrupt scale jump.
 *
 * `tracksViewChanges` is set to `true` only while the scale animation is
 * running (i.e. while isSelected is true) to minimise the performance cost
 * of view tracking on iOS MapKit.
 */
import { BRAND_BLUE } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PlaceEnhanced } from '@/services/places';
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
          <View style={styles.row}>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </Svg>
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
