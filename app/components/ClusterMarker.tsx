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
 *   • tracksViewChanges is true only while the entrance spring is running, then
 *     switched to false for the performance benefit (avoids continuous iOS MapKit
 *     view-change tracking).
 */
import { BRAND_BLUE } from '@/constants/theme';
import { ClusterPoint } from '@/hooks/useClusters';
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Marker } from 'react-native-maps';

interface ClusterMarkerProps {
  cluster: ClusterPoint;
  onPress: (cluster: ClusterPoint) => void;
}

const SPRING_CONFIG = { damping: 13, stiffness: 210, mass: 0.65 };

/** Inner circle diameter scales with cluster size for quick at-a-glance density. */
function circleSize(count: number): number {
  if (count < 5)  return 38;
  if (count < 20) return 46;
  return 56;
}

const ClusterMarker = memo(({ cluster, onPress }: ClusterMarkerProps) => {
  const scale = useSharedValue(0);
  // Keep tracksViewChanges=true only while the entrance animation plays.
  const [tracksChanges, setTracksChanges] = useState(true);

  useEffect(() => {
    scale.value = withSpring(1, SPRING_CONFIG, (finished) => {
      'worklet';
      if (finished) runOnJS(setTracksChanges)(false);
    });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const inner = circleSize(cluster.count);
  const outer = inner + 14; // halo ring adds 7px on each side

  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={e => {
        e.stopPropagation();
        onPress(cluster);
      }}
      tracksViewChanges={tracksChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      {/* Outer halo ring */}
      <Animated.View
        style={[
          styles.ring,
          { width: outer, height: outer, borderRadius: outer / 2 },
          animStyle,
        ]}
      >
        {/* Inner filled circle */}
        <View style={[styles.circle, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          <Text style={[styles.count, inner >= 56 && styles.countLarge]}>
            {cluster.count}
          </Text>
        </View>
      </Animated.View>
    </Marker>
  );
});

ClusterMarker.displayName = 'ClusterMarker';
export default ClusterMarker;

const styles = StyleSheet.create({
  ring: {
    backgroundColor: `${BRAND_BLUE}30`, // ~19% opacity halo
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
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
