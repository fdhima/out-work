import ListingCard, { VERTICAL_CARD_HEIGHT, CARD_GAP } from '@/app/components/ListingCard';
import { useFavorites } from '@/context/FavoritesContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getPlacesEnhancedByIds, PlaceEnhanced } from '@/services/places';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
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
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const bg = isDark ? '#000' : '#F2F2F7';
  const textPrimary = isDark ? '#fff' : '#000';
  const textSecondary = isDark ? '#8e8e93' : '#6c6c70';

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await getPlacesEnhancedByIds(favorites);
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

  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 70 + 20;

  const ListHeader = (
    <View style={styles.listHeader}>
      <Text style={[styles.sectionTitle, { color: textSecondary }]}>
        {places.length} {places.length === 1 ? 'place' : 'places'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]}>
      <View style={styles.scroll}>
        <Text style={[styles.pageTitle, { color: textPrimary }]}>Favorites</Text>
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
            color={textSecondary}
            style={{ marginBottom: 16 }}
          />
          <Text style={[styles.emptyTitle, { color: textPrimary }]}>No favorites yet</Text>
          <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
            Heart a place on the map to save it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={ListHeader}
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
            offset: (VERTICAL_CARD_HEIGHT + CARD_GAP) * index + styles.listHeader.paddingBottom,
            index,
          })}
          renderItem={({ item }) => (
            <ListingCard
              place={item}
              isSelected={selectedId === item.id}
              vertical
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedId(prev => (prev === item.id ? null : item.id));
                router.push(`/place/${item.id}`);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingTop: Platform.OS === 'android' ? 24 : 8,
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 24,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  listHeader: {
    paddingBottom: 4,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
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
