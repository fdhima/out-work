import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

const DATA = [
  {
    id: "1",
    title: "Modern Apartment in Athens",
    rating: 4.8,
    image: "https://picsum.photos/400/250?1",
  },
  {
    id: "2",
    title: "Cozy Studio Near Acropolis",
    rating: 4.6,
    image: "https://picsum.photos/400/250?2",
  },
  {
    id: "3",
    title: "Luxury Loft with View",
    rating: 4.9,
    image: "https://picsum.photos/400/250?3",
  },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      {/* Top half: Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: 37.9838,
            longitude: 23.7275,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker
            coordinate={{ latitude: 37.9838, longitude: 23.7275 }}
            title="Athens"
          />
        </MapView>
      </View>

      {/* Bottom half: Cards */}
      <View style={styles.listContainer}>
        <FlatList
          data={DATA}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.cardImage} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardRating}>⭐ {item.rating}</Text>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* Map */
  mapContainer: {
    flex: 1, // half screen
  },

  /* Cards */
  listContainer: {
    flex: 1, // half screen
    padding: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3, // Android shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  cardImage: {
    width: "100%",
    height: 160,
  },

  cardContent: {
    padding: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },

  cardRating: {
    fontSize: 14,
    color: "#555",
  },
});
