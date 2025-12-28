import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import FullscreenGallery from "@/components/ui/fullscreen-gallery";
import { useAuth } from "@/context/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getImagesForPlace } from "@/services/images";
import { getPlaces, Place } from "@/services/places";
import { createReview, getReviewsByPlaceId, Review } from "@/services/reviews";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
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

type PlaceWithImages = Place & { images: string[]; reviews?: Review[] };

const CATEGORIES = [
  { id: "all", label: "All", icon: "grid-view" },
  { id: "quiet", label: "Quiet", icon: "volume-off" },
  { id: "meeting", label: "Meeting", icon: "groups" },
  { id: "wifi", label: "Fast Wifi", icon: "wifi" },
  { id: "late", label: "Late Night", icon: "nightlight" },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  // const tintColor = useThemeColor({}, "tint"); // Replaced with custom orange
  const primaryColor = "#ff6b35"; // WorkSpot Orange
  const iconColor = useThemeColor({}, "icon");

  const [places, setPlaces] = useState<PlaceWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithImages | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // View Mode: 'list' | 'map'
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

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
      fetchPlaces();
    }, [])
  );

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const data = await getPlaces();
      if (!data) return;

      const placesWithImages = await Promise.all(
        data.map(async (place) => {
          const images = await getImagesForPlace(place.id);
          const reviews = await getReviewsByPlaceId(place.id);
          return { ...place, images, reviews: reviews };
        })
      );

      setPlaces(placesWithImages);
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
      700
    );
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
                resizeMode="cover"
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

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starContainer}>
        <MaterialIcons name="star" size={14} color={primaryColor} />
        <ThemedText style={styles.ratingText}>{rating.toFixed(1)}</ThemedText>
      </View>
    );
  };

  // --- Components ---

  const SearchHeader = () => (
    <View style={[styles.headerContainer, { backgroundColor, borderBottomColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' }]}>
      <TouchableOpacity activeOpacity={0.9} style={[styles.searchBar, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff' }]}>
        <MaterialIcons name="search" size={24} color={primaryColor} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
            Where to?
          </ThemedText>
          <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
            Anywhere · Any week · Add guests
          </ThemedText>
        </View>
        <View style={[styles.filterButton, { borderColor: colorScheme === 'dark' ? '#444' : '#ddd' }]}>
          <MaterialIcons name="tune" size={16} color={iconColor} />
        </View>
      </TouchableOpacity>

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
                color={isActive ? "#000" : "#888"} // Active is always blackish on light, handling dark mode via opacity if needed
                style={{ opacity: isActive ? 1 : 0.6 }}
              />
              <ThemedText
                style={[
                  styles.categoryLabel,
                  isActive && styles.categoryLabelActive,
                  { color: isActive ? (colorScheme === 'dark' ? '#fff' : '#000') : '#888' }
                ]}
              >
                {cat.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const FloatingMapButton = () => (
    <View style={styles.floatingButtonContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
        style={[styles.floatingButton, { backgroundColor: '#222' }]} // Keep it dark like Airbnb
      >
        <ThemedText style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
          {viewMode === "list" ? "Map" : "List"}
        </ThemedText>
        <MaterialIcons
          name={viewMode === "list" ? "map" : "list"}
          size={18}
          color="#fff"
        />
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
           <View style={{position: 'absolute', top: 50, left: 20, zIndex: 10 }}>
              <TouchableOpacity
                style={styles.circleButton}
                onPress={() => setSelectedPlace(null)}
              >
                  <MaterialIcons name="arrow-back" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <ImageCarousel
              images={selectedPlace.images ?? [`https://picsum.photos/400/250?random=${selectedPlace.id}`]}
              height={300}
              onPress={(i) => {
                setGalleryImages(selectedPlace.images ?? [`https://picsum.photos/400/250?random=${selectedPlace.id}`]);
                setGalleryIndex(i);
                setGalleryVisible(true);
              }}
            />
            {/* ... Rest of detail content ... */}
             <View style={styles.detailContent}>
              <ThemedText type="title" style={styles.detailTitle}>
                {selectedPlace.name}
              </ThemedText>
              {renderStars(selectedPlace.rating_avg)}
              <ThemedText style={styles.detailDescription}>
                {selectedPlace.description}
              </ThemedText>

              {/* Meta Info */}
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
                          <MaterialIcons name="send" size={18} color="#fff"/>
                          <ThemedText style={{color: '#fff', fontWeight: 'bold'}}>Post review</ThemedText>
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
                            <View style={styles.reviewAuthorRow}>
                              {[1, 2, 3, 4, 5].map((i) => (
                                <MaterialIcons
                                  key={i}
                                  name={i <= Math.round(r.rating) ? "star" : "star-border"}
                                  size={14}
                                  color={primaryColor}
                                />
                              ))}
                              <ThemedText style={styles.reviewAuthor}>
                                {r.username}
                              </ThemedText>
                            </View>
                            <ThemedText style={styles.reviewDate}>
                              {new Date(r.created_at).toLocaleDateString()}
                            </ThemedText>
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
                          <ThemedText style={{ color: primaryColor, fontWeight: "600" }}>
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
          </ScrollView>
           <FullscreenGallery
              visible={galleryVisible}
              images={galleryImages}
              initialIndex={galleryIndex}
              onRequestClose={() => setGalleryVisible(false)}
            />
        </KeyboardAvoidingView>
      ) : (
        <>
        <SearchHeader />
        
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
               <ImageCarousel
                 images={item.images ?? [`https://picsum.photos/400/250?random=${item.id}`]}
                 height={280} // Taller image for Airbnb feel
                 onPress={(i) => {
                   setGalleryImages(item.images ?? [`https://picsum.photos/400/250?random=${item.id}`]);
                   setGalleryIndex(i);
                   setGalleryVisible(true);
                 }}
               />
               
               {/* Heart Icon Overlay */}
                <View style={styles.heartOverlay}>
                  <MaterialIcons name="favorite-border" size={24} color="#fff" />
                </View>

               <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                      {item.name}
                    </ThemedText>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
                       <MaterialIcons name="star" size={14} color={primaryColor} />
                       <ThemedText style={{fontSize: 14}}>{item.rating_avg.toFixed(1)}</ThemedText>
                    </View>
                  </View>
                
                 <ThemedText
                   style={styles.cardDescription}
                   numberOfLines={1}
                 >
                   Hosted by WorkSpot
                 </ThemedText>
                  <ThemedText
                   style={styles.cardDescription}
                   numberOfLines={1}
                   ellipsizeMode="tail"
                 >
                   {item.description}
                 </ThemedText>
                 {/* <View style={{marginTop: 6}}>
                     <ThemedText style={{fontSize: 15, fontWeight: '600'}}>
                       $20 <ThemedText style={{fontWeight: '400'}}>night</ThemedText>
                     </ThemedText>
                 </View> */}
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
          <View style={{flex: 1}}>
             <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT} 
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
                  onPress={() => setSelectedPlace(place)}
                >
                  <View style={[styles.mapMarker, {backgroundColor: primaryColor}]}>
                     <ThemedText style={styles.mapMarkerText}>
                      <MaterialIcons name="star" size={14} color="#fff" />
                      {place.rating_avg.toFixed(1)}
                     </ThemedText>
                  </View>
                </Marker>
              ))}
            </MapView>
          </View>
        )}

        {/* Floating Map Button always visible on top level */}
        <FloatingMapButton />
         <FullscreenGallery
            visible={galleryVisible}
            images={galleryImages}
            initialIndex={galleryIndex}
            onRequestClose={() => setGalleryVisible(false)}
          />

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
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 24,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryItemActive: {
    borderBottomColor: '#000',
    opacity: 1,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryLabelActive: {
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100, // Space for floating button
    paddingTop: 10,
  },
  card: {
    marginBottom: 32,
    gap: 12,
  },
  cardContent: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDescription: {
    fontSize: 14,
    opacity: 0.6,
  },
  heartOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 5,
  },
  
  // Detail
  detailContainer: {
    paddingBottom: 40,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  detailContent: {
    padding: 24,
  },
  detailTitle: {
    fontSize: 26,
    marginBottom: 4,
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
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontSize: 15,
  },
  
  // Reviews
  reviewsContainer: {
    marginTop: 32,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  reviewFormCard: {
     marginBottom: 24,
     padding: 16,
     backgroundColor: 'rgba(0,0,0,0.03)',
     borderRadius: 12,
  },
  writeReviewTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  starSelector: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  reviewInput: {
    minHeight: 80,
    padding: 12,
    borderRadius: 8,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reviewCard: {
    marginBottom: 24,
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  reviewAuthor: {
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 12,
    opacity: 0.5,
  },
  reviewText: {
    fontSize: 15,
    lineHeight: 22,
  },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  noReviewsText: {
    textAlign: 'center',
    opacity: 0.5,
    marginTop: 12,
  },

  // Utils
  pagination: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    backgroundColor: "#fff",
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.6,
  },
  
  // Floating Map Button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    zIndex: 50,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Map Custom Marker
  mapMarker: {
    backgroundColor: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  mapMarkerText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
