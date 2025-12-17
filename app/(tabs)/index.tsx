import { getPlaces, Place } from "@/services/places";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

const DATA = [
  {
    id: "1",
    title: "Modern Apartment in Athens",
    rating: 4.8,
    image: "https://picsum.photos/400/250?1",
    coordinate: {
      latitude: 37.9838,
      longitude: 23.7275,
    },
  },
  {
    id: "2",
    title: "Cozy Studio Near Acropolis",
    rating: 4.6,
    image: "https://picsum.photos/400/250?2",
    coordinate: {
      latitude: 37.9715,
      longitude: 23.7267,
    },
  },
  {
    id: "3",
    title: "Luxury Loft with View",
    rating: 4.9,
    image: "https://picsum.photos/400/250?3",
    coordinate: {
      latitude: 37.9756,
      longitude: 23.7348,
    },
  },
];

export default function HomeScreen() {
  const mapRef = useRef<MapView | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const centerMap = (latitude: number, longitude: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      350
    );
  };

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setLoading(true);
        const data = await getPlaces();
        if (data) setPlaces(data);
      } catch (err) {
        console.error("Error, fetching places: ", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlaces();
  }, []);

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: 37.9838,
            longitude: 23.7275,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {places.map((place) => (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
              }}
              title={place.name}
              description={place.description}
              onPress={() => centerMap(place.latitude, place.longitude)}
            />
          ))}
        </MapView>
      </View>

      {/* Cards */}
      <View style={styles.listContainer}>
        {loading ? (
          <Text>Loading places...</Text>
        ) : (
          <FlatList
            data={places}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Image
                  source={{
                    uri: `https://picsum.photos/400/250?random=${item.id}`,
                  }}
                  style={styles.cardImage}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardTitle}>{item.description}</Text>
                  <Text style={styles.cardRating}>⭐ {item.rating_avg}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    padding: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
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
