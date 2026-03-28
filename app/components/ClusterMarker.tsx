/**
 * ClusterMarker — Airbnb-style cluster pin rendered inside a react-native-maps Marker.
 *
 * Visual design:
 *   • BRAND_BLUE filled circle (size scales with cluster count)
 *   • Semi-transparent BRAND_BLUE halo ring surrounding it
 *   • White count label
 *
 * Animation:
 *   • Spring scale 0→1 on mount so clusters "pop" in rather than appear abruptly.
 *   • After the entrance spring, a looping ambient glow pulses outward — a larger
 *     ring that expands and fades, giving the marker a breathing "alive" feel.
 *   • tracksViewChanges stays true so the continuous glow is visible on iOS MapKit.
 */
import { BRAND_BLUE } from '@/constants/theme';
import { ClusterPoint } from '@/hooks/useClusters';
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Marker } from 'react-native-maps';

interface ClusterMarkerProps {
  cluster: ClusterPoint;
  onPress: (cluster: ClusterPoint) => void;
}

const SPRING_CONFIG = { damping: 13, stiffness: 210, mass: 0.65 };
const GLOW_DURATION = 1600; // ms for one half-cycle (expand or fade)
const GLOW_PAD = 12; // extra radius the glow ring extends beyond the halo

/** Inner circle diameter scales with cluster size for quick at-a-glance density. */
function circleSize(count: number): number {
  if (count < 5)  return 38;
  if (count < 20) return 46;
  return 56;
}

const ClusterMarker = memo(({ cluster, onPress }: ClusterMarkerProps) => {
  const scale = useSharedValue(0);
  const glow  = useSharedValue(0);

  // tracksViewChanges must be true while the entrance animation runs so MapKit
  // captures the final rendered state. Once the spring settles we turn it off —
  // keeping it true with a looping Reanimated animation causes iOS MapKit to
  // snapshot the view mid-frame during unrelated UI animations (e.g. the bottom
  // sheet opening), which makes the annotation view snap to screen position (0,0).
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    // Entrance pop
    scale.value = withSpring(1, SPRING_CONFIG, (finished) => {
      'worklet';
      if (!finished) return;
      // Stop tracking view changes: position is now stable and continuous
      // snapshotting is no longer needed. Glow will still animate on Android.
      runOnJS(setTracksViewChanges)(false);
      // Start ambient glow after the entrance settles
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: GLOW_DURATION, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: GLOW_DURATION, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    });
  }, []);

  const entranceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.2,
    transform: [{ scale: 1 + glow.value * 0.30 }],
  }));

  const inner      = circleSize(cluster.count);
  const outer      = inner + 14;           // halo ring adds 7 px on each side
  const glowSize   = outer + GLOW_PAD * 2; // glow ring starts slightly larger
  const wrapSize   = glowSize ;         // wrapper has room for the scaled glow

  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={e => {
        e.stopPropagation();
        onPress(cluster);
      }}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      {/* Wrapper sized to contain the glow at its largest scale */}
      <Animated.View style={[{ width: wrapSize, height: wrapSize, alignItems: 'center', justifyContent: 'center' }, entranceStyle]}>

        {/* Ambient glow ring — pulses outward and fades */}
        <Animated.View
          style={[
            styles.glowRing,
            { width: glowSize, height: glowSize, borderRadius: glowSize / 2, position: 'absolute' },
            glowStyle,
          ]}
        />

        {/* Outer halo ring */}
        <View style={[styles.ring, { width: outer, height: outer, borderRadius: outer / 2 }]}>
          {/* Inner filled circle */}
          <View style={[styles.circle, { width: inner, height: inner, borderRadius: inner / 2 }]}>
            <Text style={[styles.count, inner >= 56 && styles.countLarge]}>
              {cluster.count}
            </Text>
          </View>
        </View>

      </Animated.View>
    </Marker>
  );
});

ClusterMarker.displayName = 'ClusterMarker';
export default ClusterMarker;

const styles = StyleSheet.create({
  glowRing: {
    backgroundColor: BRAND_BLUE,
  },
  ring: {
    backgroundColor: `${BRAND_BLUE}30`, // ~19% opacity halo
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  countLarge: {
    fontSize: 15,
  },
});
