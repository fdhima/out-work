import { ThemedText } from "@/components/themed-text";
import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

type RenderStarsProps = {
  rating: number;
  size: number; // 14
  color: string; // primaryColor
}

export function RenderStars({
  rating,
  size,
  color
}: RenderStarsProps) {
    return (
      <View style={styles.starContainer}>
        <MaterialIcons name="star" size={size} color={color} />
        <ThemedText style={[styles.ratingText, { fontSize: size }]}>{rating.toFixed(1)}</ThemedText>
      </View>
    );
}

const styles = StyleSheet.create({
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontWeight: '600',
  },
})