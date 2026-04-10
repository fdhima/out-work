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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BADGES } from '@/services/gamification';

type BadgeAwardedSheetProps = {
  badgeKey: string | null; // null = hidden
  onClose: () => void;
};

/**
 * Bottom sheet shown when the user unlocks a new badge.
 * Follows the same animation pattern as CrowdLevelModal.
 */
export function BadgeAwardedSheet({ badgeKey, onClose }: BadgeAwardedSheetProps) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const slideY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // Reanimated — pop-in scale + mascot-style float
  const badgeScale = useSharedValue(0.5);
  const floatY = useSharedValue(0);

  const badge = badgeKey ? BADGES[badgeKey] : null;

  useEffect(() => {
    if (badgeKey) {
      setModalVisible(true);
      slideY.setValue(400);
      backdropOpacity.setValue(0);

      // Sheet slide + backdrop (old Animated)
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 55, friction: 10 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      // Badge pop-in (Reanimated spring)
      badgeScale.value = 0.5;
      floatY.value = 0;
      badgeScale.value = withSpring(1, { damping: 10, stiffness: 180, mass: 0.8 });

      // Float loop starts after pop-in settles
      const t = setTimeout(() => {
        floatY.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.sin) }),
            withTiming(0,  { duration: 900, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
      }, 380);

      return () => clearTimeout(t);
    } else {
      cancelAnimation(floatY);
      Animated.parallel([
        Animated.timing(slideY, { toValue: 400, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [badgeKey, slideY, backdropOpacity, badgeScale, floatY]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { translateY: floatY.value },
    ],
  }));

  if (!badge) return null;

  const bg = isDark ? '#1c1c1e' : '#ffffff';
  const titleColor = isDark ? '#fff' : '#111';
  const subtitleColor = isDark ? '#8e8e93' : '#6c6c70';

  return (
    <Modal animationType="none" transparent visible={modalVisible} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="box-none">
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]} />
          )}
        </Animated.View>

        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY: slideY }] }]}>
          <View style={styles.handle} />

          {/* Badge — pop-in spring + mascot float */}
          <Reanimated.View style={[styles.emojiWrap, badgeAnimStyle]}>
            <Text style={styles.emoji}>{badge.emoji}</Text>
          </Reanimated.View>

          <Text style={[styles.unlocked, { color: '#22c55e' }]}>Badge Unlocked!</Text>
          <Text style={[styles.title, { color: titleColor }]}>{badge.name}</Text>
          <Text style={[styles.desc, { color: subtitleColor }]}>{badge.desc}</Text>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.btnText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
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
  emojiWrap: { marginBottom: 12 },
  emoji: { fontSize: 72 },
  unlocked: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  btn: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
