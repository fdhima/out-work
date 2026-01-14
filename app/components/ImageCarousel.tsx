import { Image } from "expo-image";
import React, { useCallback, useRef, useState } from "react";
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, TouchableOpacity, View } from "react-native";

type ImageCarouselProps = {
  images: string[];
  height?: number;
  borderRadius?: number;
  onPress?: (index: number) => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ImageCarousel({ images, height = 250, borderRadius = 0, onPress }: ImageCarouselProps) {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [activeIndex]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);

  return (
    <View style={{ height }}>
      <FlatList
        ref={flatListRef}
        data={images}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        pagingEnabled={false} // Use snapToInterval instead for better control
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPress && onPress(index)}
          >
            <Image
              source={{ uri: item }}
              style={[styles.image, { width: SCREEN_WIDTH, height, borderRadius }]}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>
        )}
      />
      {/* Dots Indicator */}
      {images.length > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { opacity: i === activeIndex ? 1 : 0.4, scale: i === activeIndex ? 1.2 : 1 }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    // No resizeMode needed for expo-image, use contentFit
  },
  dotsContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
});
