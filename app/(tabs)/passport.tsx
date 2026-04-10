import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const BADGE_COLS = 4;
const BADGE_GAP = 12;
const BADGE_ITEM_W = Math.floor(
  (Dimensions.get('window').width - 40 - 32 - BADGE_GAP * (BADGE_COLS - 1)) / BADGE_COLS
);
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserId } from '@/services/users';
import {
  getGamificationProfile,
  getPassportStamps,
  getLeaderboard,
  updatePlaceLocation,
  GamificationProfile,
  LeaderboardEntry,
  BADGES,
  RANKS,
  RANK_IMAGES,
} from '@/services/gamification';
import { BadgeDetailSheet } from '@/app/components/gamification/BadgeDetailSheet';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StampData {
  id: number;
  place_id: number;
  earned_at: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  type: string | null;
}

interface CityGroup {
  city: string;
  stamps: StampData[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stampEmoji(type: string | null) {
  if (type === 'library') return '📚';
  if (type === 'coworking-space') return '🖥️';
  return '☕';
}

function isNeighborhoodBadgeKey(key: string) {
  return key.startsWith('nbhd_');
}

function neighborhoodBadgeName(key: string) {
  const parts = key.replace(/^nbhd_[^_]+_/, '').split('_');
  return parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Regular';
}

// ─── RankBar ──────────────────────────────────────────────────────────────────

function RankBar({ gam, isDark }: { gam: GamificationProfile; isDark: boolean }) {
  const textPrimary = isDark ? '#fff' : '#111';
  const textSecondary = isDark ? '#8e8e93' : '#6c6c70';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const currentRank = RANKS.find(r => r.level === gam.rankLevel) ?? RANKS[0];
  const nextRank = RANKS.find(r => r.level === gam.rankLevel + 1);
  const badgeImage = RANK_IMAGES[gam.rankLevel];

  const floatY = useSharedValue(0);
  React.useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,  { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [floatY]);
  const badgeFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Badge image + rank info */}
      <View style={styles.rankHero}>
        <Reanimated.View style={badgeFloatStyle}>
          <Image source={badgeImage} style={styles.rankBadgeImage} contentFit="contain" />
        </Reanimated.View>
        <View style={styles.rankHeroInfo}>
          <View style={styles.rankLevelPill}>
            <Text style={styles.rankLevelPillText}>Rank {gam.rankLevel} of {RANKS.length}</Text>
          </View>
          <Text style={[styles.rankName, { color: '#4A90E2' }]}>{gam.rankTitle}</Text>
          <Text style={[styles.rankXp, { color: textPrimary }]}>{gam.xp.toLocaleString()} XP</Text>
        </View>
      </View>

      {/* XP progress bar */}
      <View style={[styles.xpBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
        <View style={[styles.xpBarFill, { width: `${Math.round(gam.rankProgressPct * 100)}%` as any }]} />
      </View>
      <View style={styles.xpBarLabels}>
        <Text style={[styles.xpBarLabel, { color: textSecondary }]}>{currentRank.title}</Text>
        {nextRank
          ? <Text style={[styles.xpBarLabel, { color: textSecondary }]}>{gam.xpToNextRank} XP · {nextRank.title}</Text>
          : <Text style={[styles.xpBarLabel, { color: '#4A90E2' }]}>Max Rank!</Text>}
      </View>

      {/* Stats row */}
      <View style={[styles.statRow, { borderTopColor: isDark ? '#2c2c2e' : '#f0f0f0' }]}>
        {[
          { value: gam.stampCount, label: 'Stamps' },
          { value: gam.badges.length, label: 'Badges' },
          { value: `${gam.rankLevel}/${RANKS.length}`, label: 'Rank' },
        ].map((s, i, arr) => (
          <React.Fragment key={s.label}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: textPrimary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>{s.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: isDark ? '#2c2c2e' : '#e5e7eb' }]} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ─── BadgesShelf ──────────────────────────────────────────────────────────────

function BadgesShelf({
  badges,
  isDark,
  onBadgePress,
}: {
  badges: string[];
  isDark: boolean;
  onBadgePress: (key: string, earned: boolean) => void;
}) {
  const textSecondary = isDark ? '#8e8e93' : '#6c6c70';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const lockedBg = isDark ? '#2c2c2e' : '#f0f0f5';
  const earnedBg = 'rgba(74,144,226,0.08)';
  const nbhdBadges = badges.filter(isNeighborhoodBadgeKey);

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111' }]}>Badges</Text>
      <Text style={[styles.hint, { color: textSecondary }]}>Tap a badge to see how to earn it</Text>
      <View style={styles.badgesWrap}>
        {Object.keys(BADGES).map(key => {
          const earned = badges.includes(key);
          const b = BADGES[key];
          return (
            <TouchableOpacity
              key={key}
              style={[styles.badgeItem, { backgroundColor: earned ? earnedBg : lockedBg }]}
              onPress={() => { Haptics.selectionAsync(); onBadgePress(key, earned); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.badgeEmoji, !earned && styles.locked]}>{b.emoji}</Text>
              <Text style={[styles.badgeName, { color: earned ? (isDark ? '#fff' : '#111') : textSecondary }]} numberOfLines={1}>{b.name}</Text>
              {!earned && <Text style={[styles.badgeLockLabel, { color: textSecondary }]}>Locked</Text>}
            </TouchableOpacity>
          );
        })}
        {nbhdBadges.map(key => (
          <TouchableOpacity
            key={key}
            style={[styles.badgeItem, { backgroundColor: earnedBg }]}
            onPress={() => { Haptics.selectionAsync(); onBadgePress(key, true); }}
            activeOpacity={0.7}
          >
            <Text style={styles.badgeEmoji}>🏅</Text>
            <Text style={[styles.badgeName, { color: isDark ? '#fff' : '#111' }]} numberOfLines={1}>
              {neighborhoodBadgeName(key)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── City Passport Modal ──────────────────────────────────────────────────────

function CityPassportModal({
  city,
  stamps,
  isDark,
  onClose,
  onStampPress,
}: {
  city: string;
  stamps: StampData[];
  isDark: boolean;
  onClose: () => void;
  onStampPress: (placeId: number) => void;
}) {
  const slideY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 55, friction: 10 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [slideY, backdropOpacity]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 600, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(onClose);
  };

  const bg = isDark ? '#1c1c1e' : '#fff';
  const textPrimary = isDark ? '#fff' : '#111';
  const textSecondary = isDark ? '#8e8e93' : '#6c6c70';
  const stampBg = isDark ? '#2c2c2e' : '#EAF0FB';

  const handleShare = async () => {
    const placeList = stamps.map(s => `   ☕ ${s.name}`).join('\n');
    await Share.share({
      title: `My ${city} WorkNomad Passport`,
      message: `🗺️ My OutWork Passport — ${city}\n${stamps.length} workspace${stamps.length !== 1 ? 's' : ''} stamped\n\n${placeList}\n\n📲 Discover remote workspaces on OutWork!`,
    });
  };

  return (
    <Modal animationType="none" transparent visible statusBarTranslucent onRequestClose={dismiss}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]} pointerEvents="box-none">
          {Platform.OS === 'ios'
            ? <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
            : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />}
        </Animated.View>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} />

        <Animated.View style={[styles.modalSheet, { backgroundColor: bg, transform: [{ translateY: slideY }] }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>{city}</Text>
              <Text style={[styles.modalSub, { color: textSecondary }]}>
                {stamps.length} workspace{stamps.length !== 1 ? 's' : ''} stamped
              </Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.75}>
              <Text style={styles.shareBtnText}>Share ↗</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.stampGrid}>
              {stamps.map(stamp => {
                const initials = stamp.name.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
                return (
                  <TouchableOpacity
                    key={stamp.id}
                    style={[styles.stamp, { backgroundColor: stampBg }]}
                    onPress={() => { dismiss(); setTimeout(() => onStampPress(stamp.place_id), 300); }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.stampCircle}>
                      <Text style={styles.stampEmoji}>{stampEmoji(stamp.type)}</Text>
                    </View>
                    <Text style={[styles.stampInitials, { color: '#4A90E2' }]}>{initials}</Text>
                    <Text style={[styles.stampName, { color: textPrimary }]} numberOfLines={2}>{stamp.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── PassportSection ──────────────────────────────────────────────────────────

function PassportSection({
  cityGroups,
  isDark,
  onStampPress,
  onCityPress,
}: {
  cityGroups: CityGroup[];
  isDark: boolean;
  onStampPress: (placeId: number) => void;
  onCityPress: (group: CityGroup) => void;
}) {
  const textPrimary = isDark ? '#fff' : '#111';
  const textSecondary = isDark ? '#8e8e93' : '#6c6c70';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const stampBg = isDark ? '#2c2c2e' : '#EAF0FB';

  if (cityGroups.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Passport Stamps</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={[styles.emptyText, { color: textSecondary }]}>
            No stamps yet. Review or report crowd levels at any workspace to earn your first stamp!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      {cityGroups.map(group => (
        <View key={group.city} style={[styles.card, { backgroundColor: cardBg }]}>
          {/* City header — tap to open city passport modal */}
          <TouchableOpacity style={styles.cityHeader} onPress={() => onCityPress(group)} activeOpacity={0.7}>
            <View>
              <Text style={[styles.cityName, { color: textPrimary }]}>{group.city}</Text>
              <Text style={[styles.cityCount, { color: textSecondary }]}>
                {group.stamps.length} stamp{group.stamps.length !== 1 ? 's' : ''} · tap to view city page
              </Text>
            </View>
            <Text style={{ color: textSecondary, fontSize: 20 }}>›</Text>
          </TouchableOpacity>

          {/* Stamp grid */}
          <View style={styles.stampGrid}>
            {group.stamps.map(stamp => {
              const initials = stamp.name.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
              return (
                <TouchableOpacity
                  key={stamp.id}
                  style={[styles.stamp, { backgroundColor: stampBg }]}
                  onPress={() => onStampPress(stamp.place_id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.stampCircle}>
                    <Text style={styles.stampEmoji}>{stampEmoji(stamp.type)}</Text>
                  </View>
                  <Text style={[styles.stampInitials, { color: '#4A90E2' }]}>{initials}</Text>
                  <Text style={[styles.stampName, { color: textPrimary }]} numberOfLines={2}>{stamp.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
}

// ─── LeaderboardSection ───────────────────────────────────────────────────────

function LeaderboardSection({ entries, isDark }: { entries: LeaderboardEntry[]; isDark: boolean }) {
  const textSecondary = isDark ? '#8e8e93' : '#6c6c70';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const rowBorder = isDark ? '#2c2c2e' : '#f0f0f5';
  const CROWN: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  if (entries.length === 0) return null;
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111' }]}>Top Explorers</Text>
      {entries.map((entry, idx) => (
        <View
          key={entry.profileId}
          style={[styles.leaderRow, idx < entries.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: rowBorder }]}
        >
          <Text style={styles.leaderRankIcon}>{CROWN[idx + 1] ?? `#${idx + 1}`}</Text>
          <View style={[styles.leaderAvatar, { backgroundColor: isDark ? '#2c4a7a' : '#B8CBF0' }]}>
            <Text style={styles.leaderAvatarText}>{entry.fullName.trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.leaderInfo}>
            <Text style={[styles.leaderName, { color: isDark ? '#fff' : '#111' }]} numberOfLines={1}>{entry.fullName}</Text>
            <Text style={[styles.leaderRankTitle, { color: textSecondary }]}>{entry.rankTitle}</Text>
          </View>
          <Text style={[styles.leaderXp, { color: '#4A90E2' }]}>{entry.xp.toLocaleString()} XP</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PassportScreen() {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const router = useRouter();
  const bg = isDark ? '#000' : '#F2F2F7';
  const textPrimary = isDark ? '#fff' : '#000';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);
  const [cityGroups, setCityGroups] = useState<CityGroup[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<{ key: string; earned: boolean } | null>(null);
  const [cityModal, setCityModal] = useState<CityGroup | null>(null);

  // Cache reverse-geocode results to avoid redundant calls
  const geoCache = useRef<Map<string, string>>(new Map());

  const resolveCity = useCallback(async (
    dbCity: string | null,
    lat: number,
    lng: number,
    placeId: number,
  ): Promise<string> => {
    if (dbCity) return dbCity;

    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (geoCache.current.has(key)) return geoCache.current.get(key)!;

    try {
      const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const city = result?.city ?? result?.subregion ?? result?.region ?? 'Unknown City';
      geoCache.current.set(key, city);
      // Best-effort backfill so future loads skip the geocoding
      updatePlaceLocation(placeId, city, result?.district ?? '').catch(() => {});
      return city;
    } catch {
      return 'Unknown City';
    }
  }, []);

  const buildGroups = useCallback(async (rawStamps: any[]): Promise<CityGroup[]> => {
    const cityMap = new Map<string, StampData[]>();

    await Promise.all(rawStamps.map(async s => {
      const place = Array.isArray(s.places) ? s.places[0] : s.places;
      const name: string = place?.name ?? `Place #${s.place_id}`;
      const lat: number = place?.latitude ?? 0;
      const lng: number = place?.longitude ?? 0;
      const type: string | null = place?.type ?? null;
      const city = await resolveCity(place?.city ?? null, lat, lng, s.place_id);

      if (!cityMap.has(city)) cityMap.set(city, []);
      cityMap.get(city)!.push({ id: s.id, place_id: s.place_id, earned_at: s.earned_at, name, city, latitude: lat, longitude: lng, type });
    }));

    return Array.from(cityMap.entries()).map(([city, stamps]) => ({ city, stamps }));
  }, [resolveCity]);

  const load = useCallback(async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      const [gam, rawStamps, leaders] = await Promise.all([
        getGamificationProfile(userId),
        getPassportStamps(userId),
        getLeaderboard(10),
      ]);
      const groups = await buildGroups(rawStamps);
      setGamification(gam);
      setCityGroups(groups);
      setLeaderboard(leaders);
    } catch (e) {
      console.error('Passport load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildGroups]);

  useEffect(() => { load(); }, [load]);
  const handleRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);
  const handleStampPress = useCallback((placeId: number) => { router.push(`/place/${placeId}`); }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4A90E2" />}
      >
        <Text style={[styles.pageTitle, { color: textPrimary }]}>Passport</Text>

        {gamification && <RankBar gam={gamification} isDark={isDark} />}

        {gamification && (
          <BadgesShelf
            badges={gamification.badges}
            isDark={isDark}
            onBadgePress={(key, earned) => setSelectedBadge({ key, earned })}
          />
        )}

        <PassportSection
          cityGroups={cityGroups}
          isDark={isDark}
          onStampPress={handleStampPress}
          onCityPress={group => { Haptics.selectionAsync(); setCityModal(group); }}
        />

        <LeaderboardSection entries={leaderboard} isDark={isDark} />

        <View style={{ height: 100 }} />
      </ScrollView>

      <BadgeDetailSheet
        badgeKey={selectedBadge?.key ?? null}
        earned={selectedBadge?.earned ?? false}
        onClose={() => setSelectedBadge(null)}
      />

      {cityModal && (
        <CityPassportModal
          city={cityModal.city}
          stamps={cityModal.stamps}
          isDark={isDark}
          onClose={() => setCityModal(null)}
          onStampPress={handleStampPress}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: Platform.OS === 'android' ? 24 : 8, paddingHorizontal: 20 },
  pageTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: 20, marginTop: 8 },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Rank bar
  rankHero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  rankBadgeImage: { width: 88, height: 88 },
  rankHeroInfo: { flex: 1, gap: 4 },
  rankLevelPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(74,144,226,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  rankLevelPillText: { color: '#4A90E2', fontWeight: '700', fontSize: 11 },
  rankName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  rankXp: { fontSize: 15, fontWeight: '600' },
  xpBarBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  xpBarFill: { height: 6, borderRadius: 3, backgroundColor: '#4A90E2' },
  xpBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  xpBarLabel: { fontSize: 11, fontWeight: '500' },
  statRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },

  // Badges
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 12, marginBottom: 12 },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: BADGE_GAP },
  badgeItem: { alignItems: 'center', width: BADGE_ITEM_W, borderRadius: 12, padding: 8, gap: 4 },
  badgeEmoji: { fontSize: 28 },
  locked: { opacity: 0.25 },
  badgeName: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  badgeLockLabel: { fontSize: 9, textAlign: 'center' },

  // City section
  cityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cityName: { fontSize: 17, fontWeight: '700' },
  cityCount: { fontSize: 12, marginTop: 2 },

  // Stamp grid (used in both section and modal)
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stamp: { width: '30%', borderRadius: 14, padding: 10, alignItems: 'center', gap: 4 },
  stampCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(74,144,226,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  stampEmoji: { fontSize: 20 },
  stampInitials: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  stampName: { fontSize: 10, fontWeight: '500', textAlign: 'center', lineHeight: 13 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 260 },

  // Leaderboard
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  leaderRankIcon: { fontSize: 20, width: 32, textAlign: 'center' },
  leaderAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  leaderAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  leaderInfo: { flex: 1 },
  leaderName: { fontSize: 14, fontWeight: '600' },
  leaderRankTitle: { fontSize: 11, marginTop: 1 },
  leaderXp: { fontSize: 13, fontWeight: '700' },

  // City Passport Modal
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 0,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  modalSub: { fontSize: 13, marginTop: 3 },
  shareBtn: { backgroundColor: '#4A90E2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
