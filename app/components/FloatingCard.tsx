import { ThemedText } from "@/components/themed-text";
import { CATEGORIES } from "@/constants/theme";
import { PlaceEnhanced } from "@/services/places";
import * as Location from 'expo-location';
import { getDistance, formatDistance } from "@/utils/location";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const SPRING = { damping: 22, stiffness: 200, mass: 0.8 };
const HIDDEN_Y = 380;
const CARD_WIDTH = Dimensions.get("window").width - 32;
const IMAGE_HEIGHT = Math.round(CARD_WIDTH * 0.48);

type FloatingCardProps = {
  selectedPlace: PlaceEnhanced | null;
  onPressCard: (place: PlaceEnhanced) => void;
  userLocation?: Location.LocationObjectCoords | null;
};

export function FloatingCard({ selectedPlace, onPressCard, userLocation }: FloatingCardProps) {
  const isDark = (useColorScheme() ?? "light") === "dark";

  // Keep last known place so content stays visible during exit animation.
  const lastPlaceRef = useRef<PlaceEnhanced | null>(null);
  if (selectedPlace) lastPlaceRef.current = selectedPlace;
  const place = selectedPlace ?? lastPlaceRef.current;

  const translateY = useSharedValue(HIDDEN_Y);

  useEffect(() => {
    translateY.value = withSpring(selectedPlace ? 0 : HIDDEN_Y, SPRING);
  }, [selectedPlace]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const distance = userLocation && place
    ? getDistance(
        userLocation.latitude, 
        userLocation.longitude, 
        place.latitude, 
        place.longitude
      )
    : null;

  if (!place) return null;

  const categories = place.places_categories
    ?.map(pc => {
      const name = pc.categories?.name;
      if (!name) return null;
      return CATEGORIES.find(c => c.id === name) ?? null;
    })
    .filter(Boolean) as { id: string; label: string; icon: string }[] | undefined;

  return (
    <Animated.View
      style={[styles.container, animStyle]}
      pointerEvents={selectedPlace ? "auto" : "none"}
    >
      <TouchableOpacity
        style={[styles.touchable, { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" }]}
        onPress={() => onPressCard(place)}
        activeOpacity={0.95}
      >
        {/* ── Image ── */}
        <Image
          source={{
            uri:
              place.images?.[0]?.url ??
              `https://picsum.photos/800/500?random=${place.id}`,
          }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

        {/* ── Info ── */}
        <View style={styles.info}>
          {/* Name + rating */}
          <View style={styles.nameRow}>
            <ThemedText numberOfLines={1} style={styles.name}>
              {place.name}
            </ThemedText>
            <View style={styles.ratingPill}>
              {distance !== null && (
                <>
                  <Text style={[styles.distanceText, { color: isDark ? "#8e8e93" : "#666" }]}>
                    {formatDistance(distance)}
                  </Text>
                  <Text style={[styles.dot, { color: isDark ? "#8e8e93" : "#666" }]}>·</Text>
                </>
              )}
              <MaterialIcons name="star" size={13} color={isDark ? "#FFD700" : "#FFB400"} />
              <ThemedText style={styles.ratingText}>
                {place.rating_avg.toFixed(2)}
              </ThemedText>
            </View>
          </View>

          {/* Endorser */}
          {/* <Text style={[styles.endorser, { color: isDark ? "#aaa" : "#666" }]} numberOfLines={1}>
            Endorsed by {place.profiles?.full_name ?? "OutWork"}
          </Text> */}

          {/* Category pills — same style as ListingCard */}
          {categories && categories.length > 0 && (
            <View style={styles.categoryRow}>
              {categories.slice(0, 3).map((cat, i) => (
                <View
                  key={i}
                  style={[
                    styles.categoryPill,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" },
                  ]}
                >
                  <MaterialIcons
                    name={cat.icon as any}
                    size={11}
                    color={isDark ? "#ddd" : "#444"}
                  />
                  <Text style={[styles.categoryText, { color: isDark ? "#ddd" : "#444" }]}>
                    {cat.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 92 : 78,
    left: 16,
    right: 16,
    zIndex: 200,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 14,
  },
  touchable: {
    borderRadius: 20,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: IMAGE_HEIGHT,
  },
  info: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  distanceText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dot: {
    fontSize: 13,
    marginHorizontal: 1,
  },
  endorser: {
    fontSize: 13,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
});
