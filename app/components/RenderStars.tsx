import { ThemedText } from "@/components/themed-text";
import { StyleSheet, Text, View } from "react-native";

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
        <Text style={{ fontSize: size }}>⭐</Text>
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