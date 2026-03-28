/**
 * FilterModal — Airbnb-style filter bottom sheet.
 *
 * Uses Reanimated (same approach as AirbnbBottomSheet) so the backdrop fades
 * in independently while the sheet springs up — matching the feel of the list
 * expanding to full view. Exit animation plays before the Modal unmounts.
 */

import { ThemedText } from '@/components/themed-text';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Same spring config as AirbnbBottomSheet
const SPRING = { damping: 22, stiffness: 180, mass: 0.8 };
const SHEET_OFFSCREEN = 700;

type Category = { id: string; label: string; icon: string };

type Props = {
  visible: boolean;
  selectedCategory: string;
  categories: Category[];
  resultCount: number;
  onApply: (category: string) => void;
  onClose: () => void;
};

export function FilterModal({
  visible,
  selectedCategory,
  categories,
  resultCount,
  onApply,
  onClose,
}: Props) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';

  // Local draft — only committed when the user taps "Show results"
  const [draft, setDraft] = useState(selectedCategory);

  // Controls whether the Modal node is mounted. Trails `visible` on close so
  // the exit animation can finish before the Modal unmounts.
  const [localVisible, setLocalVisible] = useState(false);

  const translateY = useSharedValue(SHEET_OFFSCREEN);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setDraft(selectedCategory);
      setLocalVisible(true);
      translateY.value = withSpring(0, SPRING);
      backdropOpacity.value = withTiming(1, { duration: 280 });
    } else if (localVisible) {
      // Play exit, then unmount
      translateY.value = withSpring(SHEET_OFFSCREEN, SPRING);
      backdropOpacity.value = withTiming(0, { duration: 220 }, finished => {
        if (finished) runOnJS(setLocalVisible)(false);
      });
    }
  }, [visible]);

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleClear = () => setDraft('all');

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const sheetBg = isDark ? '#1c1c1e' : '#ffffff';
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const sectionLabelColor = isDark ? '#ebebf5' : '#1c1c1e';
  const pillBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const pillBgActive = isDark ? '#ffffff' : '#1c1c1e';
  const pillTextColor = isDark ? '#ebebf5' : '#1c1c1e';
  const pillTextColorActive = isDark ? '#1c1c1e' : '#ffffff';
  const pillBorderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const pillBorderColorActive = isDark ? '#ffffff' : '#1c1c1e';
  const handleColor = isDark ? '#48484a' : '#d1d1d6';
  const clearColor = isDark ? '#ebebf5' : '#1c1c1e';
  const isDraftChanged = draft !== 'all';

  return (
    <Modal
      visible={localVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — fades in separately from the sheet */}
      <Animated.View style={[styles.backdropFill, backdropAnimStyle]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet — springs up from below */}
      <Animated.View style={[styles.sheetWrap, sheetAnimStyle]}>
        <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
          {/* Handle */}
          <View style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
          </View>

          {/* Header row */}
          <View style={[styles.headerRow, { borderBottomColor: dividerColor }]}>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color={sectionLabelColor} />
            </TouchableOpacity>

            <ThemedText style={styles.headerTitle}>Filters</ThemedText>

            <TouchableOpacity onPress={handleClear} hitSlop={12} disabled={!isDraftChanged}>
              <ThemedText
                style={[
                  styles.clearText,
                  { color: clearColor, opacity: isDraftChanged ? 1 : 0.3 },
                ]}
              >
                Clear
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* ── Section: Category ── */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionLabel, { color: sectionLabelColor }]}>
              Type of workspace
            </ThemedText>
            <ThemedText style={styles.sectionSubLabel}>
              Select what kind of spot you're looking for
            </ThemedText>

            <View style={styles.pillGrid}>
              {categories
                .filter(c => c.id !== 'all')
                .map(cat => {
                  const isActive = draft === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setDraft(isActive ? 'all' : cat.id)}
                      activeOpacity={0.75}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: isActive ? pillBgActive : pillBg,
                          borderColor: isActive ? pillBorderColorActive : pillBorderColor,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 22 }}>{cat.icon}</Text>
                      <ThemedText
                        style={[
                          styles.pillLabel,
                          {
                            color: isActive ? pillTextColorActive : pillTextColor,
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}
                      >
                        {cat.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>

          {/* ── Divider ── */}
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* ── Footer: Show results button ── */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: isDark ? '#ffffff' : '#1c1c1e' }]}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <ThemedText
                style={[styles.applyBtnText, { color: isDark ? '#1c1c1e' : '#ffffff' }]}
              >
                Show {resultCount} {resultCount === 1 ? 'place' : 'places'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 28,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 20,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    minWidth: '44%',
    flex: 1,
  },
  pillLabel: {
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 0,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  applyBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
