import { useState } from "react";
import { Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from "react-native";


export function ImageCarousel({
  images,
  height,
  onPress,
  borderRadius = 0 
}: { images: string[]; height: number; onPress?: (index: number) => void; borderRadius?: number }) {

  const [index, setIndex] = useState(0);
  const { width } = Dimensions.get('window'); //may be wrong, due to the method fixed returns

  const imgs = (images && images.length ? images.slice(0, 5) : []) as string[];
  const placeholder = "https://via.placeholder.com/400x250?text=No+Image";

  return (
    <View style={{ width: "100%", height, borderRadius, overflow: 'hidden' }}>
      <FlatList
        data={imgs.length ? imgs : [placeholder]}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index: itemIndex }) => (
          <TouchableOpacity activeOpacity={1} onPress={() => onPress?.(itemIndex)}>
            <Image
              source={{ uri: item }}
              style={{ width: width - (borderRadius ? (borderRadius > 0 ? 0 : 40) : 0), height, backgroundColor: "#f3f4f6" }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        onScroll={(e) => {
          // Basic approximate pagination
          const offsetX = e.nativeEvent.contentOffset.x;
          // This width calculation is simpler in this context
          const w = width - (borderRadius ? (borderRadius > 0 ? 0 : 40) : 0);
          const newIndex = Math.round(offsetX / w);
          if (newIndex !== index) setIndex(newIndex);
        }}
        scrollEventThrottle={16}
      />

      {(imgs.length ? imgs : [placeholder]).length > 1 && (
        <View style={styles.pagination} pointerEvents="none">
          {(imgs.length ? imgs : [placeholder]).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index ? { backgroundColor: '#fff', opacity: 1 } : { backgroundColor: '#fff', opacity: 0.5 }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    pagination: {
  position: 'absolute',
  bottom: 16,
  left: 0,
  right: 0,
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 6,
},
dot: {
  width: 6,
  height: 6,
  borderRadius: 3,
},
})