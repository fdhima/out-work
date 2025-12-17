import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";


export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.9838,
          longitude: 23.7275,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={{
            latitude: 37.9838,
            longitude: 23.7275,
          }}
          title="Athens"
          description="Marker example"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});