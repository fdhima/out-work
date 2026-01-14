import { ThemedText } from "@/components/themed-text";
import { isDark } from "@/constants/theme";
import { Place } from "@/services/places";
import { Review } from "@/services/reviews";
import { MaterialIcons } from "@expo/vector-icons";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

type FloatingCardProps = {
  selectedPlace: PlaceImagesReviews | null;
  onPressCard: () => void;
  onClose: () => void;
};

type PlaceImagesReviews = Place & { images: { url: string }[]; reviews?: Review[] };

export function FloatingCard({
  selectedPlace,
  onPressCard,
  onClose,
}: FloatingCardProps) {
  if (!selectedPlace) return null;
  return (
    <View style={styles.previewCardContainer}>
      <TouchableOpacity
        style={[styles.previewCard, { backgroundColor: isDark ? '#222' : '#fff' }]}
        onPress={onPressCard}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: selectedPlace.images?.[0]?.url ?? `https://picsum.photos/400/250?random=${selectedPlace.id}` }}
          style={styles.previewImage}
        />
        <View style={styles.previewInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText numberOfLines={1} style={styles.previewTitle}>
              {selectedPlace.name}
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, width: "100%" }}>
              <MaterialIcons name="star" size={12} color={isDark ? '#fff' : '#000'} />
              <ThemedText style={{ fontSize: 12 }}>
                {selectedPlace.rating_avg.toFixed(1)}
              </ThemedText>
            </View>
          </View>
          <ThemedText numberOfLines={1} style={{ fontSize: 13, opacity: 0.6 }}>
            {selectedPlace.description}
          </ThemedText>
          <ThemedText style={{ fontSize: 13, fontWeight: '600', marginTop: 4 }}>
            Free
          </ThemedText>
        </View>
        <TouchableOpacity style={styles.previewClose} onPress={onClose}>
          <MaterialIcons name="close" size={16} color="#000" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  previewCardContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    zIndex: 101, // Above floating button
  },
  previewCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center'
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eee'
  },
  previewInfo: {
    flex: 1,
    gap: 4
  },
  previewTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginRight: 4
  },
  previewClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    opacity: 0.8
  },
})