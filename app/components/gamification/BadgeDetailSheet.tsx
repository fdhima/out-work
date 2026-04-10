import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BADGES } from '@/services/gamification';

// Explicit "how to earn" text for each badge, matching GAMIFICATION.md
const REQUIREMENTS: Record<string, string> = {
  first_steps:      'Post your first review at any workspace.',
  crowd_whisperer:  'Submit 10 crowd level reports across any workspaces.',
  explorer:         'Collect stamps at 10 different workspaces by reviewing or reporting crowd levels.',
  first_scout:      'Be the first person ever to review a workspace.',
  critic:           'Post 5 reviews with WiFi Speed, Noise Level, and Seat Comfort all rated.',
  city_nomad:       'Collect passport stamps at 5 or more different neighborhoods.',
  on_a_roll:        'Submit crowd level reports on 5 different days in a row.',
  workspace_legend: 'Reach Rank 6 — the highest WorkNomad rank.',
  place_publisher:  'Add your first workspace to OutWork.',
  space_creator:    'Add 5 workspaces to OutWork.',
};

type BadgeDetailSheetProps = {
  badgeKey: string | null; // null = hidden
  earned: boolean;
  onClose: () => void;
};

export function BadgeDetailSheet({ badgeKey, earned, onClose }: BadgeDetailSheetProps) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const slideY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // Reanimated — mascot-style float for earned badges
  const floatY = useSharedValue(0);

  // Dynamic neighborhood badge: not in BADGES dict, synthesise on the fly
  const badge = badgeKey
    ? BADGES[badgeKey] ?? (badgeKey.startsWith('nbhd_')
      ? {
          emoji: '🏅',
          name: badgeKey
            .replace(/^nbhd_[^_]+_/, '')
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ') + ' Regular',
          desc: 'Earned by completing all workspaces in this neighborhood.',
        }
      : null)
    : null;

  useEffect(() => {
    if (badgeKey) {
      setModalVisible(true);
      slideY.setValue(400);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 55,
          friction: 10,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Float only for earned badges (same as mascot in the post tab)
      floatY.value = 0;
      if (earned) {
        floatY.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.sin) }),
            withTiming(0,  { duration: 900, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
      }
    } else {
      cancelAnimation(floatY);
      Animated.parallel([
        Animated.timing(slideY, { toValue: 400, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
    return () => cancelAnimation(floatY);
  }, [badgeKey, earned, slideY, backdropOpacity, floatY]);

  const emojiFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  if (!badge) return null;

  const bg = isDark ? '#1c1c1e' : '#ffffff';
  const titleColor = isDark ? '#ffffff' : '#111111';
  const subtitleColor = isDark ? '#8e8e93' : '#6c6c70';
  const requirementBg = isDark ? '#2c2c2e' : '#f3f4f6';
  const requirementBorder = isDark ? '#3a3a3c' : '#e5e7eb';

  const statusColor = earned ? '#22c55e' : subtitleColor;
  const statusLabel = earned ? '✓ Earned' : 'Locked';

  return (
    <Modal
      animationType="none"
      transparent
      visible={modalVisible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="box-none"
        >
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={20}
              style={StyleSheet.absoluteFill}
              tint={isDark ? 'dark' : 'light'}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' },
              ]}
            />
          )}
        </Animated.View>

        {/* Tap outside to close */}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        {/* Sheet */}
        <Animated.View
          style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY: slideY }] }]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <MaterialIcons name="close" size={20} color={isDark ? '#8e8e93' : '#aaaaaa'} />
          </TouchableOpacity>

          {/* Badge emoji — float for earned, static+dimmed for locked */}
          <Reanimated.View style={[styles.emojiWrap, emojiFloatStyle]}>
            <Text style={[styles.emoji, !earned && styles.emojiLocked]}>
              {badge.emoji}
            </Text>
          </Reanimated.View>

          {/* Status pill */}
          <View style={[styles.statusPill, { backgroundColor: earned ? 'rgba(34,197,94,0.12)' : requirementBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          {/* Name */}
          <Text style={[styles.title, { color: titleColor }]}>{badge.name}</Text>

          {/* How to earn */}
          <View style={[styles.requirementCard, { backgroundColor: requirementBg, borderColor: requirementBorder }]}>
            <Text style={[styles.requirementLabel, { color: subtitleColor }]}>HOW TO EARN</Text>
            <Text style={[styles.requirementText, { color: titleColor }]}>
              {REQUIREMENTS[badgeKey!] ?? badge.desc}
            </Text>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    marginBottom: 20,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 20,
    padding: 4,
    zIndex: 1,
  },
  emojiWrap: {
    marginBottom: 12,
  },
  emoji: {
    fontSize: 64,
  },
  emojiLocked: {
    opacity: 0.3,
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  requirementCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  requirementLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  requirementText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  doneBtn: {
    backgroundColor: '#4A90E2',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 52,
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
