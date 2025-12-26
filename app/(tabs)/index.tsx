import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import FullscreenGallery from "@/components/ui/fullscreen-gallery";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getImagesForPlace } from "@/services/images";
import { getPlaces, Place } from "@/services/places";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker } from "react-native-maps";

type Review = {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
};

type PlaceWithImages = Place & { images: string[]; reviews?: Review[] };

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");

  const mapRef = useRef<MapView | null>(null);
  const mapFlexAnim = useRef(new Animated.Value(1)).current;
  const listFlexAnim = useRef(new Animated.Value(1)).current;

  const [places, setPlaces] = useState<PlaceWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithImages | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const [showAllReviews, setShowAllReviews] = useState(false);

  const MAX_REVIEWS_PREVIEW = 3;

  const visibleReviews = showAllReviews
    ? selectedPlace?.reviews ?? []
    : (selectedPlace?.reviews ?? []).slice(0, MAX_REVIEWS_PREVIEW);

  const hasMoreReviews =
    (selectedPlace?.reviews?.length ?? 0) > MAX_REVIEWS_PREVIEW;

  const centerMap = (latitude: number, longitude: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      },
      700
    );

    // Animate flex ratios when place is selected
    Animated.parallel([
      Animated.timing(mapFlexAnim, {
        toValue: 0.5,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(listFlexAnim, {
        toValue: 1.5,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const zoomOutMap = () => {
    mapRef.current?.animateToRegion(
      {
        latitude: 37.9838,
        longitude: 23.7275,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      700
    );

    // Animate flex ratios back to equal when deselected
    Animated.parallel([
      Animated.timing(mapFlexAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(listFlexAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  };

  function ImageCarousel({ images, height, onPress }: { images: string[]; height: number; onPress?: (index: number) => void }) {
    const [width, setWidth] = useState(0);
    const [index, setIndex] = useState(0);

    const imgs = (images && images.length ? images.slice(0, 4) : []) as string[];
    const placeholder = "https://via.placeholder.com/400x250?text=No+Image";

    return (
      <View
        style={{ width: "100%", height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <FlatList
          data={imgs.length ? imgs : [placeholder]}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index: itemIndex }) => (
            <TouchableOpacity activeOpacity={0.9} onPress={() => onPress?.(itemIndex)}>
              <Image
                source={{ uri: item }}
                style={{ width: width || undefined, height, backgroundColor: "#f3f4f6" }}
              />
            </TouchableOpacity>
          )}
          onScroll={(e) => {
            if (!width) return;
            const offsetX = e.nativeEvent.contentOffset.x;
            const newIndex = Math.round(offsetX / width);
            if (newIndex !== index) setIndex(newIndex);
          }}
          scrollEventThrottle={16}
        />

        {(imgs.length ? imgs : [placeholder]).length > 1 && (
          <View style={styles.pagination} pointerEvents="none">
            {(imgs.length ? imgs : [placeholder]).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index ? styles.dotActive : null]}
              />
            ))}
          </View>
        )}
      </View>
    );
  }


  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const data = await getPlaces();
      if (!data) return;

      // Fetch images for each place
      const placesWithImages = await Promise.all(
        data.map(async (place) => {
          const images = await getImagesForPlace(place.id);
          // Add some mocked reviews for testing
          const mockReviews: Review[] = [
            {
              id: `${place.id}-r1`,
              author: "Alice",
              rating: 4.5,
              text: "Lovely place — great atmosphere and friendly staff.",
              date: new Date().toISOString(),
            },
            {
              id: `${place.id}-r2`,
              author: "Bob",
              rating: 5,
              text: "Absolutely loved it! Will come back.",
              date: new Date().toISOString(),
            },
          ];

          return { ...place, images, reviews: mockReviews };
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
      <Animated.View
        style={[
          styles.mapContainer,
          {
            flex: mapFlexAnim,
          },
        ]}
      >
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
              onPress={() => {
                setSelectedPlace(place);
                centerMap(place.latitude, place.longitude);
              }}
            />
          ))}
        </MapView>
      </Animated.View>

      {/* List or Detail */}
      <Animated.View
        style={[
          styles.listContainer,
          {
            flex: listFlexAnim,
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
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.detailContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedPlace(null);
                zoomOutMap();
              }}
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
              <ImageCarousel
                images={selectedPlace.images ?? []}
                height={250}
                onPress={(i) => {
                  setGalleryImages(selectedPlace.images ?? []);
                  setGalleryIndex(i);
                  setGalleryVisible(true);
                }}
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

                {/* Reviews Section */}
                <View style={styles.reviewsContainer}>
                  <ThemedText type="title" style={styles.sectionTitle}>
                    Reviews
                  </ThemedText>

                  {/* Write review card */}
                  <View style={styles.reviewFormCard}>

                    <ThemedText style={styles.writeReviewTitle}>
                      Write a review
                    </ThemedText>

                    <View style={styles.starSelector}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                          <MaterialIcons
                            name={s <= reviewRating ? "star" : "star-border"}
                            size={28}
                            color={tintColor}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput
                      value={reviewText}
                      onChangeText={setReviewText}
                      placeholder="Share your experience…"
                      placeholderTextColor={
                        colorScheme === "dark" ? "#9ca3af" : "#6b7280"
                      }
                      multiline
                      style={[
                        styles.reviewInput,
                        {
                          color: textColor,
                          backgroundColor:
                            colorScheme === "dark"
                              ? "rgba(255,255,255,0.06)"
                              : "#f9fafb",
                        },
                      ]}
                    />

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[
                        styles.submitButton,
                        {
                          backgroundColor: tintColor,
                        },
                      ]}
                      disabled={!reviewText.trim() || submittingReview}

                    >
                      <ThemedText style={styles.submitButtonText}>
                        {submittingReview ? "Posting…" : "Post review"}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  {/* Existing reviews */}
                  {visibleReviews.length ? (
                    <>
                      {visibleReviews.map((r) => (
                        <View key={r.id} style={styles.reviewCard}>
                          <View style={styles.reviewHeader}>
                            <View style={styles.reviewAuthorRow}>
                              {[1, 2, 3, 4, 5].map((i) => (
                                <MaterialIcons
                                  key={i}
                                  name={i <= Math.round(r.rating) ? "star" : "star-border"}
                                  size={14}
                                  color={tintColor}
                                />
                              ))}
                              <ThemedText style={styles.reviewAuthor}>
                                {r.author}
                              </ThemedText>
                            </View>
                            <ThemedText style={styles.reviewDate}>
                              {new Date(r.date).toLocaleDateString()}
                            </ThemedText>
                          </View>

                          <ThemedText style={styles.reviewText}>
                            {r.text}
                          </ThemedText>
                        </View>
                      ))}

                      {hasMoreReviews && (
                        <TouchableOpacity
                          onPress={() => setShowAllReviews((v) => !v)}
                          style={styles.showMoreButton}
                          activeOpacity={0.7}
                        >
                          <ThemedText style={{ color: tintColor, fontWeight: "600" }}>
                            {showAllReviews ? "Show less" : "Show more reviews"}
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (

                    <ThemedText style={styles.noReviewsText}>
                      No reviews yet — be the first ✨
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
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
                <ImageCarousel
                  images={item.images ?? [`https://picsum.photos/400/250?random=${item.id}`]}
                  height={180}
                  onPress={(i) => {
                    setGalleryImages(item.images ?? [`https://picsum.photos/400/250?random=${item.id}`]);
                    setGalleryIndex(i);
                    setGalleryVisible(true);
                  }}
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
      </Animated.View>
      <FullscreenGallery
        visible={galleryVisible}
        images={galleryImages}
        initialIndex={galleryIndex}
        onRequestClose={() => setGalleryVisible(false)}
      />
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
  pagination: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: "rgba(0,0,0,0.7)",
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
reviewsContainer: {
  marginTop: 24,
  gap: 16,
},

sectionTitle: {
  fontSize: 22,
  fontWeight: "700",
},

reviewFormCard: {
  padding: 16,
  borderRadius: 16,
  gap: 12,
  backgroundColor: "rgba(0,0,0,0.03)",
},

writeReviewTitle: {
  fontSize: 16,
  fontWeight: "600",
},

starSelector: {
  flexDirection: "row",
  gap: 8,
},

reviewInput: {
  minHeight: 90,
  borderRadius: 12,
  padding: 12,
  fontSize: 14,
  textAlignVertical: "top",
},

submitButton: {
  marginTop: 4,
  paddingVertical: 12,
  borderRadius: 12,
  alignItems: "center",
},

submitButtonText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 15,
},

reviewCard: {
  padding: 14,
  borderRadius: 14,
  backgroundColor: "rgba(0,0,0,0.04)",
  gap: 6,
},

reviewHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

reviewAuthorRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

reviewAuthor: {
  fontSize: 14,
  fontWeight: "600",
},

reviewDate: {
  fontSize: 12,
  opacity: 0.6,
},

reviewText: {
  fontSize: 14,
  lineHeight: 20,
  opacity: 0.9,
},

noReviewsText: {
  fontSize: 14,
  opacity: 0.6,
  textAlign: "center",
  marginTop: 8,
},
showMoreButton: {
  alignItems: "center",
  marginTop: 4,
},

});
