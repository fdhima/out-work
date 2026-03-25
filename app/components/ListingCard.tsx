/**
 * ListingCard — listing card used in the bottom sheet's vertical list.
 *
 * Props:
 *   vertical  — fills the full container width (used in vertical FlatList)
 *               height is fixed at 256 px so getItemLayout stays accurate.
 */
import { Image } from 'expo-image';
import React, { memo } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PlaceEnhanced } from '@/services/places';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// These constants are still exported so AirbnbBottomSheet can import them
// if needed for future layout calculations.
export const CARD_WIDTH = SCREEN_WIDTH - 48;
export const CARD_GAP = 16;
export const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP; // kept for compatibility

/** Fixed total height when vertical=true — must match getItemLayout in the sheet. */
export const VERTICAL_CARD_HEIGHT = 256;

type Props = {
  place: PlaceEnhanced;
  isSelected: boolean;
  onPress: () => void;
  /** When true the card stretches full-width for use in a vertical FlatList. */
  vertical?: boolean;
};

function ListingCard({ place, isSelected, onPress, vertical = false }: Props) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const imageUrl =
    place.images?.[0]?.url ??
    `https://picsum.photos/400/250?random=${place.id}`;

  const categories = place.places_categories
    ?.map(pc => pc.categories?.name)
    .filter(Boolean) as string[] | undefined;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        vertical && styles.cardVertical,
        { backgroundColor: isDark ? '#2c2c2e' : '#fff' },
        isSelected && styles.selectedCard,
      ]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Main image */}
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />

      {/* Rating badge overlay */}
      <View style={styles.ratingBadge}>
        <MaterialIcons name="star" size={12} color="#FF6B35" />
        <Text style={styles.ratingBadgeText}>
          {place.rating_avg.toFixed(2)}
        </Text>
      </View>

      {/* Card body */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: isDark ? '#fff' : '#111' }]}
            numberOfLines={1}
          >
            {place.name}
          </Text>
        </View>

        {/* Endorser */}
        <Text
          style={[styles.endorser, { color: isDark ? '#aaa' : '#666' }]}
          numberOfLines={1}
        >
          Endorsed by {place.profiles?.full_name ?? 'OutWork'}
        </Text>

        {/* Category pills */}
        {categories && categories.length > 0 && (
          <View style={styles.categoryRow}>
            {categories.slice(0, 3).map((cat, i) => (
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
                <Text
                  style={[
                    styles.categoryText,
                    { color: isDark ? '#ddd' : '#444' },
                  ]}
                >
                  {cat}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default memo(ListingCard);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  /** In vertical mode the card fills its parent's width (set by paddingHorizontal on list). */
  cardVertical: {
    width: '100%',
  },
  selectedCard: {
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: 160,
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    padding: 12,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  endorser: {
    fontSize: 13,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
