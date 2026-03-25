import ListingCard, { VERTICAL_CARD_HEIGHT, CARD_GAP } from '@/app/components/ListingCard';
import { useFavorites } from '@/context/FavoritesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getPlacesEnhancedByIds } from '@/services/places';
import { PlaceEnhanced } from '@/services/places';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function FavoritesScreen() {
  const { favorites } = useFavorites();
  const [places, setPlaces] = useState<PlaceEnhanced[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const router = useRouter();

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await getPlacesEnhancedByIds(favorites);
      // Preserve the order from favorites list
      const ordered = favorites
        .map(id => data.find(p => p.id === id))
        .filter(Boolean) as PlaceEnhanced[];
      setPlaces(ordered);
    } catch (e) {
      console.error('Failed to fetch favorite places', e);
    }
  }, [favorites]);

  useEffect(() => {
    setLoading(true);
    fetchFavorites().finally(() => setLoading(false));
  }, [fetchFavorites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  }, [fetchFavorites]);

  const bg = isDark ? '#000' : '#f2f2f7';
  const textColor = isDark ? '#fff' : '#111';
  const subtextColor = isDark ? '#888' : '#999';

  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 70 + 20; // height + marginBottom on Android

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Favorites</Text>
        <Text style={[styles.headerCount, { color: subtextColor }]}>
          {places.length} {places.length === 1 ? 'place' : 'places'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : places.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons
            name="favorite-border"
            size={64}
            color={subtextColor}
            style={{ marginBottom: 16 }}
          />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No favorites yet</Text>
          <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
            Heart a place on the map to save it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: TAB_BAR_HEIGHT + 16 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4A90E2"
            />
          }
          getItemLayout={(_, index) => ({
            length: VERTICAL_CARD_HEIGHT + CARD_GAP,
            offset: (VERTICAL_CARD_HEIGHT + CARD_GAP) * index,
            index,
          })}
          renderItem={({ item }) => (
            <ListingCard
              place={item}
              isSelected={selectedId === item.id}
              vertical
              onPress={() => {
                setSelectedId(prev => (prev === item.id ? null : item.id));
                router.push(`/place/${item.id}`);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 56,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 14,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
