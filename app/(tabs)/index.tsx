/**
 * HomeScreen — Airbnb-style map search view.
 *
 * ─── Layout ──────────────────────────────────────────────────────────────────
 *   ┌─────────────────────────────┐
 *   │  MapHeader (search + cats)  │  ← absolute, top of screen
 *   │                             │
 *   │        Apple Maps           │  ← fullscreen, behind everything
 *   │     (custom Rating Pins)    │
 *   │                             │
 *   │  [⊕ recenter]  [⟳ search]  │  ← floating controls
 *   ├─────────────────────────────┤
 *   │     AirbnbBottomSheet       │  ← draggable 3-state sheet
 *   │  collapsed / half / full    │
 *   └─────────────────────────────┘
 *
 * ─── Map ↔ List Sync ─────────────────────────────────────────────────────────
 * `selectedPlace` is the single source of truth, held in this component:
 *
 *   • Map pin tapped:
 *       onMarkerPress → setSelectedPlace → center map → sheet.scrollToIndex
 *       (if sheet is collapsed, also call sheet.expandToHalf)
 *
 *   • Carousel card swiped:
 *       sheet fires onSelectPlace → setSelectedPlace
 *       → MapMarker with matching id re-renders with isSelected=true
 *       (map does NOT re-center on card swipe to avoid jarring pan)
 *
 *   • Full-list row tapped:
 *       onPressCard → navigate to detail (same as before)
 */

import AirbnbBottomSheet, {
  BottomSheetRef,
  SheetState,
} from '../components/AirbnbBottomSheet';
import { FilterModal } from '../components/FilterModal';
import { MapHeader } from '../components/MapHeader';
import MapMarker from '../components/MapMarker';
import { ThemedView } from '@/components/themed-view';
import { BRAND_BLUE, CATEGORIES, isDark } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { getCategoryIdByName } from '@/services/categories';
import { PlaceEnhanced, getPlacesEnhanced } from '@/services/places';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, Region } from 'react-native-maps';

// ─── Default map region (Athens, Greece) ────────────────────────────────────
const DEFAULT_REGION: Region = {
  latitude: 37.9838,
  longitude: 23.7275,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function HomeScreen() {
  const router = useRouter();
  const { isFavorite } = useFavorites();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [places, setPlaces] = useState<PlaceEnhanced[]>([]);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  // ── Selection — single source of truth ───────────────────────────────────
  const [selectedPlace, setSelectedPlace] = useState<PlaceEnhanced | null>(null);


  // ── Sheet state ───────────────────────────────────────────────────────────
  const [sheetState, setSheetState] = useState<SheetState>('half');
  const sheetRef = useRef<BottomSheetRef>(null);

  // ── Map ───────────────────────────────────────────────────────────────────
  const mapRef = useRef<MapView>(null);
  // Ref instead of state: fetchPlaces reads the current region without being
  // a reactive dep — prevents useFocusEffect from re-firing on every map pan.
  const mapRegionRef = useRef<Region | null>(null);
  const [lastSearchRegion, setLastSearchRegion] = useState<Region | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [isSearchingArea, setIsSearchingArea] = useState(false);

  // ── Location ──────────────────────────────────────────────────────────────
  const [userLocation, setUserLocation] =
    useState<Location.LocationObjectCoords | null>(null);

  // ── Search / filter ───────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // ─── Location tracking ────────────────────────────────────────────────────
  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 15,
        },
        loc => setUserLocation(loc.coords)
      );
    })();
    return () => sub?.remove();
  }, []);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchPlaces = useCallback(async () => {
    const id = ++requestIdRef.current;
    try {
      setLoading(true);
      const catId =
        selectedCategory !== 'all'
          ? await getCategoryIdByName(selectedCategory)
          : null;
      const data = await getPlacesEnhanced(catId, searchQuery);
      if (id !== requestIdRef.current) return; // stale request
      setPlaces(data ?? []);
      setShowSearchArea(false);
      // Read region from ref — no reactive dep, so map panning never
      // recreates this callback or re-triggers useFocusEffect.
      if (mapRegionRef.current) setLastSearchRegion(mapRegionRef.current);
    } catch (err) {
      console.error('fetchPlaces error:', err);
    } finally {
      if (id === requestIdRef.current) {
        setLoading(false);
        setIsSearchingArea(false);
      }
    }
  }, [selectedCategory, searchQuery]); // mapRegion intentionally omitted

  // Re-fetch when category or search changes (on screen focus)
  useFocusEffect(
    useCallback(() => {
      fetchPlaces();
    }, [fetchPlaces])
  );

  // ─── Map helpers ──────────────────────────────────────────────────────────
  const centerMap = useCallback((lat: number, lng: number) => {
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.006, longitudeDelta: 0.006 },
      450
    );
  }, []);

  const centerOnUser = useCallback(() => {
    if (userLocation) centerMap(userLocation.latitude, userLocation.longitude);
  }, [userLocation, centerMap]);

  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      mapRegionRef.current = region;
      if (lastSearchRegion) {
        const dLat = Math.abs(region.latitude - lastSearchRegion.latitude);
        const dLng = Math.abs(region.longitude - lastSearchRegion.longitude);
        if (dLat > 0.003 || dLng > 0.003) setShowSearchArea(true);
      } else {
        setLastSearchRegion(region);
      }
    },
    [lastSearchRegion]
  );

  // ─── Marker interaction ───────────────────────────────────────────────────
  /**
   * When a map pin is tapped:
   * 1. Update selection
   * 2. Center the map on the place
   * 3. Scroll the carousel to the matching card
   * 4. If the sheet is collapsed, pop it to half so the card is visible
   */
  const onMarkerPress = useCallback(
    (place: PlaceEnhanced) => {
      Keyboard.dismiss();
      setSelectedPlace(place);
      centerMap(place.latitude, place.longitude);

      const idx = places.findIndex(p => p.id === place.id);
      sheetRef.current?.scrollToIndex(idx);

      if (sheetState === 'collapsed') {
        sheetRef.current?.expandToHalf();
      }
    },
    [places, sheetState, centerMap]
  );

  const onMapPress = useCallback(() => {
    Keyboard.dismiss();
    // Tapping the map (not a pin) deselects
    setSelectedPlace(null);
  }, []);

  /**
   * Tapping a card navigates to the detail screen.
   */
  const onPressCard = useCallback(
    (place: PlaceEnhanced) => {
      router.push(`/place/${place.id}`);
    },
    [router]
  );

  return (
    <ThemedView style={styles.root}>

        {/* ── Search header — floats above the map ── */}
        <View style={styles.headerOverlay} pointerEvents="box-none">
          <MapHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            hasActiveFilter={selectedCategory !== 'all'}
            onFilterPress={() => setFilterModalVisible(true)}
          />
        </View>

        {/* ── Filter modal ── */}
        <FilterModal
          visible={filterModalVisible}
          selectedCategory={selectedCategory}
          categories={CATEGORIES}
          resultCount={places.length}
          onApply={setSelectedCategory}
          onClose={() => setFilterModalVisible(false)}
        />

        {/* ── Fullscreen map ── */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          showsUserLocation
          showsMyLocationButton={false}
          onPress={onMapPress}
          onRegionChangeComplete={onRegionChangeComplete}
          initialRegion={DEFAULT_REGION}
        >
          {places.map(place => (
            <MapMarker
              key={place.id}
              place={place}
              isSelected={selectedPlace?.id === place.id}
              isFavorite={isFavorite(place.id)}
              onPress={onMarkerPress}
            />
          ))}
        </MapView>

        {/* ── Re-center on user button ── */}
        {userLocation && (
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={centerOnUser}
            activeOpacity={0.85}
          >
            <MaterialIcons name="my-location" size={22} color={isDark ? '#fff' : '#111'} />
          </TouchableOpacity>
        )}

        {/* ── "Search this area" button — shown when map has panned ── */}
        {showSearchArea && !loading && sheetState !== 'full' && (
          <View style={styles.searchAreaWrap}>
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={styles.searchAreaBlur}
            >
              <TouchableOpacity
                style={styles.searchAreaBtn}
                onPress={() => {
                  setIsSearchingArea(true);
                  fetchPlaces();
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={isSearchingArea ? 'hourglass-empty' : 'refresh'}
                  size={16}
                  color={isDark ? '#fff' : BRAND_BLUE}
                />
              </TouchableOpacity>
            </BlurView>
          </View>
        )}

        {/* ── Airbnb-style bottom sheet ── */}
        <AirbnbBottomSheet
          ref={sheetRef}
          places={places}
          selectedPlace={selectedPlace}
          sheetState={sheetState}
          onSheetStateChange={setSheetState}
          onPressCard={onPressCard}
        />

      </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Search header sits above the map
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },

  // Recenter button (bottom-right, above the sheet)
  recenterBtn: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 320 : 300,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? '#2c2c2e' : '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 200,
  },

  // "Search this area" pill
  searchAreaWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 375 : 355,
    alignSelf: 'center',
    zIndex: 200,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  searchAreaBlur: {
    padding: 2,
  },
  searchAreaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 6,
  },
});
