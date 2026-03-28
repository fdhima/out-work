/**
 * ListingRow — compact row used in the bottom sheet's full-screen vertical list.
 * Mirrors the Airbnb search-results list item: small thumbnail left, info right.
 */
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import React, { memo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PlaceEnhanced } from '@/services/places';
import { CATEGORIES } from '@/constants/theme';
import { getOpenStatus } from '@/utils/workingHours';

type Props = {
  place: PlaceEnhanced;
  isSelected: boolean;
  onPress: () => void;
};

function ListingRow({ place, isSelected, onPress }: Props) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const imageUrl =
    place.images?.[0]?.url ??
    `https://picsum.photos/400/250?random=${place.id}`;

  const openStatus = getOpenStatus(place.working_hours);

  const categories = place.places_categories
    ?.map(pc => {
      const name = pc.categories?.name;
      if (!name) return null;
      return CATEGORIES.find(c => c.id === name) ?? null;
    })
    .filter(Boolean) as { id: string; label: string; icon: string }[] | undefined;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        isSelected && {
          backgroundColor: isDark
            ? 'rgba(74,144,226,0.12)'
            : 'rgba(74,144,226,0.07)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Thumbnail */}
      <Image
        source={{ uri: imageUrl }}
        style={styles.thumbnail}
        contentFit="cover"
        transition={150}
      />

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: isDark ? '#fff' : '#111' }]}
            numberOfLines={1}
          >
            {place.name}
          </Text>
          <View style={styles.ratingPill}>
            <MaterialIcons name="star" size={12} color="#FF6B35" />
            <Text style={[styles.rating, { color: isDark ? '#fff' : '#111' }]}>
              {place.rating_avg.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* <Text
          style={[styles.endorser, { color: isDark ? '#888' : '#666' }]}
          numberOfLines={1}
        >
          Endorsed by {place.profiles?.full_name ?? 'OutWork'}
        </Text> */}

        {openStatus && (
          <Text
            style={[
              styles.openStatus,
              { color: openStatus.isOpen ? '#22c55e' : isDark ? '#888' : '#999' },
            ]}
            numberOfLines={1}
          >
            {openStatus.statusText}
          </Text>
        )}

        {categories && categories.length > 0 && (
          <Text
            style={[styles.categories, { color: isDark ? '#888' : '#666' }]}
            numberOfLines={1}
          >
            {categories.map(c => c.label).join(' · ')}
          </Text>
        )}
      </View>

      {/* Selected indicator */}
      {isSelected && (
        <View style={styles.selectedDot} />
      )}
    </TouchableOpacity>
  );
}

export default memo(ListingRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
    alignItems: 'center',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
  },
  endorser: {
    fontSize: 13,
  },
  categories: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  openStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    flexShrink: 0,
  },
});
