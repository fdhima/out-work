import { ThemedText } from '@/components/themed-text';
import { BRAND_BLUE } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from '@/hooks/use-theme-color';
import { Place } from '@/services/places';
import { createReview } from '@/services/reviews';
import {
  grantXp,
  checkAndAwardBadges,
  awardPassportStamp,
  checkFirstScout,
  XP_REWARDS,
} from '@/services/gamification';
import { XpToast } from './gamification/XpToast';
import { BadgeAwardedSheet } from './gamification/BadgeAwardedSheet';
import { RankUpModal } from './gamification/RankUpModal';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const SUB_RATING_LEVELS = 4;

type SubRatingRowProps = {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  isDark: boolean;
};

function SubRatingRow({ icon, label, value, onChange, isDark }: SubRatingRowProps) {
  return (
    <View style={subStyles.row}>
      <View style={subStyles.labelGroup}>
        {icon}
        <ThemedText style={subStyles.label}>{label}</ThemedText>
      </View>
      <View style={subStyles.segments}>
        {Array.from({ length: SUB_RATING_LEVELS }, (_, i) => {
          const level = i + 1;
          const filled = value !== null && level <= value;
          return (
            <TouchableOpacity
              key={level}
              onPress={() => onChange(level)}
              activeOpacity={0.7}
              style={[
                subStyles.segment,
                {
                  backgroundColor: filled
                    ? BRAND_BLUE
                    : isDark
                    ? 'rgba(255,255,255,0.12)'
                    : '#e5e7eb',
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

type ReviewFormProps = {
  placeForReview: Place;
  onReviewPosted?: () => void;
};

export function ReviewForm({ placeForReview, onReviewPosted }: ReviewFormProps) {
  const { session } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const textColor = useThemeColor({}, 'text');

  const [reviewRating, setReviewRating] = useState(0);
  const [wifiSpeed, setWifiSpeed] = useState<number | null>(null);
  const [noiseLevel, setNoiseLevel] = useState<number | null>(null);
  const [seatComfort, setSeatComfort] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Gamification state
  const [xpToast, setXpToast] = useState<{ visible: boolean; xp: number }>({ visible: false, xp: 0 });
  const [newBadge, setNewBadge] = useState<string | null>(null);
  const [rankUp, setRankUp] = useState<number | null>(null);

  const canSubmit =
    reviewRating > 0 && !!session?.user && !submittingReview;

  const submitReview = async () => {
    if (!placeForReview || !session?.user || !canSubmit) return;
    setSubmittingReview(true);
    try {
      const review = await createReview({
        comment: reviewText.trim(),
        rating: reviewRating,
        wifi_speed: wifiSpeed,
        noise_level: noiseLevel,
        seat_comfort: seatComfort,
        place_id: placeForReview.id,
        profile_id: session.user.id,
        created_at: new Date().toISOString(),
      });

      onReviewPosted?.();

      // ── Gamification ──────────────────────────────────────────────────────
      if (session?.user) {
        const uid = session.user.id;
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          await awardPassportStamp(uid, placeForReview.id);
          await checkFirstScout(uid, placeForReview.id);

          const hasSubRatings = wifiSpeed !== null && noiseLevel !== null && seatComfort !== null;

          // Grant base review XP (separate from sub_rating_bonus so badge counts are accurate)
          const { newRank, rankedUp } = await grantXp(uid, XP_REWARDS.review, 'review', String(review.id));
          if (hasSubRatings) {
            await grantXp(uid, XP_REWARDS.sub_rating_bonus, 'sub_rating_bonus', String(review.id));
          }

          const awardedBadges = await checkAndAwardBadges(uid);

          const toastXp = XP_REWARDS.review + (hasSubRatings ? XP_REWARDS.sub_rating_bonus : 0);
          setXpToast({ visible: true, xp: toastXp });
          if (rankedUp) setRankUp(newRank);
          if (awardedBadges.length > 0) setNewBadge(awardedBadges[0]);
        } catch (gamErr) {
          console.error('Gamification error (non-fatal):', gamErr);
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      setReviewText('');
      setReviewRating(0);
      setWifiSpeed(null);
      setNoiseLevel(null);
      setSeatComfort(null);
    } catch (err) {
      console.error('Error posting review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <>
    <XpToast
      visible={xpToast.visible}
      xp={xpToast.xp}
      label="Review posted!"
      onHide={() => setXpToast({ visible: false, xp: 0 })}
    />
    <BadgeAwardedSheet badgeKey={newBadge} onClose={() => setNewBadge(null)} />
    <RankUpModal newRankLevel={rankUp} onClose={() => setRankUp(null)} />
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? '#1c1c1e' : '#fff' },
      ]}
    >
      {/* Place info row */}
      <View style={styles.placeRow}>
        <View style={[styles.placeIcon, { backgroundColor: isDark ? '#2c2c2e' : '#f3f4f6' }]}>
          <ThemedText style={styles.placeEmoji}>☕</ThemedText>
        </View>
        <View>
          <ThemedText style={styles.placeName}>{placeForReview.name}</ThemedText>
          {/* <ThemedText style={styles.checkedIn}>Checked in · just now</ThemedText> */}
        </View>
      </View>

      {/* Overall Experience */}
      <ThemedText style={styles.sectionLabel}>Overall Experience</ThemedText>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity key={s} onPress={() => setReviewRating(s)} activeOpacity={0.7}>
            <Text style={{ fontSize: 32 }}>{s <= reviewRating ? '⭐' : '☆'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {reviewRating === 0 && (
        <ThemedText style={styles.tapToRate}>Tap to rate</ThemedText>
      )}

      {/* Sub-ratings */}
      <View style={[styles.subRatingsCard, { backgroundColor: isDark ? '#2c2c2e' : '#f9fafb', borderColor: isDark ? '#3a3a3c' : '#e5e7eb' }]}>
        <SubRatingRow
          icon={<Text style={subStyles.emoji}>🛜</Text>}
          label="WiFi Speed"
          value={wifiSpeed}
          onChange={setWifiSpeed}
          isDark={isDark}
        />
        <View style={[styles.divider, { backgroundColor: isDark ? '#3a3a3c' : '#e5e7eb' }]} />
        <SubRatingRow
          icon={<Text style={subStyles.emoji}>🔇</Text>}
          label="Noise Level"
          value={noiseLevel}
          onChange={setNoiseLevel}
          isDark={isDark}
        />
        <View style={[styles.divider, { backgroundColor: isDark ? '#3a3a3c' : '#e5e7eb' }]} />
        <SubRatingRow
          icon={<Text style={subStyles.emoji}>🪑</Text>}
          label="Seat Comfort"
          value={seatComfort}
          onChange={setSeatComfort}
          isDark={isDark}
        />
      </View>

      {/* Comment box */}
      <TextInput
        value={reviewText}
        onChangeText={setReviewText}
        placeholder="Great vibes, fast WiFi, and the barista remembered my order. Highly recommend for deep work sessions! 💻"
        placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
        multiline
        style={[
          styles.textInput,
          {
            color: textColor,
            backgroundColor: isDark ? '#2c2c2e' : '#f9fafb',
            borderColor: isDark ? '#3a3a3c' : '#e5e7eb',
          },
        ]}
      />

      {/* Submit button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={submitReview}
        disabled={!canSubmit}
        style={[
          styles.submitButton,
          { backgroundColor: BRAND_BLUE, opacity: canSubmit ? 1 : 0.5 },
        ]}
      >
        {submittingReview ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.submitText}>Post Review</ThemedText>
        )}
      </TouchableOpacity>
    </View>
    </>
  );
}

const subStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    width: 28,
    height: 22,
    borderRadius: 6,
  },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  placeIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeEmoji: {
    fontSize: 22,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  checkedIn: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  tapToRate: {
    fontSize: 12,
    opacity: 0.4,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  subRatingsCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  textInput: {
    marginHorizontal: 16,
    marginBottom: 16,
    fontSize: 15,
    padding: 12,
    borderRadius: 12,
    height: 96,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  submitButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
