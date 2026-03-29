import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import React, { memo, useCallback, useState } from 'react'; // useState kept for cardWidth
import {
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { PlaceEnhanced } from '@/services/places';
import { getOpenStatus } from '@/utils/workingHours';
import { getDistance, formatDistance } from '@/utils/location';

const CAROUSEL_HEIGHT = 210;
const DOT_SIZE = 6;
const DOT_ACTIVE_WIDTH = 18;

export const DETAILED_CARD_HEIGHT = CAROUSEL_HEIGHT + 126;

// ─── Animated dot — width and opacity interpolated from raw scroll offset ────
function AnimatedDot({
  index,
  scrollX,
  pageWidth,
}: {
  index: number;
  scrollX: Animated.SharedValue<number>;
  pageWidth: number;
}) {
  const style = useAnimatedStyle(() => {
    if (!pageWidth) return { width: DOT_SIZE, opacity: 0.4 };
    const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
    const width = interpolate(scrollX.value, inputRange, [DOT_SIZE, DOT_ACTIVE_WIDTH, DOT_SIZE], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], 'clamp');
    return { width, opacity };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

type Props = {
  place: PlaceEnhanced;
  onPress: () => void;
  userLocation?: Location.LocationObjectCoords | null;
};

function ListingCardDetailed({ place, onPress, userLocation }: Props) {
  const isDark = useColorScheme() === 'dark';

  const images = place.images?.map(i => i.url) ?? [];
  const carouselImages = images.length > 0
    ? images
    : [`https://picsum.photos/600/400?random=${place.id}`];

  // Measured card width — drives image width so paging is pixel-perfect
  const [cardWidth, setCardWidth] = useState(0);

  const reviewCount = place.reviews?.length ?? 0;
  const rating = place.rating_avg ?? 0;
  const openStatus = getOpenStatus(place.working_hours);

  const distance = userLocation
    ? getDistance(
        userLocation.latitude,
        userLocation.longitude,
        place.latitude,
        place.longitude
      )
    : null;

  // Shared value tracks raw scroll offset on the UI thread
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler(e => {
    scrollX.value = e.contentOffset.x;
  });

  const handleDirections = useCallback(() => {
    const { latitude, longitude, name } = place;
    const label = encodeURIComponent(name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${label}`,
    });
    if (url) Linking.openURL(url);
  }, [place]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ title: place.name, message: `Check out ${place.name} on OutWork!` });
    } catch (_) {}
  }, [place]);

  const cardBg = isDark ? '#1c1c1e' : '#ffffff';
  const textPrimary = isDark ? '#fff' : '#11181C';
  const textSecondary = isDark ? '#8e8e93' : '#6c6c70';
  const textMuted = isDark ? '#ebebf5' : '#11181C';
  const dividerColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const btnBorder = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)';
  const btnBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const iconColor = isDark ? '#fff' : '#11181C';

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* ── Image carousel ── */}
      <View
        style={styles.carouselWrap}
        onLayout={e => setCardWidth(e.nativeEvent.layout.width)}
      >
        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={false}
        >
          {carouselImages.map((uri, i) => (
            <TouchableOpacity key={i} activeOpacity={0.92} onPress={onPress}>
              <Image
                source={{ uri }}
                style={[styles.carouselImage, { width: cardWidth }]}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>

        {/* Animated dot indicators */}
        {carouselImages.length > 1 && (
          <View style={styles.dots} pointerEvents="none">
            {carouselImages.map((_, i) => (
              <AnimatedDot key={i} index={i} scrollX={scrollX} pageWidth={cardWidth} />
            ))}
          </View>
        )}
      </View>

      {/* ── Body ── */}
      <TouchableOpacity style={styles.body} activeOpacity={0.88} onPress={onPress}>
        {/* Name + rating row */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: textPrimary }]} numberOfLines={1}>
            {place.name}
          </Text>
          <View style={styles.ratingRow}>
            {distance !== null && (
              <>
                <Text style={[styles.distanceText, { color: textSecondary }]}>{formatDistance(distance)}</Text>
                <Text style={[styles.separator, { color: textSecondary }]}>·</Text>
              </>
            )}
            <Text style={{ fontSize: 14 }}>⭐</Text>
            <Text style={[styles.ratingText, { color: textMuted }]}>
              {rating > 0 ? rating.toFixed(1) : '—'}
              {reviewCount > 0 ? ` (${reviewCount})` : ''}
            </Text>
          </View>
        </View>

        {/* Open/closed status */}
        {openStatus && (
          <Text
            style={[
              styles.openStatus,
              { color: openStatus.isOpen ? '#22c55e' : '#888' },
            ]}
            numberOfLines={1}
          >
            {openStatus.statusText}
          </Text>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* Action row */}
        <View style={styles.actionRow}>
          {/* Directions button */}
          <TouchableOpacity
            style={[styles.directionsBtn, { borderColor: btnBorder, backgroundColor: btnBg }]}
            onPress={handleDirections}
            activeOpacity={0.8}
          >
            <MaterialIcons name="map" size={16} color={iconColor} />
            <Text style={[styles.directionsBtnText, { color: iconColor }]}>Directions</Text>
          </TouchableOpacity>

          {/* Share button */}
          <TouchableOpacity
            style={[styles.shareBtn, { borderColor: btnBorder, backgroundColor: btnBg }]}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <MaterialIcons name="ios-share" size={18} color={iconColor} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default memo(ListingCardDetailed);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  carouselWrap: {
    height: CAROUSEL_HEIGHT,
    overflow: 'hidden',
  },
  carouselImage: {
    // width is set inline from cardWidth state after onLayout
    height: CAROUSEL_HEIGHT,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#fff',
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    fontSize: 13,
    marginHorizontal: 1,
  },
  openStatus: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  directionsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  directionsBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
});
