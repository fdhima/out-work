/**
 * PlaceDetailed — Airbnb-style listing detail screen.
 *
 * ─── Scroll Architecture ──────────────────────────────────────────────────────
 * A single `Animated.Value` (scrollY) is driven by `Animated.ScrollView`
 * with `useNativeDriver: true`.  Every scroll-dependent visual — nav-bar
 * opacity, hero parallax, overscroll scale — is derived from that one value
 * via `interpolate`, so ALL animations run on the native thread at 60 fps.
 *
 *   scrollY → navBgOpacity  (transparent → solid after HERO_HEIGHT)
 *   scrollY → navTitleOpacity (place name fades in)
 *   scrollY → imageParallaxY  (image lags at 35 % of scroll speed = depth)
 *   scrollY → imageScale      (scale-up on iOS overscroll bounce)
 *
 * ─── Sticky action bar ────────────────────────────────────────────────────────
 * The "Directions" bar is absolutely positioned at the bottom and always
 * visible.  No animation needed; it feels natural because it sits below the
 * content scroll.
 *
 * ─── Component tree ──────────────────────────────────────────────────────────
 *  PlaceDetailed
 *  ├─ FloatingNavBar (absolute, zIndex 100)
 *  ├─ Animated.ScrollView
 *  │   ├─ HeroCarousel  (parallax + overscroll scale)
 *  │   ├─ ListingHeader (name, rating, categories inline)
 *  │   ├─ SectionDivider
 *  │   ├─ DescriptionSection (expandable "Show more")
 *  │   ├─ SectionDivider
 *  │   ├─ AmenitiesSection  (icon + label grid)
 *  │   ├─ SectionDivider
 *  │   ├─ CrowdSection
 *  │   ├─ SectionDivider
 *  │   ├─ MapPreviewSection (non-interactive mini-map)
 *  │   ├─ SectionDivider
 *  │   ├─ ReviewsSection   (ReviewsList + ReviewForm)
 *  │   ├─ SectionDivider
 *  │   └─ SimilarPlacesSection (horizontal FlatList)
 *  ├─ ActionBar (absolute, bottom)
 *  ├─ FullscreenGallery (modal)
 *  └─ CrowdLevelModal   (modal)
 */

import FullscreenGallery from '@/components/ui/fullscreen-gallery';
import { BRAND_BLUE } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { formatRelativeTime } from '@/lib/date';
import {
  PlaceEnhanced,
  getSimilarPlaces,
} from '@/services/places';
import { useRouter } from 'expo-router';
import { getReviewsByPlaceId, Review } from '@/services/reviews';
import { addCrowdReport, getCrowdStats, CrowdStats } from '@/services/crowd';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { ReviewForm } from './ReviewForm';
import { ReviewsList } from './ReviewsList';
import { CrowdLevelModal } from './CrowdLevelModal';
import { WorkingHours, getAllDays, formatTime, getOpenStatus } from '@/utils/workingHours';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Height of the hero image area */
const HERO_HEIGHT = 320;

/** How far the image lags behind the scroll (fraction of scroll speed) */
const PARALLAX_FACTOR = 0.35;

/** Image taller than the container to accommodate parallax travel */
const PARALLAX_IMAGE_HEIGHT = HERO_HEIGHT + HERO_HEIGHT * PARALLAX_FACTOR;

/** Safe-area + nav height on each platform */
const NAV_HEIGHT = Platform.OS === 'ios' ? 94 : 72;

const APP_STORE_URL =
  'https://apps.apple.com/gr/app/outwork-your-workspace-app/id6759715313';
const UNIVERSAL_LINK_BASE = 'https://out-work.online';

/** Maps DB category keys → display label + icon */
const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  quiet:            { label: 'Quiet',          icon: 'volume-off'  },
  meeting:          { label: 'Meeting',        icon: 'groups'      },
  late_night:       { label: 'Late Night',     icon: 'nightlight'  },
  fast_wifi:        { label: 'Fast Wifi',      icon: 'wifi'        },
  socket_friendly:  { label: 'Socket Friendly',          icon: 'power'       },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  selectedPlace: PlaceEnhanced;
  onClose: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionDivider() {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' },
      ]}
    />
  );
}

function SectionTitle({ title }: { title: string }) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  return (
    <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111' }]}>
      {title}
    </Text>
  );
}

/** Expandable description with "Show more / Show less" toggle */
function DescriptionSection({ text }: { text: string }) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_LINES = 4;

  return (
    <View style={styles.section}>
      <SectionTitle title="About this place" />
      <Text
        style={[styles.bodyText, { color: isDark ? '#ccc' : '#444' }]}
        numberOfLines={expanded ? undefined : PREVIEW_LINES}
      >
        {text}
      </Text>
      {text.length > 120 && (
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setExpanded(v => !v);
          }}
          hitSlop={8}
          style={styles.showMoreBtn}
        >
          <Text style={styles.showMoreText}>
            {expanded ? 'Show less' : 'Show more'}
          </Text>
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={18}
            color={BRAND_BLUE}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** 2-column grid of amenity icons derived from the place's categories */
function AmenitiesSection({ categoryNames }: { categoryNames: string[] }) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const amenities = categoryNames
    .map(name => CATEGORY_META[name])
    .filter(Boolean);

  if (!amenities.length) return null;

  return (
    <View style={styles.section}>
      <SectionTitle title="What this place offers" />
      <View style={styles.amenitiesGrid}>
        {amenities.map((a, i) => (
          <View key={i} style={styles.amenityRow}>
            <MaterialIcons
              name={a.icon as any}
              size={22}
              color={isDark ? '#ccc' : '#444'}
            />
            <Text style={[styles.amenityLabel, { color: isDark ? '#ddd' : '#333' }]}>
              {a.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Crowd level indicator */
function CrowdSection({ stats }: { stats: CrowdStats }) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const dotColor =
    stats.crowdLevel === 3 ? '#F44336' :
    stats.crowdLevel === 2 ? '#FFC107' : '#4CAF50';
  const label =
    stats.crowdLevel === 3 ? 'Busy right now' :
    stats.crowdLevel === 2 ? 'Moderate crowd' : 'Quiet right now';

  return (
    <View style={styles.section}>
      <SectionTitle title="Live crowd" />
      <View style={styles.crowdRow}>
        <View style={[styles.crowdDot, { backgroundColor: dotColor }]} />
        <View>
          <Text style={[styles.crowdLabel, { color: isDark ? '#fff' : '#111' }]}>
            {label}
          </Text>
          <Text style={[styles.crowdSub, { color: isDark ? '#888' : '#777' }]}>
            Based on {stats.reportCount} report{stats.reportCount !== 1 ? 's' : ''} ·{' '}
            {stats.confidence === 'high' ? 'High confidence' : 'Low confidence'}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Non-interactive map preview; tap opens Maps app */
function MapPreviewSection({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name: string;
}) {
  const handleOpenMaps = () => {
    const lat = latitude;
    const lng = longitude;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${name}@${latLng}`,
      android: `${scheme}${latLng}(${name})`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.section}>
      <SectionTitle title="Where you'll be" />
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleOpenMaps}
        style={styles.mapPreviewContainer}
      >
        <MapView
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          pointerEvents="none"
        >
          <Marker coordinate={{ latitude, longitude }} />
        </MapView>
        {/* Tap overlay so the whole card opens maps */}
        <View style={styles.mapTapOverlay}>
          <BlurView intensity={60} tint="light" style={styles.mapCta}>
            <MaterialIcons name="open-in-new" size={14} color="#111" />
            <Text style={styles.mapCtaText}>Open in Maps</Text>
          </BlurView>
        </View>
      </TouchableOpacity>
      <Text style={styles.coordsText}>
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </Text>
    </View>
  );
}

/** Skeleton shimmer block for similar places while loading */
function SimilarCardSkeleton() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  const isDark = (useColorScheme() ?? 'light') === 'dark';

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.similarCard,
        { backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea', opacity: pulse },
      ]}
    />
  );
}

/** Weekly working hours schedule */
function WorkingHoursSection({ working_hours }: { working_hours: WorkingHours }) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const days = getAllDays(working_hours);
  const openStatus = getOpenStatus(working_hours);

  return (
    <View style={styles.section}>
      <SectionTitle title="Hours" />
      {openStatus && (
        <Text
          style={[
            styles.openStatusBadge,
            { color: openStatus.isOpen ? '#22c55e' : isDark ? '#888' : '#999' },
          ]}
        >
          {openStatus.statusText}
        </Text>
      )}
      <View style={styles.hoursTable}>
        {days.map(({ key, label, hours, isToday }) => (
          <View
            key={key}
            style={[
              styles.hoursRow,
              isToday && {
                backgroundColor: isDark
                  ? 'rgba(74,144,226,0.12)'
                  : 'rgba(74,144,226,0.07)',
                borderRadius: 8,
              },
            ]}
          >
            <Text
              style={[
                styles.hoursDay,
                { color: isDark ? (isToday ? '#fff' : '#ccc') : (isToday ? '#111' : '#444') },
                isToday && { fontWeight: '700' },
              ]}
            >
              {label}
            </Text>
            <Text
              style={[
                styles.hoursTime,
                { color: hours ? (isDark ? '#ddd' : '#222') : (isDark ? '#555' : '#aaa') },
                isToday && { fontWeight: '700' },
              ]}
            >
              {hours ? `${formatTime(hours.open)} – ${formatTime(hours.close)}` : 'Closed'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Card in the "Similar places" horizontal list */
function SimilarPlaceCard({
  place,
  onPress,
}: {
  place: PlaceEnhanced;
  onPress: () => void;
}) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const imageUrl =
    place.images?.[0]?.url ??
    `https://picsum.photos/300/200?random=${place.id}`;

  return (
    <TouchableOpacity
      style={[styles.similarCard, { backgroundColor: isDark ? '#2c2c2e' : '#fff' }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.similarCardImage}
        contentFit="cover"
        transition={150}
      />
      <View style={styles.similarCardBody}>
        <Text
          style={[styles.similarCardTitle, { color: isDark ? '#fff' : '#111' }]}
          numberOfLines={1}
        >
          {place.name}
        </Text>
        <View style={styles.similarCardRating}>
          <MaterialIcons name="star" size={12} color="#FF6B35" />
          <Text style={[styles.similarCardRatingText, { color: isDark ? '#aaa' : '#555' }]}>
            {place.rating_avg.toFixed(2)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlaceDetailed({ selectedPlace, onClose, refreshing = false, onRefresh }: Props) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const { isFavorite, toggleFavorite } = useFavorites();
  const liked = isFavorite(selectedPlace.id);

  // ── Scroll animation value ─────────────────────────────────────────────────
  /**
   * scrollY drives ALL scroll-based animations via native driver.
   * Derived values: navBgOpacity, navTitleOpacity, imageParallaxY, imageScale.
   */
  const scrollY = useRef(new Animated.Value(0)).current;

  // Nav bar background fades from transparent → solid as you pass the hero
  const navBgOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 80, HERO_HEIGHT - 10],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Place name title fades into the nav bar just after background appears
  const navTitleOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 10, HERO_HEIGHT + 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  /**
   * Parallax: hero image lags at PARALLAX_FACTOR of the scroll speed.
   * As the content scrolls up by X, the image moves up by only X*0.65,
   * creating the "looking through a window" depth effect.
   * translateY = +scrollY * PARALLAX_FACTOR (pushes image down to compensate,
   * so net upward motion = scrollY - scrollY*PARALLAX_FACTOR = scrollY*0.65).
   */
  const imageParallaxY = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, HERO_HEIGHT * PARALLAX_FACTOR],
    extrapolate: 'clamp',
  });

  /**
   * Overscroll scale: on iOS, when the user bounces past the top (scrollY < 0),
   * the hero scales up — matching the native Photos.app / Airbnb feel.
   */
  const imageScale = scrollY.interpolate({
    inputRange: [-120, 0],
    outputRange: [1.4, 1],
    extrapolate: 'clamp',
  });

  // ── Local state ────────────────────────────────────────────────────────────
  const router = useRouter();
  const [heroIndex, setHeroIndex] = useState(0);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [crowdModalVisible, setCrowdModalVisible] = useState(false);
  const [crowdStats, setCrowdStats] = useState<CrowdStats | null>(null);
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);
  const [similarPlaces, setSimilarPlaces] = useState<PlaceEnhanced[]>([]);
  const [similarLoading, setSimilarLoading] = useState(true);

  // ── Derived data ──────────────────────────────────────────────────────────
  const imageUrls = useMemo(() =>
    selectedPlace.images?.length
      ? selectedPlace.images.map(i => i.url)
      : [`https://picsum.photos/800/600?random=${selectedPlace.id}`],
    [selectedPlace]
  );

  const categoryNames = useMemo(() =>
    selectedPlace.places_categories
      ?.map(pc => pc.categories?.name)
      .filter(Boolean) as string[] ?? [],
    [selectedPlace]
  );

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    getCrowdStats(selectedPlace.id).then(setCrowdStats);

    // Ask the user about crowd levels after 1.5 s
    const timer = setTimeout(() => setCrowdModalVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [selectedPlace.id]);

  useEffect(() => {
    setSimilarLoading(true);
    getSimilarPlaces(selectedPlace.id, 6)
      .then(setSimilarPlaces)
      .finally(() => setSimilarLoading(false));
  }, [selectedPlace.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggleFavorite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(selectedPlace.id);
  }, [selectedPlace.id, toggleFavorite]);

  const handleShare = useCallback(async () => {
    const url = `${UNIVERSAL_LINK_BASE}/place/${selectedPlace.id}`;
    try {
      await Share.share({
        title: selectedPlace.name,
        message: `Check out "${selectedPlace.name}" on OutWork!`,
        url,
      });
    } catch (e) {
      console.error('Share failed', e);
    }
  }, [selectedPlace]);

  const handleDirections = useCallback(() => {
    const { latitude: lat, longitude: lng, name } = selectedPlace;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const url = Platform.select({
      ios: `${scheme}${name}@${lat},${lng}`,
      android: `${scheme}${lat},${lng}(${name})`,
    });
    if (url) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(url);
    }
  }, [selectedPlace]);

  const handleCrowdSubmit = useCallback(async (level: number) => {
    try {
      const now = new Date();
      await addCrowdReport({
        place_id: selectedPlace.id,
        day_of_week: now.getDay(),
        time_bucket: now.getHours(),
        crowd_level: level,
      });
    } catch (e) {
      console.error('Crowd report failed', e);
    } finally {
      setCrowdModalVisible(false);
    }
  }, [selectedPlace.id]);

  const bg = isDark ? '#111' : '#fff';
  const textPrimary = isDark ? '#fff' : '#111';
  const textSecondary = isDark ? '#aaa' : '#666';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: bg }]}>

      {/* ── Floating nav bar (always on top, fades in on scroll) ── */}
      <View style={[styles.navBar, { height: NAV_HEIGHT }]} pointerEvents="box-none">
        {/* Solid background that fades in */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: bg, opacity: navBgOpacity },
          ]}
          pointerEvents="none"
        />
        {/* Bottom border appears with background */}
        <Animated.View
          style={[
            styles.navBorder,
            {
              borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              opacity: navBgOpacity,
            },
          ]}
          pointerEvents="none"
        />

        <View style={styles.navContent} pointerEvents="box-none">
          {/* Back button */}
          <TouchableOpacity style={styles.navCircleBtn} onPress={onClose} hitSlop={8}>
            <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <MaterialIcons name="arrow-back" size={20} color={isDark ? '#fff' : '#111'} />
          </TouchableOpacity>

          {/* Title fades in when nav is opaque */}
          <Animated.Text
            numberOfLines={1}
            style={[styles.navTitle, { color: textPrimary, opacity: navTitleOpacity }]}
          >
            {selectedPlace.name}
          </Animated.Text>

          {/* Share + Favorite */}
          <View style={styles.navRightGroup}>
            <TouchableOpacity style={styles.navCircleBtn} onPress={handleShare} hitSlop={8}>
              <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <MaterialIcons name="ios-share" size={20} color={isDark ? '#fff' : '#111'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navCircleBtn}
              onPress={handleToggleFavorite}
              hitSlop={8}
            >
              <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <MaterialIcons
                name={liked ? 'favorite' : 'favorite-border'}
                size={20}
                color={liked ? '#ff4081' : isDark ? '#fff' : '#111'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        /**
         * Animated.event pipes the native scroll offset directly into scrollY
         * on the UI thread — zero JS bridge involvement = true 60 fps.
         */
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BRAND_BLUE}
              progressViewOffset={NAV_HEIGHT}
            />
          ) : undefined
        }
      >
        {/* ── Hero image with parallax + overscroll scale ── */}
        <View style={styles.heroContainer}>
          <Animated.View
            style={[
              styles.heroImageWrapper,
              {
                transform: [
                  { translateY: imageParallaxY },
                  { scale: imageScale },
                ],
              },
            ]}
          >
            {/* Swipeable image carousel */}
            <FlatList
              data={imageUrls}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setHeroIndex(idx);
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.95}
                  onPress={() => {
                    setGalleryIndex(imageUrls.indexOf(item));
                    setGalleryVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: item }}
                    style={{ width: SCREEN_WIDTH, height: PARALLAX_IMAGE_HEIGHT }}
                    contentFit="cover"
                    transition={200}
                  />
                </TouchableOpacity>
              )}
            />
          </Animated.View>

          {/* Bottom gradient fade for reading nav buttons */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)']}
            style={styles.heroGradientBottom}
            pointerEvents="none"
          />

          {/* Image count badge ("1 / 5") */}
          {imageUrls.length > 1 && (
            <View style={styles.imageCountBadge} pointerEvents="none">
              <Text style={styles.imageCountText}>{heroIndex + 1} / {imageUrls.length}</Text>
            </View>
          )}
        </View>

        {/* ── Listing header ── */}
        <View style={[styles.section, { paddingTop: 24 }]}>
          <Text style={[styles.placeTitle, { color: textPrimary }]}>
            {selectedPlace.name}
          </Text>

          {/* Rating row */}
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={15} color="#FF6B35" />
            <Text style={[styles.ratingText, { color: textPrimary }]}>
              {selectedPlace.rating_avg.toFixed(2)}
            </Text>
            <Text style={[styles.ratingDot, { color: textSecondary }]}>·</Text>
            <Text style={[styles.ratingReviews, { color: textSecondary }]}>
              {selectedPlace.reviews?.length ?? 0} reviews
            </Text>
          </View>

          {/* Endorser */}
          {/* {selectedPlace.profiles?.full_name && (
            <Text style={[styles.endorserText, { color: textSecondary }]}>
              Endorsed by {selectedPlace.profiles.full_name}
            </Text>
          )} */}

          {/* Category pills */}
          {categoryNames.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillsRow}
            >
              {categoryNames.map((name, i) => {
                const meta = CATEGORY_META[name];
                return meta ? (
                  <View
                    key={i}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                  >
                    <MaterialIcons name={meta.icon as any} size={13} color={BRAND_BLUE} />
                    <Text style={[styles.categoryPillText, { color: isDark ? '#ddd' : '#444' }]}>
                      {meta.label}
                    </Text>
                  </View>
                ) : null;
              })}
            </ScrollView>
          )}
        </View>

        <SectionDivider />

        {/* ── Description ── */}
        <DescriptionSection text={selectedPlace.description} />

        <SectionDivider />

        {/* ── Amenities ── */}
        <AmenitiesSection categoryNames={categoryNames} />

        {categoryNames.length > 0 && <SectionDivider />}

        {/* ── Working hours ── */}
        {selectedPlace.working_hours && (
          <>
            <WorkingHoursSection working_hours={selectedPlace.working_hours} />
            <SectionDivider />
          </>
        )}

        {/* ── Crowd level ── */}
        {crowdStats && (
          <>
            <CrowdSection stats={crowdStats} />
            <SectionDivider />
          </>
        )}

        {/* ── Map preview ── */}
        <MapPreviewSection
          latitude={selectedPlace.latitude}
          longitude={selectedPlace.longitude}
          name={selectedPlace.name}
        />

        <SectionDivider />

        {/* ── Reviews ── */}
        <View style={styles.section}>
          <SectionTitle title="Reviews" />
          <ReviewForm
            placeForReview={selectedPlace}
            onReviewPosted={() => setReviewsRefreshKey(k => k + 1)}
          />
          <ReviewsList
            placeId={selectedPlace.id}
            refreshTrigger={reviewsRefreshKey}
          />
        </View>

        <SectionDivider />

        {/* ── Similar places ── */}
        <View style={[styles.section, { paddingBottom: 0 }]}>
          <SectionTitle title="Similar places" />
        </View>
        <FlatList
          data={similarLoading ? Array(4).fill(null) : similarPlaces}
          keyExtractor={(_, i) => String(i)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.similarListContent}
          renderItem={({ item }) =>
            similarLoading || !item ? (
              <SimilarCardSkeleton />
            ) : (
              <SimilarPlaceCard
                place={item}
                onPress={() => router.push(`/place/${item.id}`)}
              />
            )
          }
        />
      </Animated.ScrollView>

      {/* ── Sticky action bar ── */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: bg,
            borderTopColor: isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        {/* Rating summary on the left */}
        <View style={styles.actionBarInfo}>
          <View style={styles.actionBarRating}>
            <MaterialIcons name="star" size={14} color="#FF6B35" />
            <Text style={[styles.actionBarRatingText, { color: textPrimary }]}>
              {selectedPlace.rating_avg.toFixed(2)}
            </Text>
          </View>
          {categoryNames[0] && CATEGORY_META[categoryNames[0]] && (
            <Text style={[styles.actionBarCategory, { color: textSecondary }]}>
              {CATEGORY_META[categoryNames[0]].label}
              {categoryNames[1] && CATEGORY_META[categoryNames[1]]
                ? ` · ${CATEGORY_META[categoryNames[1]].label}`
                : ''}
            </Text>
          )}
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={[styles.directionsBtn, { backgroundColor: BRAND_BLUE }]}
          onPress={handleDirections}
          activeOpacity={0.88}
        >
          <MaterialIcons name="directions" size={18} color="#fff" />
          <Text style={styles.directionsBtnText}>Directions</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modals ── */}
      <FullscreenGallery
        visible={galleryVisible}
        images={imageUrls}
        initialIndex={galleryIndex}
        onRequestClose={() => setGalleryVisible(false)}
      />

      <CrowdLevelModal
        visible={crowdModalVisible}
        onClose={() => setCrowdModalVisible(false)}
        onSubmit={handleCrowdSubmit}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ACTION_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 70;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Nav bar ──
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  navBorder: {
    ...StyleSheet.absoluteFillObject,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  navTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  navRightGroup: {
    flexDirection: 'row',
    gap: 8,
  },

  // ── Scroll content ──
  scrollContent: {
    paddingBottom: ACTION_BAR_HEIGHT + 16,
  },

  // ── Hero ──
  heroContainer: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroImageWrapper: {
    // Starts with the image slightly offset upward so parallax travel
    // is centred in the visible window at scrollY=0.
    marginTop: -(HERO_HEIGHT * PARALLAX_FACTOR) / 2,
  },
  heroGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Generic section ──
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  divider: {
    height: 6,
    marginVertical: 0,
  },

  // ── Listing header ──
  placeTitle: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingDot: {
    fontSize: 14,
  },
  ratingReviews: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  endorserText: {
    fontSize: 14,
    marginBottom: 12,
  },
  categoryPillsRow: {
    gap: 8,
    paddingTop: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Description ──
  bodyText: {
    fontSize: 16,
    lineHeight: 25,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 2,
  },
  showMoreText: {
    color: BRAND_BLUE,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // ── Amenities ──
  amenitiesGrid: {
    gap: 16,
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  amenityLabel: {
    fontSize: 16,
  },

  // ── Working hours ──
  openStatusBadge: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  hoursTable: {
    gap: 2,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  hoursDay: {
    fontSize: 15,
  },
  hoursTime: {
    fontSize: 15,
  },

  // ── Crowd ──
  crowdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  crowdDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  crowdLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  crowdSub: {
    fontSize: 13,
    marginTop: 2,
  },

  // ── Map preview ──
  mapPreviewContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  mapTapOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  mapCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    overflow: 'hidden',
  },
  mapCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
  coordsText: {
    fontSize: 13,
    color: '#888',
    marginTop: 10,
  },

  // ── Similar places ──
  similarListContent: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 12,
  },
  similarCard: {
    width: 180,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  similarCardImage: {
    width: '100%',
    height: 110,
  },
  similarCardBody: {
    padding: 10,
    gap: 3,
  },
  similarCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  similarCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  similarCardRatingText: {
    fontSize: 12,
  },

  // ── Action bar ──
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ACTION_BAR_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 12,
  },
  actionBarInfo: {
    gap: 2,
  },
  actionBarRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBarRatingText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionBarCategory: {
    fontSize: 13,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  directionsBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
