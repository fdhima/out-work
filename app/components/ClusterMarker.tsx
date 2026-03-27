import { isDark } from '@/constants/theme';
import { ClusterPoint } from '@/hooks/useClusters';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

interface ClusterMarkerProps {
  cluster: ClusterPoint;
  onPress: (cluster: ClusterPoint) => void;
}

const ClusterMarker = memo(({ cluster, onPress }: ClusterMarkerProps) => (
  <Marker
    coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
    onPress={e => {
      e.stopPropagation();
      onPress(cluster);
    }}
    tracksViewChanges={false}
  >
    <View style={styles.circle}>
      <Text style={styles.count}>{cluster.count}</Text>
    </View>
  </Marker>
));

ClusterMarker.displayName = 'ClusterMarker';
export default ClusterMarker;

const styles = StyleSheet.create({
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: isDark ? '#1c1c1e' : '#fff',
    borderWidth: 1.5,
    borderColor: isDark ? '#3a3a3c' : '#d1d1d6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  count: {
    fontSize: 14,
    fontWeight: '700',
    color: isDark ? '#fff' : '#111',
  },
});
