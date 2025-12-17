import { getPlaces, Place } from "@/services/places";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function HomeScreen() {
  const mapRef = useRef<MapView | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

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
        console.error("Error fetching places: ", err);
      } finally {
        setLoading(false);
      }
    };
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

      {/* List or Detail */}
      <View style={styles.listContainer}>
        {loading ? (
          <Text>Loading places...</Text>
        ) : selectedPlace ? (
          // Detail View
          <ScrollView>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedPlace(null)}
            >
              <Text style={styles.backButtonText}>← Back to list</Text>
            </TouchableOpacity>

            <Image
              source={{
                uri: `https://picsum.photos/400/250?random=${selectedPlace.id}`,
              }}
              style={styles.cardImage}
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{selectedPlace.name}</Text>
              <Text style={styles.cardDescription}>{selectedPlace.description}</Text>
              <Text style={styles.cardRating}>⭐ {selectedPlace.rating_avg}</Text>
              <Text style={styles.cardCoordinates}>
                Latitude: {selectedPlace.latitude}, Longitude: {selectedPlace.longitude}
              </Text>
              <Text style={styles.cardStatus}>
                Approved: {selectedPlace.approved ? "Yes" : "No"}
              </Text>
            </View>
          </ScrollView>
        ) : (
          // List View
          <FlatList
            data={places}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  setSelectedPlace(item);        // Select the place
                  centerMap(item.latitude, item.longitude); // Center the map
                }}
              >
                <Image
                  source={{
                    uri: `https://picsum.photos/400/250?random=${item.id}`,
                  }}
                  style={styles.cardImage}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text
                    style={styles.cardDescription}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.description}
                  </Text>
                  <Text style={styles.cardRating}>⭐ {item.rating_avg}</Text>
                </View>
              </TouchableOpacity>
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
  cardDescription: {
    fontSize: 14,
    marginBottom: 4,
    color: "#333",
  },
  cardRating: {
    fontSize: 14,
    color: "#555",
  },
  cardCoordinates: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  cardStatus: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
});
