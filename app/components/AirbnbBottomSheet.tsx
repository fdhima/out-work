import * as Haptics from 'expo-haptics';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated2, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PlaceEnhanced } from '@/services/places';
import ListingCardDetailed, { DETAILED_CARD_HEIGHT } from './ListingCardDetailed';
import { ThemedText } from '@/components/themed-text';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Constants ───────────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 85 : 70;

/**
 * SNAP_FULL: sheet top sits just below the search bar, covering the filter pills.
 * ~110px on iOS (60 safe-area + ~50 search bar), ~90px on Android.
 */
const SNAP_FULL = Platform.OS === 'ios' ? 118 : 140;

const SHEET_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT;

const SNAP_COLLAPSED = SCREEN_HEIGHT - TAB_BAR_HEIGHT - 60;

const SNAP_HIDDEN = SCREEN_HEIGHT + 50;

const SPRING = { damping: 22, stiffness: 180, mass: 0.8 };

// Height of the handle + heading + filter row area
const HANDLE_AREA_HEIGHT = 120;

// ─── Types ───────────────────────────────────────────────────────────────────

export type SheetState = 'collapsed' | 'full';

export interface BottomSheetRef {
  scrollToIndex: (index: number) => void;
  hide: () => void;
  restoreCollapsed: () => void;
}

type Category = { id: string; label: string; icon: string };

type Props = {
  places: PlaceEnhanced[];
  selectedPlace: PlaceEnhanced | null;
  sheetState: SheetState;
  onSheetStateChange: (state: SheetState) => void;
  onPressCard: (place: PlaceEnhanced) => void;
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  categories: Category[];
};

// ─── Scale-press pill ─────────────────────────────────────────────────────────

function ScalePill({ onPress, style, children }: { onPress: () => void; style: any; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 0 }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()
      }
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nearestSnap(y: number): { snapY: number; state: SheetState } {
  'worklet';
  const snaps: [number, SheetState][] = [
    [SNAP_FULL, 'full'],
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
  (
    {
      places,
      selectedPlace: _selectedPlace,
      sheetState,
      onSheetStateChange,
      onPressCard,
      selectedCategory,
      onCategoryChange,
      categories,
    },
    ref
  ) => {
    const translateY = useSharedValue(SNAP_COLLAPSED);
    const savedY = useSharedValue(SNAP_COLLAPSED);
    const savedBodyY = useSharedValue(SNAP_COLLAPSED);

    const listRef = useRef<FlatList>(null);

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
      hide() {
        translateY.value = withSpring(SNAP_HIDDEN, { damping: 22, stiffness: 200, mass: 0.8 });
      },
      restoreCollapsed() {
        translateY.value = withSpring(SNAP_COLLAPSED, SPRING);
        onSheetStateChange('collapsed');
      },
    }));

    const applyStateChange = useCallback(
      (state: SheetState) => {
        onSheetStateChange(state);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      [onSheetStateChange]
    );

    // ── Handle bar gesture ────────────────────────────────────────────────────
    const handleGesture = Gesture.Pan()
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

        if (vel > 600) {
          snapY = SNAP_COLLAPSED; state = 'collapsed';
        } else if (vel < -600) {
          snapY = SNAP_FULL; state = 'full';
        } else {
          const result = nearestSnap(cur);
          snapY = result.snapY;
          state = result.state;
        }

        translateY.value = withSpring(snapY, SPRING);
        runOnJS(applyStateChange)(state);
      });

    // ── Body overlay gesture (active in collapsed mode only) ──────────────────
    // When sheetState !== 'full', a transparent overlay sits over the list and
    // intercepts vertical swipes to expand / collapse the sheet.
    const bodyGesture = Gesture.Pan()
      .onBegin(() => {
        savedBodyY.value = translateY.value;
      })
      .onUpdate(e => {
        const next = savedBodyY.value + e.translationY;
        translateY.value = Math.max(SNAP_FULL, Math.min(SNAP_COLLAPSED, next));
      })
      .onEnd(e => {
        const vel = e.velocityY;
        const cur = translateY.value;
        let snapY: number;
        let state: SheetState;

        if (vel > 600) {
          snapY = SNAP_COLLAPSED; state = 'collapsed';
        } else if (vel < -600) {
          snapY = SNAP_FULL; state = 'full';
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

    const backdropAnimStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateY.value,
        [SNAP_FULL, SNAP_COLLAPSED],
        [0.25, 0],
        Extrapolation.CLAMP
      ),
    }));

    // ── List rendering ────────────────────────────────────────────────────────
    const renderCard = useCallback(
      ({ item }: { item: PlaceEnhanced }) => (
        <ListingCardDetailed place={item} onPress={() => onPressCard(item)} />
      ),
      [onPressCard]
    );

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
        <Animated2.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnimStyle]}
          pointerEvents="none"
        />

        {/* ── The sheet ── */}
        <Animated2.View
          style={[
            styles.sheet,
            { height: SHEET_HEIGHT, backgroundColor: bgColor },
            sheetAnimStyle,
          ]}
        >
          {/* ── Handle bar — gesture target ── */}
          <GestureDetector gesture={handleGesture}>
            <View style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: handleColor }]} />

              <Text style={styles.heading}>Spots in Greece 🇬🇷</Text>

              {/* Category filter pills — same as search bar */}
              <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.pillsRow}
                renderItem={({ item: cat }) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <ScalePill
                      onPress={() =>
                        onCategoryChange(isActive && cat.id !== 'all' ? 'all' : cat.id)
                      }
                      style={[
                        styles.pill,
                        {
                          backgroundColor: isActive ? '#ffffff' : '#1c1c1e',
                          borderColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.15)',
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={cat.icon as any}
                        size={14}
                        color={isActive ? '#000000' : '#8e8e93'}
                      />
                      <ThemedText
                        style={[
                          styles.pillLabel,
                          {
                            color: isActive ? '#000000' : '#ebebf5',
                            fontWeight: isActive ? '700' : '500',
                          },
                        ]}
                      >
                        {cat.label}
                      </ThemedText>
                    </ScalePill>
                  );
                }}
              />
            </View>
          </GestureDetector>

          {/* ── List ── */}
          <FlatList
            ref={listRef}
            data={places}
            keyExtractor={item => item.id.toString()}
            renderItem={renderCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            getItemLayout={getItemLayout}
            scrollEnabled={sheetState === 'full'}
            onScrollToIndexFailed={info => {
              setTimeout(() => {
                listRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewOffset: 16,
                });
              }, 500);
            }}
          />

          {/* ── Body overlay: catches swipes to expand/collapse in half mode ── */}
          {sheetState !== 'full' && (
            <GestureDetector gesture={bodyGesture}>
              <View style={styles.listOverlay} />
            </GestureDetector>
          )}
        </Animated2.View>
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
    zIndex: 109,
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
    zIndex: 110,
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
  pillsRow: {
    gap: 8,
    paddingRight: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillLabel: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: TAB_BAR_HEIGHT + 120,
    gap: 16,
  },
  listOverlay: {
    position: 'absolute',
    top: HANDLE_AREA_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
