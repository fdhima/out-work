import { ThemedText } from "@/components/themed-text";
import { isDark } from "@/constants/theme";
import { PlaceEnhanced } from "@/services/places";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image, Platform, StyleSheet, TouchableOpacity, View } from "react-native";

type FloatingCardProps = {
  selectedPlace: PlaceEnhanced | null;
  onPressCard: () => void;
  onClose: () => void;
};

export function FloatingCard({
  selectedPlace,
  onPressCard,
  onClose,
}: FloatingCardProps) {
  if (!selectedPlace) return null;

  const cardBackground = isDark ? "rgba(34, 34, 34, 0.7)" : "rgba(255, 255, 255, 0.7)";

  return (
    <View style={styles.previewCardContainer}>
      <TouchableOpacity
        style={styles.touchableWrapper}
        onPress={onPressCard}
        activeOpacity={0.9}
      >
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.previewCard,
            { backgroundColor: cardBackground }
          ]}
        >
          <Image
            source={{ uri: selectedPlace.images?.[0]?.url ?? `https://picsum.photos/400/250?random=${selectedPlace.id}` }}
            style={styles.previewImage}
          />
          <View style={styles.previewInfo}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText numberOfLines={1} style={styles.previewTitle}>
                {selectedPlace.name}
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <MaterialIcons name="star" size={14} color={isDark ? '#FFD700' : '#FFB400'} />
                <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>
                  {selectedPlace.rating_avg.toFixed(1)}
                </ThemedText>
              </View>
            </View>
            <ThemedText numberOfLines={1} style={{ fontSize: 13, opacity: 0.6 }}>
              {selectedPlace.description}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={[styles.previewClose, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            onPress={onClose}
          >
            <MaterialIcons name="close" size={16} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
        </BlurView>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  previewCardContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
    left: 20,
    right: 20,
    zIndex: 101,
  },
  touchableWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  previewCard: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#eee'
  },
  previewInfo: {
    flex: 1,
    gap: 6
  },
  previewTitle: {
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
    marginRight: 8
  },
  previewClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 12,
  },
});