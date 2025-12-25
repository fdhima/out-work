import React, { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    GestureResponderEvent,
    Image,
    Modal,
    PanResponder,
    PanResponderGestureState,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width, height } = Dimensions.get("window");

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onRequestClose: () => void;
};

export default function FullscreenGallery({ visible, images, initialIndex = 0, onRequestClose }: Props) {
  const listRef = useRef<FlatList<string> | null>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  React.useEffect(() => {
    setActiveIndex(initialIndex);
    if (visible && listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  // basic swipe-down-to-close
  const pan = useRef({ dy: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        pan.current.dy = gestureState.dy;
      },
      onPanResponderRelease: () => {
        if (pan.current.dy > 120) {
          onRequestClose();
        }
        pan.current.dy = 0;
      },
    })
  ).current;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onRequestClose}>
      <View style={styles.container} {...panResponder.panHandlers}>
        <FlatList
          ref={listRef}
          data={images.length ? images : ["https://via.placeholder.com/800x800?text=No+Image"]}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveIndex(newIndex);
          }}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image source={{ uri: item }} style={styles.image} />
            </View>
          )}
        />

        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity style={styles.closeButton} onPress={onRequestClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        {images.length > 1 && (
          <View style={styles.footer} pointerEvents="none">
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.activeDot]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  slide: {
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width,
    height,
    resizeMode: "contain",
    backgroundColor: "#000",
  },
  topBar: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    height: 44,
    alignItems: "flex-end",
    paddingHorizontal: 12,
  },
  closeButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeText: {
    color: "#fff",
    fontSize: 16,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#fff",
  },
});
