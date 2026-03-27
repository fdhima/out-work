import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/AuthContext';
import { getProfileFullNameById } from '@/services/profiles';
import { getPlacesEnhanced, PlaceEnhanced } from '@/services/places';
import { CATEGORIES } from '@/constants/theme';
import { getOpenStatus } from '@/utils/workingHours';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FEATURED_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.64);
const COMPACT_CARD_WIDTH = 144;

const QUOTES = [
  { text: 'The best ideas come with a good cup of coffee.', author: 'Unknown' },
  { text: 'Work from anywhere. Live everywhere.', author: 'Digital Nomad Motto' },
  { text: 'A change of scenery is a change of perspective.', author: 'Unknown' },
  { text: 'Great work happens where great coffee is served.', author: 'OutWork' },
  { text: 'Your office is wherever Wi-Fi finds you.', author: 'Unknown' },
  { text: 'Productivity blooms in the right environment.', author: 'Unknown' },
  { text: 'Find your spot, do your best work.', author: 'OutWork' },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(fullName: string | null): string | null {
  if (!fullName?.trim()) return null;
  return fullName.trim().split(' ')[0];
}

// ─── SpringPressable — matches HapticTab's spring + haptic feel ───────────────

type SpringPressableProps = {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
};

function SpringPressable({ onPress, style, children }: SpringPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── Featured card ────────────────────────────────────────────────────────────

type FeaturedCardProps = { item: PlaceEnhanced; isDark: boolean; onPress: () => void };

function FeaturedCard({ item, isDark, onPress }: FeaturedCardProps) {
  const imageUrl =
    item.images?.[0]?.url ?? `https://picsum.photos/seed/${item.id}/600/400`;
  const openStatus = getOpenStatus(item.working_hours);
  const cardBg = isDark ? '#1c1c1e' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111111';
  const subColor = isDark ? '#8e8e93' : '#888888';

  return (
    <TouchableOpacity
      style={[styles.featCard, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={0.91}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.featImage}
        contentFit="cover"
        transition={250}
      />

      {/* Rating badge */}
      <View style={styles.ratingBadge}>
        <MaterialIcons name="star" size={11} color="#FFB400" />
        <Text style={styles.ratingBadgeText}>{item.rating_avg.toFixed(1)}</Text>
      </View>

      <View style={styles.featBody}>
        <Text style={[styles.featTitle, { color: textColor }]} numberOfLines={1}>
          {item.name}
        </Text>

        {openStatus && (
          <Text
            style={[
              styles.featStatus,
              { color: openStatus.isOpen ? '#22c55e' : subColor },
            ]}
            numberOfLines={1}
          >
            {openStatus.statusText}
          </Text>
        )}

        <View style={styles.pillRow}>
          {item.places_categories?.slice(0, 2).map((pc, i) => {
            const name = pc.categories?.name;
            const cat = name ? CATEGORIES.find(c => c.id === name) : null;
            if (!cat) return null;
            return (
              <View
                key={i}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.09)'
                      : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                <MaterialIcons
                  name={cat.icon as any}
                  size={10}
                  color={isDark ? '#bbb' : '#555'}
                />
                <Text style={[styles.pillText, { color: isDark ? '#bbb' : '#555' }]}>
                  {cat.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Compact card ─────────────────────────────────────────────────────────────

type CompactCardProps = { item: PlaceEnhanced; isDark: boolean; onPress: () => void };

function CompactCard({ item, isDark, onPress }: CompactCardProps) {
  const imageUrl =
    item.images?.[0]?.url ?? `https://picsum.photos/seed/r${item.id}/300/300`;
  const cardBg = isDark ? '#1c1c1e' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111111';
  const subColor = isDark ? '#8e8e93' : '#888888';

  return (
    <TouchableOpacity
      style={[styles.compactCard, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={0.91}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.compactImage}
        contentFit="cover"
        transition={250}
      />
      <View style={styles.compactBody}>
        <Text style={[styles.compactTitle, { color: textColor }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.compactRatingRow}>
          <MaterialIcons name="star" size={12} color="#FFB400" />
          <Text style={[styles.compactRatingText, { color: subColor }]}>
            {item.rating_avg.toFixed(1)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const { session } = useAuth();
  const router = useRouter();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [topPlaces, setTopPlaces] = useState<PlaceEnhanced[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<PlaceEnhanced[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const todayQuote = QUOTES[new Date().getDate() % QUOTES.length];

  const fetchData = useCallback(async () => {
    try {
      const [nameResult, placesResult] = await Promise.all([
        session?.user?.id
          ? getProfileFullNameById(session.user.id)
          : Promise.resolve(null),
        getPlacesEnhanced(),
      ]);

      setProfileName(nameResult);

      const byRating = [...placesResult].sort((a, b) => b.rating_avg - a.rating_avg);
      setTopPlaces(byRating.slice(0, 8));

      const byDate = [...placesResult].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
      setRecentPlaces(byDate.slice(0, 8));
    } catch (e) {
      console.error('HomeScreen fetch error:', e);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const bg = isDark ? '#000000' : '#f7f5f2';
  const cardBg = isDark ? '#1c1c1e' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#111111';
  const subColor = isDark ? '#8e8e93' : '#888888';
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 90;

  const goExplore = () => router.push('/(tabs)');
  const goExploreCategory = (categoryId: string) =>
    router.push({ pathname: '/(tabs)', params: { category: categoryId } });
  const goExploreSearch = () => router.push({ pathname: '/(tabs)', params: { openSearch: '1' } });
  const goPlace = (id: number) => router.push(`/place/${id}`);

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4A90E2"
          />
        }
      >
        {/* ── Hero gradient ────────────────────────────── */}
        <LinearGradient
          colors={['#2563b0', '#4A90E2', '#6aaff5']}
          start={{ x: 0.0, y: 0.0 }}
          end={{ x: 1.0, y: 1.0 }}
          style={styles.hero}
        >
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            {/* Top row */}
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greetingText}>{greeting()}</Text>
                <Text style={styles.heroName}>
                  {firstName(profileName)
                    ? `${firstName(profileName)} 👋`
                    : 'Welcome back 👋'}
                </Text>
              </View>

              {/* Avatar chip */}
              <SpringPressable
                onPress={() => router.push('/(tabs)/settings')}
                style={styles.avatarChip}
              >
                <Text style={styles.avatarLetter}>
                  {profileName ? profileName[0].toUpperCase() : '?'}
                </Text>
              </SpringPressable>
            </View>

            <Text style={styles.heroTagline}>Where will you work today?</Text>

            {/* Decorative dots */}
            <View style={styles.heroDots}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[
                    styles.heroDot,
                    { opacity: 0.15 + i * 0.1, width: 8 + i * 6, height: 8 + i * 6 },
                  ]}
                />
              ))}
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* ── Search bar ───────────────────────────────── */}
        <View style={[styles.searchWrap, { backgroundColor: bg }]}>
          <SpringPressable
            onPress={goExploreSearch}
            style={[
              styles.searchBar,
              {
                backgroundColor: cardBg,
                shadowColor: isDark ? '#000' : '#b09070',
              },
            ]}
          >
            <MaterialIcons name="search" size={22} color={subColor} />
            <Text style={[styles.searchPlaceholder, { color: subColor }]}>
              Search cafés, libraries, coworking…
            </Text>
            <View style={styles.searchMapBtn}>
              <MaterialIcons name="map" size={16} color="#4A90E2" />
            </View>
          </SpringPressable>
        </View>

        {/* ── Work Mode ────────────────────────────────── */}
        <View style={styles.sectionSpacing}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Work Mode</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <SpringPressable
                key={cat.id}
                onPress={() => goExploreCategory(cat.id)}
                style={[styles.categoryChip, { backgroundColor: cardBg }]}
              >
                <View style={styles.categoryIconRing}>
                  <MaterialIcons name={cat.icon as any} size={18} color="#4A90E2" />
                </View>
                <Text style={[styles.categoryChipLabel, { color: textColor }]}>
                  {cat.label}
                </Text>
              </SpringPressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Top Spots ────────────────────────────────── */}
        <View style={styles.sectionSpacing}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Top Spots</Text>
            {/* <SpringPressable onPress={goExplore}>
              <Text style={[styles.seeAll, { padding: 8 }]}>See all</Text>
            </SpringPressable> */}
          </View>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#4A90E2"
              style={{ marginVertical: 28 }}
            />
          ) : topPlaces.length > 0 ? (
            <FlatList
              data={topPlaces}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => `top-${item.id}`}
              contentContainerStyle={styles.hListContent}
              renderItem={({ item }) => (
                <FeaturedCard
                  item={item}
                  isDark={isDark}
                  onPress={() => goPlace(item.id)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
            />
          ) : (
            <Text style={[styles.emptyNote, { color: subColor }]}>
              No spots yet — be the first to add one!
            </Text>
          )}
        </View>

        {/* ── Daily Quote ──────────────────────────────── */}
        <View style={styles.sectionPadded}>
          <LinearGradient
            colors={
              isDark ? ['#1c1a2e', '#2a1e3e'] : ['#fff9f4', '#fff1e8']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quoteCard}
          >
            <View style={styles.quoteIconRow}>
              <View style={styles.quoteIconBubble}>
                <MaterialIcons name="format-quote" size={20} color="#4A90E2" />
              </View>
              <Text style={[styles.quoteLabel, { color: subColor }]}>
                Daily inspiration
              </Text>
            </View>
            <Text style={[styles.quoteText, { color: textColor }]}>
              "{todayQuote.text}"
            </Text>
            <Text style={[styles.quoteAuthor, { color: subColor }]}>
              — {todayQuote.author}
            </Text>
          </LinearGradient>
        </View>

        {/* ── Just Added ───────────────────────────────── */}
        {!loading && recentPlaces.length > 0 && (
          <View style={styles.sectionSpacing}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Just Added</Text>
              {/* <SpringPressable onPress={goExplore}>
                <Text style={[styles.seeAll, { padding: 8 }]}>See all</Text>
              </SpringPressable> */}
            </View>
            <FlatList
              data={recentPlaces}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => `recent-${item.id}`}
              contentContainerStyle={styles.hListContent}
              renderItem={({ item }) => (
                <CompactCard
                  item={item}
                  isDark={isDark}
                  onPress={() => goPlace(item.id)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          </View>
        )}

        {/* ── Explore CTA ──────────────────────────────── */}
        <View style={styles.sectionPadded}>
          <SpringPressable onPress={goExplore}>
            <LinearGradient
              colors={['#4A90E2', '#2563b0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaCard}
            >
              <View style={styles.ctaTextBlock}>
                <Text style={styles.ctaTitle}>Discover on the map</Text>
                <Text style={styles.ctaSubtitle}>
                  Find cafés and workspaces near you
                </Text>
              </View>
              <View style={styles.ctaIconCircle}>
                <MaterialIcons name="near-me" size={22} color="#4A90E2" />
              </View>
            </LinearGradient>
          </SpringPressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Hero
  hero: {
    paddingBottom: 32,
  },
  heroInner: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.2,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroTagline: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    marginBottom: 8,
  },
  avatarChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  heroDot: {
    borderRadius: 99,
    backgroundColor: '#ffffff',
  },

  // Search bar
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
  },
  searchMapBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(74,144,226,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  sectionSpacing: {
    marginTop: 28,
  },
  sectionPadded: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },

  // Category chips
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    minWidth: 80,
  },
  categoryIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74,144,226,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Horizontal list
  hListContent: {
    paddingHorizontal: 20,
  },

  // Featured card
  featCard: {
    width: FEATURED_CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  featImage: {
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
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  featBody: {
    padding: 14,
    gap: 4,
  },
  featTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Compact card
  compactCard: {
    width: COMPACT_CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 3,
  },
  compactImage: {
    width: '100%',
    height: 100,
  },
  compactBody: {
    padding: 10,
    gap: 4,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  compactRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  compactRatingText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Quote card
  quoteCard: {
    borderRadius: 20,
    padding: 22,
    gap: 10,
  },
  quoteIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  quoteIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74,144,226,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  quoteText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Explore CTA
  ctaCard: {
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTextBlock: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 3,
  },
  ctaIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },

  // Empty
  emptyNote: {
    fontSize: 14,
    paddingHorizontal: 20,
    marginVertical: 16,
  },
});
