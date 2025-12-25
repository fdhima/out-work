import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getImagesForPlace } from "@/services/images";
import { getPlaces, Place } from "@/services/places";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

type PlaceWithImages = Place & { images: string[] };

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");

  const mapRef = useRef<MapView | null>(null);
  const [places, setPlaces] = useState<PlaceWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithImages | null>(null);

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

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const data = await getPlaces();
      if (!data) return;

      // Fetch images for each place
      const placesWithImages = await Promise.all(
        data.map(async (place) => {
          const images = await getImagesForPlace(place.id);
          return { ...place, images };
        })
      );

      setPlaces(placesWithImages);
    } catch (err) {
      console.error("Error fetching places: ", err);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchPlaces();
    }, [])
  );



  const renderStars = (rating: number) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((starIndex) => (
          <MaterialIcons
            key={starIndex}
            name={starIndex <= Math.round(rating) ? "star" : "star-border"}
            size={16}
            color={starIndex <= Math.round(rating) ? tintColor : iconColor}
          />
        ))}
        <ThemedText style={styles.ratingText}>{rating.toFixed(1)}</ThemedText>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
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
      <View
        style={[
          styles.listContainer,
          {
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(21, 23, 24, 0.95)"
                : "rgba(255, 255, 255, 0.95)",
          },
        ]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tintColor} />
            <ThemedText style={styles.loadingText}>Loading places...</ThemedText>
          </View>
        ) : selectedPlace ? (
          // Detail View
          <ScrollView
            contentContainerStyle={styles.detailContainer}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedPlace(null)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={tintColor} />
              <ThemedText
                style={styles.backButtonText}
                lightColor={tintColor}
                darkColor={tintColor}
              >
                Back to list
              </ThemedText>
            </TouchableOpacity>

            <View
              style={[
                styles.detailCard,
                {
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255, 255, 255, 0.08)"
                      : "#ffffff",
                },
              ]}
            >
              <Image
                source={{
                  uri: selectedPlace.images?.[0] ?? "https://via.placeholder.com/400x250?text=No+Image",
                }}
                style={styles.detailImage}
              />
              <View style={styles.detailContent}>
                <ThemedText type="title" style={styles.detailTitle}>
                  {selectedPlace.name}
                </ThemedText>
                {renderStars(selectedPlace.rating_avg)}
                <ThemedText style={styles.detailDescription}>
                  {selectedPlace.description}
                </ThemedText>
                <View
                  style={[
                    styles.detailMeta,
                    {
                      borderTopColor:
                        colorScheme === "dark"
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(0, 0, 0, 0.1)",
                    },
                  ]}
                >
                  <View style={styles.metaRow}>
                    <MaterialIcons
                      name="location-on"
                      size={18}
                      color={iconColor}
                    />
                    <ThemedText style={styles.metaText}>
                      {selectedPlace.latitude.toFixed(4)}, {selectedPlace.longitude.toFixed(4)}
                    </ThemedText>
                  </View>
                  <View style={styles.metaRow}>
                    <MaterialIcons
                      name={selectedPlace.approved ? "check-circle" : "cancel"}
                      size={18}
                      color={selectedPlace.approved ? "#10b981" : iconColor}
                    />
                    <ThemedText style={styles.metaText}>
                      {selectedPlace.approved ? "Approved" : "Pending Approval"}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        ) : (
          // List View
          <FlatList
            data={places}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      colorScheme === "dark"
                        ? "rgba(255, 255, 255, 0.08)"
                        : "#ffffff",
                  },
                ]}
                onPress={() => {
                  setSelectedPlace(item);
                  centerMap(item.latitude, item.longitude);
                }}
                activeOpacity={0.7}
              >
                <Image
                  source={{
                    uri: item.images?.[0] ??  `https://picsum.photos/400/250?random=${item.id}`,
                  }}
                  style={styles.cardImage}
                />
                <View style={styles.cardContent}>
                  <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                    {item.name}
                  </ThemedText>
                  <ThemedText
                    style={styles.cardDescription}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.description}
                  </ThemedText>
                  {renderStars(item.rating_avg)}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="place" size={48} color={iconColor} />
                <ThemedText style={styles.emptyText}>
                  No places found
                </ThemedText>
              </View>
            }
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  card: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#f3f4f6",
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  starContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
    opacity: 0.8,
  },
  detailContainer: {
    paddingBottom: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  detailCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  detailImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#f3f4f6",
  },
  detailContent: {
    padding: 20,
    gap: 12,
  },
  detailTitle: {
    fontSize: 28,
    marginBottom: 4,
  },
  detailDescription: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    marginTop: 8,
  },
  detailMeta: {
    marginTop: 8,
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
});
