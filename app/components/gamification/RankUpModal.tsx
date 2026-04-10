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
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RANKS } from '@/services/gamification';

type RankUpModalProps = {
  newRankLevel: number | null; // null = hidden
  onClose: () => void;
};

const RANK_EMOJIS: Record<number, string> = {
  2: '☕',
  3: '📶',
  4: '🧳',
  5: '🚀',
  6: '🧭',
};

/**
 * Full-center modal shown when the user crosses a rank threshold.
 */
export function RankUpModal({ newRankLevel, onClose }: RankUpModalProps) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  const rank = newRankLevel ? RANKS.find(r => r.level === newRankLevel) : null;

  useEffect(() => {
    if (newRankLevel && rank) {
      setModalVisible(true);
      scaleAnim.setValue(0.6);
      opacityAnim.setValue(0);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [newRankLevel, rank, scaleAnim, opacityAnim, backdropOpacity]);

  if (!rank) return null;

  const bg = isDark ? '#1c1c1e' : '#ffffff';
  const titleColor = isDark ? '#fff' : '#111';
  const subtitleColor = isDark ? '#8e8e93' : '#6c6c70';
  const emoji = RANK_EMOJIS[rank.level] ?? '🎉';

  return (
    <Modal animationType="none" transparent visible={modalVisible} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="box-none">
          {Platform.OS === 'ios' ? (
            <BlurView intensity={25} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
          )}
        </Animated.View>

        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: bg, opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Decorative ring */}
          <View style={styles.emojiRing}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>

          <Text style={[styles.levelUpText, { color: '#4A90E2' }]}>Level Up!</Text>
          <Text style={[styles.rankTitle, { color: titleColor }]}>{rank.title}</Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            You've reached rank {rank.level} of {RANKS.length}. Keep exploring!
          </Text>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.btnText}>Keep Going 🔥</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  emojiRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(74,144,226,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(74,144,226,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emoji: { fontSize: 44 },
  levelUpText: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  rankTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  btn: {
    backgroundColor: '#4A90E2',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
