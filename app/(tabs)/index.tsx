import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import FullscreenGallery from "@/components/ui/fullscreen-gallery";
import { BRAND_BLUE, CATEGORIES, isDark } from "@/constants/theme";
import { getCategoryIdByName } from "@/services/categories";
import { getPlacesEnhanced, Place, PlaceEnhanced } from "@/services/places";
import { Review } from "@/services/reviews";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import MapView, { PROVIDER_DEFAULT, Region } from "react-native-maps";
import ImageCarousel from "../components/ImageCarousel";
import { FloatingCard } from "../components/FloatingCard";
import { MapHeader } from "../components/MapHeader";
import { PlaceDetailed } from "../components/PlaceDetailed";
import MapMarker from "../components/MapMarker";

export default function HomeScreen() {
  const [places, setPlaces] = useState<PlaceEnhanced[]>([]);
  const [allPlaces, setAllPlaces] = useState<PlaceEnhanced[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection State
  const [selectedPlace, setSelectedPlace] = useState<PlaceEnhanced | null>(null); // For Full Detail View
  const [previewPlace, setPreviewPlace] = useState<PlaceEnhanced | null>(null);
  const [floatingCardDisplay, setFloadingCardDisplay] = useState<boolean>(false); // FloatingCard enabled or disabled
  const requestIdRef = useRef(0);

  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // View Mode: 'list' | 'map' - DEFAULT TO MAP
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [pendingCenter, setPendingCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);


  const [trackingSub, setTrackingSub] = useState<Location.LocationSubscription | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);

  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [lastSearchRegion, setLastSearchRegion] = useState<Region | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [isSearchingArea, setIsSearchingArea] = useState(false);

  const mapRef = useRef<MapView | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchPlaces();
    }, [selectedCategory, searchQuery]) // Re-run when either changes
  );

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
    let sub: Location.LocationSubscription | undefined;

    (async () => {
      sub = await enableTracking();
      setTrackingSub(sub ?? null);
    })();

    return () => {
      sub?.remove();
    };
  }, []);

  const fetchPlaces = async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);

      let categoryId = null;
      if (selectedCategory !== "all") {
        categoryId = await getCategoryIdByName(selectedCategory);
      }

      const data = await getPlacesEnhanced(categoryId, searchQuery);

      if (requestId !== requestIdRef.current) return;

      if (!data) {
        setPlaces([]);
        return;
      }

      setPlaces(data);
      setShowSearchArea(false);
      if (mapRegion) {
        setLastSearchRegion(mapRegion);
      }
    } catch (err) {
      console.error("Error fetching filtered places: ", err);
    } finally {
      setIsSearchingArea(false);
      setLoading(false);
    }
  };

  const centerMap = (latitude: number, longitude: number) => {
    console.log(`centerMap with coordinates: ${latitude}, ${longitude}`);
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

  useEffect(() => {
    if (pendingCenter && mapRef.current) {
      centerMap(pendingCenter.lat, pendingCenter.lng);
      setPendingCenter(null);
    }
  }, [pendingCenter]);


  const onMarkerPress = (place: PlaceEnhanced) => {
    setPreviewPlace(place);
    setFloadingCardDisplay(true);
    centerMap(place.latitude, place.longitude);
  };

  const onMapPress = () => {
    Keyboard.dismiss();
    if (previewPlace) {
      setPreviewPlace(null);
      setFloadingCardDisplay(false);
    }
  };

  const onRegionChangeComplete = (region: Region) => {
    setMapRegion(region);

    if (lastSearchRegion) {
      const latMoved = Math.abs(region.latitude - lastSearchRegion.latitude);
      const lngMoved = Math.abs(region.longitude - lastSearchRegion.longitude);

      // If we moved more than ~200-300 meters, show the button
      if (latMoved > 0.003 || lngMoved > 0.003) {
        setShowSearchArea(true);
      }
    } else {
      setLastSearchRegion(region);
    }
  };

  const searchThisArea = () => {
    setIsSearchingArea(true);
    fetchPlaces();
  };

  const ViewToggle = () => (
    <View style={styles.toggleContainer}>
      <BlurView
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={styles.toggleBlur}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setViewMode("map")}
          style={[styles.toggleItem, viewMode === "map" && styles.toggleItemActive]}
        >
          <MaterialIcons name="map" size={20} color={viewMode === "map" ? "#000" : (isDark ? "#fff" : "#000")} />
          <ThemedText style={[styles.toggleText, viewMode === "map" && styles.toggleTextActive]}>Map</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setViewMode("list")}
          style={[styles.toggleItem, viewMode === "list" && styles.toggleItemActive]}
        >
          <MaterialIcons name="view-list" size={20} color={viewMode === "list" ? "#000" : (isDark ? "#fff" : "#000")} />
          <ThemedText style={[styles.toggleText, viewMode === "list" && styles.toggleTextActive]}>List</ThemedText>
        </TouchableOpacity>
      </BlurView>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {/* If detailed view is active, show it fully over everything else */}
      {selectedPlace ? (
        <PlaceDetailed
          selectedPlace={selectedPlace}
          onClose={() => {
            console.log(`PlaceDetailed onClose clicked.`);
            setPendingCenter({
              lat: selectedPlace.latitude,
              lng: selectedPlace.longitude,
            });
            setSelectedPlace(null);
          }}
        />
      ) : (
        <>
          {/* MAIN CONTENT: MAP OR LIST */}
          <View style={{ flex: 1 }}>
            {/* Search Header OVERLAY */}
            {viewMode === 'map' && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
                {
                  <MapHeader
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedCategory={selectedCategory}
                    onCategorySelect={setSelectedCategory}
                    categories={CATEGORIES}
                  />
                }
              </View>
            )}
            {viewMode === 'list' &&
              <MapHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                categories={CATEGORIES}
              />
            }
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
                        images={item.images?.length > 0 ? item.images.map(img => img.url) : [`https://picsum.photos/400/250?random=${item.id}`]}
                        height={320}
                        borderRadius={12}
                        onPress={(i: number) => {
                          setGalleryImages(item.images?.length > 0 ? item.images.map(img => img.url) : [`https://picsum.photos/400/250?random=${item.id}`]);
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
                        Hosted by {item.profiles?.full_name || "OutWork"}
                      </ThemedText>
                      <ThemedText style={styles.cardSecondaryText} numberOfLines={1}>
                        {item.description}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                )}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="place" size={48} color={BRAND_BLUE} />
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
                  onRegionChangeComplete={onRegionChangeComplete}
                  initialRegion={{
                    latitude: 37.9838, // Default to Greece (Athens)
                    longitude: 23.7275,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
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

                  {places.map((place) => (
                    <MapMarker
                      key={place.id}
                      place={place}
                      isSelected={previewPlace?.id === place.id}
                      onPress={onMarkerPress}
                    />
                  ))}
                </MapView>

                {/* Search Area Button */}
                {showSearchArea && !loading && (
                  <View style={styles.searchAreaButtonContainer}>
                    <BlurView
                      intensity={80}
                      tint={isDark ? "dark" : "light"}
                      style={styles.searchAreaBlur}
                    >
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={searchThisArea}
                        style={styles.searchAreaButton}
                      >
                        {isSearchingArea ? (
                          <ThemedText style={styles.searchAreaButtonText}>Searching...</ThemedText>
                        ) : (
                          <>
                            <MaterialIcons name="refresh" size={18} color={isDark ? "#fff" : BRAND_BLUE} />
                            <ThemedText style={[styles.searchAreaButtonText, { color: isDark ? "#fff" : BRAND_BLUE }]}>Search this area</ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    </BlurView>
                  </View>
                )}

                {/* Updating Indicator (Airbnb style) */}
                {isSearchingArea && (
                  <View style={styles.updatingIndicator}>
                    <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={styles.updatingBlur}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>Updating...</ThemedText>
                    </BlurView>
                  </View>
                )}

                {/* Floating Preview Card */}
                {floatingCardDisplay && (
                  <FloatingCard
                    selectedPlace={previewPlace}
                    onPressCard={() => setSelectedPlace(previewPlace)}
                    onClose={() => {
                      setFloadingCardDisplay(false);
                      if (previewPlace?.latitude && previewPlace?.longitude) {
                        centerMap(previewPlace.latitude, previewPlace.longitude);
                      }
                    }}
                  />
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

  // Toggle
  toggleContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 100,
    alignSelf: 'center',
    zIndex: 1000,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  toggleBlur: {
    flexDirection: 'row',
    padding: 4,
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
    backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.9)',
  },
  toggleText: {
    color: isDark ? '#fff' : '#000',
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
  searchAreaButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 160 : 160, // Above the Map/List switch (which is at 100)
    alignSelf: 'center',
    zIndex: 1000,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  searchAreaBlur: {
    padding: 2,
  },
  searchAreaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 28,
    gap: 8,
  },
  searchAreaButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  updatingIndicator: {
    position: 'absolute',
    top: 130, // Keep updating indicator at the top for visibility
    alignSelf: 'center',
    zIndex: 1001,
  },
  updatingBlur: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
});
