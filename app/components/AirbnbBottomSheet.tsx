/**
 * AirbnbBottomSheet
 *
 * A physics-based draggable bottom sheet with three snap states:
 *   - collapsed  → small peek (~130 px above tab bar) — map dominates
 *   - half       → 50 % of the screen — map + listings equally visible
 *   - full       → sheet top sits just below the search bar — listings dominate
 *
 * ─── Gesture Handling ───────────────────────────────────────────────────────
 * A PanGesture lives on the handle bar only. The sheet's position is driven
 * by a Reanimated `useSharedValue` (translateY) so all animation runs on the
 * UI thread at 60 fps. On release, velocity decides whether we snap to the
 * next state up/down, or fall back to whichever snap point is nearest.
 *
 * ─── Map ↔ List Sync ────────────────────────────────────────────────────────
 * The parent calls `sheetRef.scrollToIndex(i)` when a map pin is tapped,
 * scrolling the vertical list to the matching card and highlighting it.
 * Tapping a card calls `onPressCard` (navigate to detail).
 *
 * ─── Layout note ────────────────────────────────────────────────────────────
 * The sheet is `position: absolute, top: 0`. `translateY` shifts it down;
 * React Native applies transforms to the touch hit-area too, so touches above
 * the collapsed sheet correctly fall through to the map below.
 */

import * as Haptics from 'expo-haptics';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PlaceEnhanced } from '@/services/places';
import ListingCardDetailed, { DETAILED_CARD_HEIGHT } from './ListingCardDetailed';

// ─── Constants ───────────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Height of the iOS tab bar (position absolute at the bottom). */
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 70;

/**
 * Approximate height of the MapHeader (safe-area inset + search pill +
 * category row). The sheet must never slide above this so its handle bar
 * is always visible and reachable below the search bar.
 */
const MAP_HEADER_HEIGHT = Platform.OS === 'ios' ? 120 : 100;

/**
 * The sheet spans from the very top of the screen down to the tab bar.
 * translateY shifts the sheet down; snap points are translateY offsets.
 */
const SHEET_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT;

/**
 * Snap point: fully expanded.
 * Top of sheet sits just below the MapHeader so the handle bar is always
 * accessible and the first list card is never hidden behind the search bar.
 */
const SNAP_FULL = MAP_HEADER_HEIGHT;

/** Snap point: half-screen — map and listings equally visible */
const SNAP_HALF = SCREEN_HEIGHT * 0.48;

/**
 * Snap point: collapsed — handle + small peek of the first card.
 * 130 px of peek keeps the sheet subtle without completely hiding the list.
 */
const SNAP_COLLAPSED = SCREEN_HEIGHT - TAB_BAR_HEIGHT - 60;

/** Hidden: sheet is fully below the screen (place-selected floating-card mode). */
const SNAP_HIDDEN = SCREEN_HEIGHT + 50;

const SPRING = { damping: 22, stiffness: 180, mass: 0.8 };

const FILTER_PILLS = ['Sort by', 'Open Now', 'Top Rated', 'Cafe'];

// ─── Types ───────────────────────────────────────────────────────────────────

export type SheetState = 'collapsed' | 'half' | 'full';

/** Ref API exposed to the parent screen. */
export interface BottomSheetRef {
  /** Programmatically scroll the list to the given index. */
  scrollToIndex: (index: number) => void;
  /** Animate the sheet from collapsed to the half state. */
  expandToHalf: () => void;
  /** Slide the sheet completely off screen (place-selected mode). */
  hide: () => void;
  /** Slide the sheet back to the collapsed snap point. */
  restoreCollapsed: () => void;
}

type Props = {
  places: PlaceEnhanced[];
  selectedPlace: PlaceEnhanced | null;
  /** Current sheet state — parent owns it for layout coordination. */
  sheetState: SheetState;
  onSheetStateChange: (state: SheetState) => void;
  /** Fired when the user taps a card to navigate to the detail screen. */
  onPressCard: (place: PlaceEnhanced) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map a translateY value to the nearest snap state. Runs on UI thread. */
function nearestSnap(y: number): { snapY: number; state: SheetState } {
  'worklet';
  const snaps: [number, SheetState][] = [
    [SNAP_FULL, 'full'],
    [SNAP_HALF, 'half'],
    [SNAP_COLLAPSED, 'collapsed'],
  ];
  return snaps.reduce(
    (best, curr) =>
      Math.abs(curr[0] - y) < Math.abs(best.snapY - y)
        ? { snapY: curr[0], state: curr[1] }
        : best,
    { snapY: snaps[0][0], state: snaps[0][1] as SheetState }
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const AirbnbBottomSheet = forwardRef<BottomSheetRef, Props>(
  ({ places, selectedPlace: _selectedPlace, sheetState, onSheetStateChange, onPressCard }, ref) => {
    // ── Animation state ──────────────────────────────────────────────────────
    const translateY = useSharedValue(SNAP_HALF);
    const savedY = useSharedValue(SNAP_HALF);

    // ── List ref ─────────────────────────────────────────────────────────────
    const listRef = useRef<FlatList>(null);

    // ── Ref API ──────────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      scrollToIndex(index: number) {
        if (!listRef.current || index < 0 || index >= places.length) return;
        listRef.current.scrollToIndex({
          index,
          animated: true,
          viewOffset: 16,
          viewPosition: 0,
        });
      },
      expandToHalf() {
        translateY.value = withSpring(SNAP_HALF, SPRING);
        onSheetStateChange('half');
      },
      hide() {
        translateY.value = withSpring(SNAP_HIDDEN, { damping: 22, stiffness: 200, mass: 0.8 });
      },
      restoreCollapsed() {
        translateY.value = withSpring(SNAP_COLLAPSED, SPRING);
        onSheetStateChange('collapsed');
      },
    }));

    // ── JS-side state change (called from UI-thread worklet via runOnJS) ──────
    const applyStateChange = useCallback(
      (state: SheetState) => {
        onSheetStateChange(state);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      [onSheetStateChange]
    );

    // ── Pan gesture on handle bar only ───────────────────────────────────────
    const gesture = Gesture.Pan()
      .onBegin(() => {
        savedY.value = translateY.value;
      })
      .onUpdate(e => {
        const next = savedY.value + e.translationY;
        translateY.value = Math.max(SNAP_FULL, Math.min(SNAP_COLLAPSED, next));
      })
      .onEnd(e => {
        const vel = e.velocityY;
        const cur = translateY.value;
        let snapY: number;
        let state: SheetState;

        // Fast flick snaps to next logical state rather than nearest point.
        if (vel > 600) {
          if (cur < SNAP_HALF) { snapY = SNAP_HALF; state = 'half'; }
          else { snapY = SNAP_COLLAPSED; state = 'collapsed'; }
        } else if (vel < -600) {
          if (cur > SNAP_HALF) { snapY = SNAP_HALF; state = 'half'; }
          else { snapY = SNAP_FULL; state = 'full'; }
        } else {
          const result = nearestSnap(cur);
          snapY = result.snapY;
          state = result.state;
        }

        translateY.value = withSpring(snapY, SPRING);
        runOnJS(applyStateChange)(state);
      });

    // ── Animated styles ───────────────────────────────────────────────────────
    const sheetAnimStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    // Subtle backdrop dims the map as the sheet rises toward SNAP_FULL.
    // Input range must be ascending: SNAP_FULL < SNAP_HALF (smaller translateY = higher sheet).
    const backdropAnimStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateY.value,
        [SNAP_FULL, SNAP_HALF],
        [0.25, 0],
        Extrapolation.CLAMP
      ),
    }));

    // ── List rendering ────────────────────────────────────────────────────────
    const renderCard = useCallback(
      ({ item }: { item: PlaceEnhanced }) => (
        <ListingCardDetailed
          place={item}
          onPress={() => onPressCard(item)}
        />
      ),
      [onPressCard]
    );

    /**
     * getItemLayout is required for reliable scrollToIndex on large lists.
     * VERTICAL_ITEM_HEIGHT = card height + gap between items.
     */
    const VERTICAL_ITEM_HEIGHT = DETAILED_CARD_HEIGHT + 16;
    const getItemLayout = useCallback(
      (_: unknown, index: number) => ({
        length: VERTICAL_ITEM_HEIGHT,
        offset: VERTICAL_ITEM_HEIGHT * index,
        index,
      }),
      []
    );

    const bgColor = '#111111';
    const handleColor = '#48484a';

    return (
      <>
        {/* ── Map dimming backdrop ── */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimStyle]}
          pointerEvents="none"
        />

        {/* ── The sheet ── */}
        <Animated.View
          style={[
            styles.sheet,
            { height: SHEET_HEIGHT, backgroundColor: bgColor },
            sheetAnimStyle,
          ]}
        >
          {/* ── Handle bar — only gesture target ── */}
          <GestureDetector gesture={gesture}>
            <View style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: handleColor }]} />
              {/* Heading */}
              <Text style={styles.heading}>Desks in Athens</Text>
              {/* Filter row */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersRow}
              >
                {/* Filter icon */}
                <View style={styles.filterIconWrap}>
                  <MaterialIcons name="filter-list" size={18} color="#fff" />
                </View>
                {FILTER_PILLS.map(pill => (
                  <View key={pill} style={styles.filterPill}>
                    <Text style={styles.filterPillText}>{pill}</Text>
                    {pill === 'Sort by' && (
                      <MaterialIcons name="keyboard-arrow-down" size={14} color="#ebebf5" />
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </GestureDetector>

          {/* ── Single vertical FlatList — always mounted, avoids prop-nullability crash ── */}
          <FlatList
            ref={listRef}
            data={places}
            keyExtractor={item => item.id.toString()}
            renderItem={renderCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            getItemLayout={getItemLayout}
            onScrollToIndexFailed={info => {
              // Retry after the list has rendered
              setTimeout(() => {
                listRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewOffset: 16,
                });
              }, 500);
            }}
          />
        </Animated.View>
      </>
    );
  }
);

AirbnbBottomSheet.displayName = 'AirbnbBottomSheet';
export default AirbnbBottomSheet;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
    zIndex: 49,
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 50,
  },
  handleArea: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    alignSelf: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  filterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  filterPillText: {
    color: '#ebebf5',
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: TAB_BAR_HEIGHT + 120,
    gap: 16,
  },
});
