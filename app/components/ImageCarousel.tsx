import React, { useRef } from "react";
import { Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from "react-native";

type ImageCarouselProps = {
  images: string[];
  height?: number;
  onPress?: (index: number) => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ImageCarousel({ images, height = 250, onPress }: ImageCarouselProps) {
  const flatListRef = useRef<FlatList>(null);

  return (
    <View style={{ height }}>
      <FlatList
        ref={flatListRef}
        data={images}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPress && onPress(index)}
          >
            <Image
              source={{ uri: item }}
              style={[styles.image, { width: SCREEN_WIDTH, height }]}
            />
          </TouchableOpacity>
        )}
      />
      {/* Optional: Dots Indicator */}
      <View style={styles.dotsContainer}>
        {images.map((_, i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: "cover",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
});
