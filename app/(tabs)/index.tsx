import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import FullscreenGallery from "@/components/ui/fullscreen-gallery";
import { useAuth } from "@/context/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getPlacesByCategory } from "@/services/categories";
import { getImagesForPlace } from "@/services/images";
import { getPlaces, Place } from "@/services/places";
import { createReview, getReviewsByPlaceId, Review } from "@/services/reviews";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

const { width, height } = Dimensions.get('window');

type PlaceWithImages = Place & { images: string[]; reviews?: Review[] };

const CATEGORIES = [
  { id: "all", label: "All", icon: "grid-view" },
  { id: "quiet", label: "Quiet", icon: "volume-off" },
  { id: "meeting", label: "Meeting", icon: "groups" },
  { id: "wifi", label: "Fast Wifi", icon: "wifi" },
  { id: "late", label: "Late Night", icon: "nightlight" },
];

const CATEGORY_API_MAP: Record<string, string[]> = {
  all: [],
  quiet: ["quiet"],
  meeting: ["meeting"],
  wifi: ["wifi"],
  late: ["late_night"],
};

const COUNTRY_REGIONS: Record<string, any> = {
  Greece: {
    latitude: 39.0742,
    longitude: 21.8243,
    latitudeDelta: 6,
    longitudeDelta: 6,
  },
  Italy: {
    latitude: 41.8719,
    longitude: 12.5674,
    latitudeDelta: 6,
    longitudeDelta: 6,
  },
};

let mapInit = false;

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  // Brand Colors
  const BRAND_BLUE = "#4A90E2";
  const BRAND_PURPLE = "#8b5cf6";
  const primaryColor = BRAND_BLUE;

  const iconColor = useThemeColor({}, "icon");
  const isDark = colorScheme === 'dark';

  const [places, setPlaces] = useState<PlaceWithImages[]>([]);
  const [allPlaces, setAllPlaces] = useState<PlaceWithImages[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection State
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithImages | null>(null); // For Full Detail View
  const [previewPlace, setPreviewPlace] = useState<PlaceWithImages | null>(null); // For Floating Card on Map

  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // View Mode: 'list' | 'map' - DEFAULT TO MAP
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const [trackingSub, setTrackingSub] = useState<Location.LocationSubscription | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);

  const MAX_REVIEWS_PREVIEW = 3;
  const { session } = useAuth();
  const mapRef = useRef<MapView | null>(null);

  const visibleReviews = showAllReviews
    ? selectedPlace?.reviews ?? []
    : (selectedPlace?.reviews ?? []).slice(0, MAX_REVIEWS_PREVIEW);

  const hasMoreReviews =
    (selectedPlace?.reviews?.length ?? 0) > MAX_REVIEWS_PREVIEW;

  useFocusEffect(
    useCallback(() => {
      fetchPlaces(selectedCategory);
    }, [selectedCategory])
  );

  const getCountryFromCoords = async (
    latitude: number,
    longitude: number
  ) => {
    const places = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (!places.length) return null;

    return places[0].country;
  };

  const initializeMap = async () => {
    if (!userLocation) return;

    const country = await getCountryFromCoords(
      userLocation.latitude,
      userLocation.longitude
    )

    if (!country || !COUNTRY_REGIONS[country]) return ;

    mapRef.current?.animateToRegion(
      COUNTRY_REGIONS[country],
      700
    );

    mapInit = true;
    // mapRef.current?.animateToRegion(
    //   {
    //     latitude: 37.9838,
    //     longitude: 23.7275,
    //     latitudeDelta: 0.005,
    //     longitudeDelta: 0.005,
    //   },
    //   500
    // );
  };

  useEffect(() => {
    initializeMap();
  }, []);

  const centerOnUser = () => {
    if (!userLocation) return;

    centerMap(userLocation.latitude, userLocation.longitude);
  };

  async function enableTracking() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission denied');
      return;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        console.log(location.coords);
        setUserLocation(location.coords);
      }
    );

    return subscription;
  }
  
  useEffect(() => {
    let sub: Location.LocationSubscription;

    (async () => {
      sub = await enableTracking();
      setTrackingSub(sub);
    })();

    return () => {
      sub?.remove();
    };
  }, []);

  const filterPlaces = useCallback(() => {
    let filtered = allPlaces;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (place) =>
          place.name.toLowerCase().includes(query) ||
          place.description.toLowerCase().includes(query)
      );
    }

    setPlaces(filtered);
  }, [allPlaces, searchQuery]);

  // Update displayed places when search query changes
  useEffect(() => {
    filterPlaces();
  }, [searchQuery, filterPlaces]);

  const fetchPlaces = async (categoryId: string) => {
    try {
      setLoading(true);
      const apiCategories = CATEGORY_API_MAP[categoryId];
      const data =
        categoryId === "all"
          ? await getPlaces()
          : await getPlacesByCategory(apiCategories);

      if (!data) return;

      const placesWithImages = await Promise.all(
        data.map(async (place) => {
          const images = await getImagesForPlace(place.id);
          const reviews = await getReviewsByPlaceId(place.id);
          return { ...place, images, reviews: reviews };
        })
      );

      setAllPlaces(placesWithImages);
      // Apply current search filter to new results
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const filtered = placesWithImages.filter(
          (place) =>
            place.name.toLowerCase().includes(query) ||
            place.description.toLowerCase().includes(query)
        );
        setPlaces(filtered);
      } else {
        setPlaces(placesWithImages);
      }
    } catch (err) {
      console.error("Error fetching places: ", err);
    } finally {
      setLoading(false);
    }
  };

  const centerMap = (latitude: number, longitude: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      500
    );
  };

  const onMarkerPress = (place: PlaceWithImages) => {
    setPreviewPlace(place);
    centerMap(place.latitude, place.longitude);
  };

  const onMapPress = () => {
    if (previewPlace) {
      setPreviewPlace(null);
    }
  };

  const submitReview = async () => {
    if (!selectedPlace || !session?.user) return;
    const placeId = selectedPlace.id;
    setSubmittingReview(true);
    try {
      await createReview({
        comment: reviewText.trim(),
        rating: reviewRating,
        place_id: placeId,
        profile_id: session.user.id,
        created_at: new Date().toISOString(),
      });
      const reviews = await getReviewsByPlaceId(placeId);
      const avg = reviews && reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

      setSelectedPlace((prev) => (prev ? { ...prev, reviews, rating_avg: avg } : prev));
      setPlaces((prev) => prev.map((p) => (p.id === placeId ? { ...p, reviews, rating_avg: avg } : p)));

      setReviewText("");
      setReviewRating(5);
      setShowAllReviews(true);
    } catch (err) {
      console.error("Error posting review:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  function ImageCarousel({ images, height, onPress, borderRadius = 0 }: { images: string[]; height: number; onPress?: (index: number) => void; borderRadius?: number }) {
    const [index, setIndex] = useState(0);

    const imgs = (images && images.length ? images.slice(0, 5) : []) as string[];
    const placeholder = "https://via.placeholder.com/400x250?text=No+Image";

    return (
      <View style={{ width: "100%", height, borderRadius, overflow: 'hidden' }}>
        <FlatList
          data={imgs.length ? imgs : [placeholder]}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index: itemIndex }) => (
            <TouchableOpacity activeOpacity={1} onPress={() => onPress?.(itemIndex)}>
              <Image
                source={{ uri: item }}
                style={{ width: width - (borderRadius ? (borderRadius > 0 ? 0 : 40) : 0), height, backgroundColor: "#f3f4f6" }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          onScroll={(e) => {
            // Basic approximate pagination
            const offsetX = e.nativeEvent.contentOffset.x;
            // This width calculation is simpler in this context
            const w = width - (borderRadius ? (borderRadius > 0 ? 0 : 40) : 0);
            const newIndex = Math.round(offsetX / w);
            if (newIndex !== index) setIndex(newIndex);
          }}
          scrollEventThrottle={16}
        />

        {(imgs.length ? imgs : [placeholder]).length > 1 && (
          <View style={styles.pagination} pointerEvents="none">
            {(imgs.length ? imgs : [placeholder]).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === index ? { backgroundColor: '#fff', opacity: 1 } : { backgroundColor: '#fff', opacity: 0.5 }
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  }

  const renderStars = (rating: number, size = 14, color = primaryColor) => {
    return (
      <View style={styles.starContainer}>
        <MaterialIcons name="star" size={size} color={color} />
        <ThemedText style={[styles.ratingText, { fontSize: size }]}>{rating.toFixed(1)}</ThemedText>
      </View>
    );
  };

  const SearchHeader = useMemo(() => () => (
    <View style={[styles.headerContainer, { shadowColor: isDark ? "#000" : "#666" }]}>
      {/* Search Bar Pill */}
      <View style={[styles.searchPill, { backgroundColor: isDark ? '#2c2c2e' : '#fff', borderColor: isDark ? '#444' : '#ddd' }]}>
        <MaterialIcons name="search" size={20} color={isDark ? "#fff" : "#000"} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Where to work?"
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8} style={styles.iconButton}>
            <MaterialIcons name="close" size={18} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.filterIconCircle, { borderColor: isDark ? '#555' : '#ddd' }]}>
            <MaterialIcons name="tune" size={14} color={isDark ? "#fff" : "#000"} />
          </View>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={[
                styles.categoryItem,
                isActive && styles.categoryItemActive,
              ]}
            >
              <MaterialIcons
                name={cat.icon as any}
                size={24}
                color={isActive ? (isDark ? "#fff" : "#000") : (isDark ? "#fff" : "#666")}
                style={isActive ? {} : { backgroundColor: '#fff', padding: 8, borderRadius: 20, overflow: 'hidden' }}
              />
              <ThemedText
                style={[
                  styles.categoryLabel,
                  isActive ? { fontWeight: '700', color: textColor } : { color: isDark ? '#ccc' : '#444' }
                ]}
              >
                {cat.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  ), [textColor, searchQuery, selectedCategory, isDark]);

  const ViewToggle = () => (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setViewMode("map")}
        style={[styles.toggleItem, viewMode === "map" && styles.toggleItemActive]}
      >
        <MaterialIcons name="map" size={20} color={viewMode === "map" ? "#000" : "#fff"} />
        <ThemedText style={[styles.toggleText, viewMode === "map" && styles.toggleTextActive]}>Map</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setViewMode("list")}
        style={[styles.toggleItem, viewMode === "list" && styles.toggleItemActive]}
      >
        <MaterialIcons name="view-list" size={20} color={viewMode === "list" ? "#000" : "#fff"} />
        <ThemedText style={[styles.toggleText, viewMode === "list" && styles.toggleTextActive]}>List</ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* If detailed view is active, show it fully OVER everything else */}
      {selectedPlace ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.detailContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Detailed View Header */}
            <View style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}>
              <TouchableOpacity
                style={styles.circleButton}
                onPress={() => setSelectedPlace(null)}
              >
                <MaterialIcons name="arrow-back" size={20} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}>
              <View style={[styles.circleButton, { gap: 15, width: 'auto', paddingHorizontal: 12 }]}>
                <MaterialIcons name="share" size={20} color="#000" />
                <MaterialIcons name="favorite-border" size={20} color="#000" />
              </View>
            </View>

            <ImageCarousel
              images={selectedPlace.images ?? [`https://picsum.photos/400/250?random=${selectedPlace.id}`]}
              height={350}
              onPress={(i) => {
                setGalleryImages(selectedPlace.images ?? [`https://picsum.photos/400/250?random=${selectedPlace.id}`]);
                setGalleryIndex(i);
                setGalleryVisible(true);
              }}
            />

            <View style={styles.detailContent}>
              <ThemedText type="title" style={styles.detailTitle}>
                {selectedPlace.name}
              </ThemedText>
              <View style={styles.detailRatingRow}>
                {renderStars(selectedPlace.rating_avg, 16, isDark ? "#fff" : "#000")}
                <ThemedText style={{ fontSize: 14, opacity: 0.6 }}> • {selectedPlace.reviews?.length || 0} reviews</ThemedText>
              </View>

              <ThemedText style={styles.detailDescription}>
                {selectedPlace.description}
              </ThemedText>

              {/* Meta Info */}
              <View
                style={[
                  styles.detailMeta,
                  {
                    borderTopColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                  },
                ]}
              >
                <View style={styles.metaRow}>
                  <MaterialIcons name="place" size={24} color={iconColor} />
                  <View>
                    <ThemedText style={{ fontWeight: '600' }}>Location</ThemedText>
                    <ThemedText style={{ fontSize: 14, opacity: 0.7 }}>
                      {selectedPlace.latitude.toFixed(4)}, {selectedPlace.longitude.toFixed(4)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <MaterialIcons name="workspace-premium" size={24} color={iconColor} />
                  <View>
                    <ThemedText style={{ fontWeight: '600' }}>Top features</ThemedText>
                    <ThemedText style={{ fontSize: 14, opacity: 0.7 }}>
                      {CATEGORIES.slice(1, 4).map(c => c.label).join(' • ')}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Reviews */}
              <View style={styles.reviewsContainer}>
                <ThemedText type="title" style={styles.sectionTitle}>
                  Reviews
                </ThemedText>

                {/* Review Form */}
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
                          color={primaryColor}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    value={reviewText}
                    onChangeText={setReviewText}
                    placeholder="Share your experience…"
                    placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
                    multiline
                    style={[
                      styles.reviewInput,
                      {
                        color: textColor,
                        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                        borderColor: isDark ? "transparent" : "#e5e7eb",
                        borderWidth: 1
                      },
                    ]}
                  />
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={submitReview}
                    disabled={!reviewText.trim() || submittingReview || !session?.user}
                    style={[
                      styles.submitButton,
                      {
                        backgroundColor: primaryColor,
                        opacity: !reviewText.trim() || submittingReview || !session?.user ? 0.6 : 1,
                      },
                    ]}
                  >
                    {submittingReview ? (
                      <ActivityIndicator color="#ffffffff" />
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Post</ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Reviews List */}
                {visibleReviews.length ? (
                  <>
                    {visibleReviews.map((r) => (
                      <View key={r.id} style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.avatarPlaceholder}>
                            <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>{r.full_name.charAt(0)}</ThemedText>
                          </View>
                          <View>
                            <ThemedText style={styles.reviewAuthor}>
                              {r.full_name}
                            </ThemedText>
                            <ThemedText style={styles.reviewDate}>
                              {new Date(r.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </ThemedText>
                          </View>
                        </View>

                        <ThemedText style={styles.reviewText}>
                          {r.comment}
                        </ThemedText>
                      </View>
                    ))}

                    {hasMoreReviews && (
                      <TouchableOpacity
                        onPress={() => setShowAllReviews((v) => !v)}
                        style={styles.showMoreButton}
                        activeOpacity={0.7}
                      >
                        <ThemedText style={{ color: isDark ? "#fff" : "#000", fontWeight: "600", textDecorationLine: 'underline' }}>
                          {showAllReviews ? "Show less" : `Show all ${selectedPlace.reviews?.length} reviews`}
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
          </ScrollView>

          {/* Sticky Bottom Bar */}
          <View style={[styles.stickyBottomBar, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
            <View>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>Free</ThemedText>
              <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>No reservation required</ThemedText>
            </View>
            <TouchableOpacity style={[styles.reserveButton, { backgroundColor: BRAND_BLUE }]}>
              <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Directions</ThemedText>
            </TouchableOpacity>
          </View>

          <FullscreenGallery
            visible={galleryVisible}
            images={galleryImages}
            initialIndex={galleryIndex}
            onRequestClose={() => setGalleryVisible(false)}
          />
        </KeyboardAvoidingView>
      ) : (
        <>
          {/* MAIN CONTENT: MAP OR LIST */}
          <View style={{ flex: 1 }}>
            {/* Search Header OVERLAY */}
            {viewMode === 'map' && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
                {SearchHeader()}
              </View>
            )}
            {viewMode === 'list' && SearchHeader()}

            {viewMode === "list" ? (
              <FlatList
                data={places}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => setSelectedPlace(item)}
                    activeOpacity={0.9}
                  >
                    <View style={{ position: 'relative' }}>
                      <ImageCarousel
                        images={item.images ?? [`https://picsum.photos/400/250?random=${item.id}`]}
                        height={320}
                        borderRadius={12}
                        onPress={(i) => {
                          setGalleryImages(item.images ?? [`https://picsum.photos/400/250?random=${item.id}`]);
                          setGalleryIndex(i);
                          setGalleryVisible(true);
                        }}
                      />
                      {/* Heart Icon Overlay */}
                      <TouchableOpacity style={styles.heartOverlay}>
                        <MaterialIcons name="favorite-border" size={26} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeaderRow}>
                        <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                          {item.name}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MaterialIcons name="star" size={14} color={isDark ? "#fff" : "#000"} />
                          <ThemedText style={{ fontSize: 14 }}>{item.rating_avg.toFixed(1)}</ThemedText>
                        </View>
                      </View>

                      <ThemedText style={styles.cardSecondaryText} numberOfLines={1}>
                        Hosted by OutWork
                      </ThemedText>
                      <ThemedText style={styles.cardSecondaryText} numberOfLines={1}>
                        {item.description}
                      </ThemedText>

                      <View style={{ marginTop: 6, flexDirection: 'row', gap: 4 }}>
                        <ThemedText style={{ fontSize: 15, fontWeight: '700' }}>
                          Free
                        </ThemedText>
                        <ThemedText style={{ fontSize: 15, fontWeight: '400' }}>
                          • Open Now
                        </ThemedText>
                      </View>
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
            ) : (
              <View style={{ flex: 1 }}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_DEFAULT}
                  style={StyleSheet.absoluteFill}
                  showsUserLocation
                  onPress={onMapPress}
                  // initialRegion={initializeMap}
                >
                  {/* Center on User Button */}
                  {userLocation && (
                    <TouchableOpacity
                      onPress={centerOnUser}
                      activeOpacity={0.85}
                      style={styles.centerUserButton}
                    >
                      <MaterialIcons name="my-location" size={22} color="#000" />
                    </TouchableOpacity>
                  )}

                  {places.map((place) => {
                    const isSelected = previewPlace?.id === place.id;
                    const bg = isSelected ? BRAND_BLUE : '#fff';
                    const text = isSelected ? '#fff' : '#000';
                    const zIndex = isSelected ? 100 : 1;

                    return (
                      <Marker
                        key={place.id}
                        coordinate={{
                          latitude: place.latitude,
                          longitude: place.longitude,
                        }}
                        onPress={(e) => {
                          e.stopPropagation(); // Stop propagation to map press
                          onMarkerPress(place);
                        }}
                        tracksViewChanges={false} // Performance optimization
                        zIndex={zIndex}
                      >
                        <View style={[styles.mapPill, {
                          backgroundColor: bg,
                          borderColor: isSelected ? BRAND_BLUE : (isDark ? '#333' : '#ddd'),
                          transform: [{ scale: isSelected ? 1.1 : 1 }]
                        }]}>
                          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: text }}>
                            {place.rating_avg.toFixed(1)}
                          </ThemedText>
                        </View>
                      </Marker>
                    );
                  })}
                </MapView>

                {/* Floating Preview Card */}
                {previewPlace && (
                  <View style={styles.previewCardContainer}>
                    <TouchableOpacity
                      style={[styles.previewCard, { backgroundColor: isDark ? '#222' : '#fff' }]}
                      onPress={() => setSelectedPlace(previewPlace)}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: previewPlace.images?.[0] ?? `https://picsum.photos/400/250?random=${previewPlace.id}` }}
                        style={styles.previewImage}
                      />
                      <View style={styles.previewInfo}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <ThemedText numberOfLines={1} style={styles.previewTitle}>{previewPlace.name}</ThemedText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, width: "100%" }}>
                            <MaterialIcons name="star" size={12} color={isDark ? '#fff' : '#000'} />
                            <ThemedText style={{ fontSize: 12 }}>{previewPlace.rating_avg.toFixed(1)}</ThemedText>
                          </View>
                        </View>
                        <ThemedText numberOfLines={1} style={{ fontSize: 13, opacity: 0.6 }}>{previewPlace.description}</ThemedText>
                        <ThemedText style={{ fontSize: 13, fontWeight: '600', marginTop: 4 }}>Free</ThemedText>
                      </View>
                      <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewPlace(null)}>
                        <MaterialIcons name="close" size={16} color="#000" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            )}

            {/* View Toggle (Map/List) */}
            {!previewPlace && <ViewToggle />}

            <FullscreenGallery
              visible={galleryVisible}
              images={galleryImages}
              initialIndex={galleryIndex}
              onRequestClose={() => setGalleryVisible(false)}
            />

          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? 40 : 60, // Notch height
    paddingBottom: 0,
    zIndex: 10,
    borderBottomWidth: 0,
    elevation: 0,
    marginBottom: 10
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  iconButton: {
    padding: 4,
  },
  filterIconCircle: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,  // Tighter gap
  },
  categoryItem: {
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    opacity: 0.9,
    marginRight: 24
  },
  categoryItemActive: {
    borderBottomColor: 'transparent',
    opacity: 1,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8
  },

  // List
  listContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 40,
    gap: 0,
  },
  cardContent: {
    marginTop: 12,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardSecondaryText: {
    fontSize: 15,
    opacity: 0.6,
  },
  heartOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 5,
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Toggle
  toggleContainer: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    zIndex: 1000,
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 30,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  toggleItemActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  toggleTextActive: {
    color: '#000',
  },

  mapPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  mapMarkerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Preview Card on Map
  previewCardContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 101, // Above floating button
  },
  previewCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center'
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eee'
  },
  previewInfo: {
    flex: 1,
    gap: 4
  },
  previewTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginRight: 4
  },
  previewClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    opacity: 0.8
  },

  // Detail
  detailContainer: {
    paddingBottom: 120, // space for sticky bar
  },
  circleButton: {
    flexDirection: 'row',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailContent: {
    padding: 24,
  },
  detailTitle: {
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 0,
  },
  detailRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    gap: 4
  },
  detailDescription: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    marginTop: 16,
  },
  detailMeta: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    gap: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  // Review & Form
  reviewsContainer: {
    marginTop: 32,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  reviewFormCard: {
    marginBottom: 32,
    padding: 0,
  },
  writeReviewTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 12,
  },
  starSelector: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  reviewInput: {
    fontSize: 16,
    padding: 12,
    borderRadius: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCard: {
    marginBottom: 32,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAuthor: {
    fontWeight: '600',
    fontSize: 16,
  },
  reviewDate: {
    fontSize: 14,
    opacity: 0.5,
  },
  reviewText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  showMoreButton: {
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    // On Darkmode this needs to handle border color manually in inline style
  },
  noReviewsText: {
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: 10,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reserveButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  centerUserButton: {
    position: 'absolute',
    bottom: 220,        // Above toggle & preview card
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 200,
  },
});
