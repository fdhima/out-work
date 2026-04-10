import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

type XpToastProps = {
  visible: boolean;
  xp: number;
  label?: string; // e.g. "Review posted!" or "Crowd report sent!"
  onHide: () => void;
};

/**
 * Small toast that slides up from the bottom, shows "+X XP", then fades away.
 * Auto-dismisses after 2.5 s and calls onHide so the parent can reset state.
 */
export function XpToast({ visible, xp, label, onHide }: XpToastProps) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Slide up + fade in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Hold, then fade out and slide back down
    const hide = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 80,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        translateY.setValue(80);
        onHide();
      });
    }, 2200);

    return () => clearTimeout(hide);
  }, [visible, translateY, opacity, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1c1c1e' : '#fff',
          borderColor: isDark ? '#2c2c2e' : '#e5e7eb',
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.badge, { backgroundColor: '#22c55e' }]}>
        <Text style={styles.badgeText}>+{xp}</Text>
      </View>
      <Text style={[styles.xpLabel, { color: '#22c55e' }]}>XP</Text>
      {label ? (
        <Text style={[styles.actionLabel, { color: isDark ? '#aaa' : '#555' }]}>
          {label}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  xpLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
