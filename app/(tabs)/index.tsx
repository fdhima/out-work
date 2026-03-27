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
 *       onMarkerPress → setSelectedPlace → center map → sheet.hide()
 *       FloatingCard slides up from bottom with the place preview.
 *       Tapping the card navigates to detail; tapping the map restores the sheet.
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
import ClusterMarker from '../components/ClusterMarker';
import { FloatingCard } from '../components/FloatingCard';
import { MapHeader } from '../components/MapHeader';
import MapMarker from '../components/MapMarker';
import { ThemedView } from '@/components/themed-view';
import { BRAND_BLUE, CATEGORIES, isDark } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { ClusterPoint, useClusters } from '@/hooks/useClusters';
import { getCategoryIdByName } from '@/services/categories';
import { PlaceEnhanced, getPlacesEnhanced } from '@/services/places';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  TextInput,
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
  const { openSearch, category } = useLocalSearchParams<{ openSearch?: string; category?: string }>();
  const searchInputRef = useRef<TextInput>(null);
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
  // Ref: fetchPlaces reads the current region without being a reactive dep.
  const mapRegionRef = useRef<Region | null>(null);
  // Flag: set when dismissing the floating card so the zoom-sync effect skips.
  const dismissingCardRef = useRef(false);
  // State: drives cluster recalculation when panning/zooming stops.
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  // Pending rAF handle — ensures only the latest region triggers a re-cluster.
  const clusterRafRef = useRef<number | null>(null);

  // ── Clustering ────────────────────────────────────────────────────────────
  const mapPoints = useClusters(places, mapRegion);

  // Delta values for each sheet state (Airbnb-style zoom sync).
  const SHEET_ZOOM: Record<SheetState, number> = {
    collapsed: 0.05,
    half:      0.09,
    full:      0.09,
  };
  const [lastSearchRegion, setLastSearchRegion] = useState<Region | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [isSearchingArea, setIsSearchingArea] = useState(false);

  // ── Location ──────────────────────────────────────────────────────────────
  const [userLocation, setUserLocation] =
    useState<Location.LocationObjectCoords | null>(null);

  // ── Search / filter ───────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Auto-focus search when arriving from home screen ────────────────────
  useEffect(() => {
    if (openSearch !== '1') return;
    const t = setTimeout(() => {
      searchInputRef.current?.focus();
      router.setParams({ openSearch: undefined });
    }, 350);
    return () => clearTimeout(t);
  }, [openSearch]);

  // ─── Apply category filter when arriving from home Work Mode chips ────────
  useEffect(() => {
    if (!category) return;
    setSelectedCategory(category);
    router.setParams({ category: undefined });
  }, [category]);

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

  // ─── Map zoom sync with sheet state ──────────────────────────────────────
  // When a place is selected the sheet is hidden and the map is already
  // centered on that place — skip zoom changes in that mode.
  // Also skip when the user is dismissing the floating card (map tap) to
  // avoid an unwanted zoom-out back to the sheet-state delta.
  useEffect(() => {
    if (selectedPlace) return;
    if (dismissingCardRef.current) {
      dismissingCardRef.current = false;
      return;
    }
    const region = mapRegionRef.current;
    if (!region) return; // map hasn't fired onRegionChangeComplete yet
    const delta = SHEET_ZOOM[sheetState];
    mapRef.current?.animateToRegion(
      { latitude: region.latitude, longitude: region.longitude, latitudeDelta: delta, longitudeDelta: delta },
      380
    );
  }, [sheetState, selectedPlace]);

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

      // Defer the marker-tree update by one frame so the native map layer
      // finishes its own region-change processing before React reconciles
      // the marker children. Updating synchronously here causes a silent
      // native crash when many markers are added/removed at once.
      if (clusterRafRef.current !== null) cancelAnimationFrame(clusterRafRef.current);
      clusterRafRef.current = requestAnimationFrame(() => {
        clusterRafRef.current = null;
        setMapRegion(region);
      });

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
  const onMarkerPress = useCallback(
    (place: PlaceEnhanced) => {
      Keyboard.dismiss();
      setSelectedPlace(place);
      centerMap(place.latitude, place.longitude);
      // Hide the sheet and let the floating card take over (Airbnb-style)
      sheetRef.current?.hide();
    },
    [centerMap]
  );

  const onMapPress = useCallback(() => {
    Keyboard.dismiss();
    // Tapping the map deselects and restores the bottom sheet.
    // Set the flag so the zoom-sync effect skips the unwanted zoom-out.
    dismissingCardRef.current = true;
    setSelectedPlace(null);
    sheetRef.current?.restoreCollapsed();
  }, []);

  // ─── Cluster tap: zoom in to expand the cluster ───────────────────────────
  const onClusterPress = useCallback((cluster: ClusterPoint) => {
    // Cap at zoom 16 so delta never becomes near-zero
    const zoom = Math.min(cluster.expansionZoom, 16);
    const delta = Math.max(0.005, 360 / Math.pow(2, zoom) * 0.5);
    mapRef.current?.animateToRegion(
      {
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      400
    );
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
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={CATEGORIES}
            inputRef={searchInputRef}
          />
        </View>

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
          {mapPoints.map(point =>
            point.type === 'cluster' ? (
              <ClusterMarker
                key={`cluster-${point.id}`}
                cluster={point}
                onPress={onClusterPress}
              />
            ) : (
              <MapMarker
                key={point.place.id}
                place={point.place}
                isSelected={selectedPlace?.id === point.place.id}
                isFavorite={isFavorite(point.place.id)}
                onPress={onMarkerPress}
              />
            )
          )}
        </MapView>

        {/* ── Re-center on user button ── */}
        {userLocation && (
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={centerOnUser}
            activeOpacity={0.85}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={isDark ? '#fff' : '#111'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </Svg>
          </TouchableOpacity>
        )}

        {/* ── "Search this area" button — shown when map has panned ── */}
        {/* {showSearchArea && !loading && sheetState !== 'full' && (
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
        )} */}

        {/* ── Airbnb-style bottom sheet ── */}
        <AirbnbBottomSheet
          ref={sheetRef}
          places={places}
          selectedPlace={selectedPlace}
          sheetState={sheetState}
          onSheetStateChange={setSheetState}
          onPressCard={onPressCard}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={CATEGORIES}
        />

        {/* ── Floating place-preview card (shown when a marker is selected) ── */}
        <FloatingCard
          selectedPlace={selectedPlace}
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
