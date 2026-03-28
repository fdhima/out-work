import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BRAND_BLUE, CATEGORIES } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getCategories } from "@/services/categories";
import { createImage, uploadImage } from "@/services/images";
import { createPlace } from "@/services/places";
import { createPlaceCategory } from "@/services/places_categories";
import { getUserId } from "@/services/users";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

// ─── Sheet snap constants (mirrors AirbnbBottomSheet) ────────────────────────
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 85 : 70;
const HEADER_HEIGHT = Platform.OS === "ios" ? 120 : 100;
const SHEET_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT;
const SNAP_FULL = HEADER_HEIGHT;
const SNAP_HALF = SCREEN_HEIGHT * 0.48;
const SNAP_COLLAPSED = SCREEN_HEIGHT - TAB_BAR_HEIGHT - 100;
const SPRING = { damping: 22, stiffness: 180, mass: 0.8 };

function nearestSnap(y: number): number {
  "worklet";
  const snaps = [SNAP_FULL, SNAP_HALF, SNAP_COLLAPSED];
  return snaps.reduce((best, curr) =>
    Math.abs(curr - y) < Math.abs(best - y) ? curr : best
  );
}

// ─── Reusable form input ──────────────────────────────────────────────────────
const FormInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  backgroundColor,
  textColor,
  placeholderColor,
}: any) => (
  <View style={styles.inputGroup}>
    <ThemedText style={styles.label}>{label}</ThemedText>
    <TextInput
      style={[
        styles.input,
        multiline && styles.textArea,
        { backgroundColor, color: textColor },
      ]}
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
    />
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CreatePlaceScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [dbCategories, setDbCategories] = useState<
    { id: number; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapView | null>(null);

  // ── Sheet animation ───────────────────────────────────────────────────────
  const translateY = useSharedValue(SNAP_HALF);
  const savedY = useSharedValue(SNAP_HALF);
  // true when the sheet is not fully expanded (map is at least partially visible)
  const [mapVisible, setMapVisible] = useState(true);
  // true only when the sheet is fully collapsed (FAB visible)
  const [sheetCollapsed, setSheetCollapsed] = useState(false);

  const onSnap = useCallback((snapY: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMapVisible(snapY !== SNAP_FULL);
    setSheetCollapsed(snapY === SNAP_COLLAPSED);
  }, []);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = savedY.value + e.translationY;
      translateY.value = Math.max(SNAP_FULL, Math.min(SNAP_COLLAPSED, next));
    })
    .onEnd((e) => {
      const vel = e.velocityY;
      const cur = translateY.value;
      let snapY: number;
      if (vel > 600) {
        snapY = cur < SNAP_HALF ? SNAP_HALF : SNAP_COLLAPSED;
      } else if (vel < -600) {
        snapY = cur > SNAP_HALF ? SNAP_HALF : SNAP_FULL;
      } else {
        snapY = nearestSnap(cur);
      }
      translateY.value = withSpring(snapY, SPRING);
      runOnJS(onSnap)(snapY);
    });

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // ── Categories ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setDbCategories(cats);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((catId) => catId !== id) : [...prev, id]
    );
  };

  const inputBg = isDark ? "#1c1c1e" : "#f3f4f6";
  const placeholderColor = isDark ? "#636366" : "#9ca3af";

  // ── Image picker ──────────────────────────────────────────────────────────
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
      exif: false,
    });
    if (!result.canceled) setImages(result.assets);
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((img) => img.uri !== uri));
  };

  // ── Map location ──────────────────────────────────────────────────────────
  const selectPlace = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to find your position."
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      setLatitude(latitude);
      setLongitude(longitude);
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 },
        1000
      );
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Could not get your current location.");
    } finally {
      setLocating(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreatePlace = async () => {
    if (!name || !description || !latitude || !longitude) {
      Alert.alert("Error", "Please fill in all fields and select a location on the map.");
      return;
    }

    setLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        Alert.alert("Error", "You must be logged in to create a place.");
        setLoading(false);
        return;
      }

      const newPlace = await createPlace({
        profile_id: userId,
        name,
        description,
        latitude,
        longitude,
        rating_avg: rating > 0 ? rating : 5,
        approved: true,
        created_at: new Date().toISOString(),
      });

      for (let i = 0; i < images.length; i++) {
        const url = await uploadImage(images[i].uri, newPlace.id, i);
        await createImage({
          url,
          place_id: newPlace.id,
          profile_id: userId,
          created_at: new Date().toISOString(),
        });
      }

      for (const categoryId of selectedCategoryIds) {
        await createPlaceCategory({ place_id: newPlace.id, category_id: categoryId });
      }

      Alert.alert("Success", "Place created successfully!");
      setName("");
      setDescription("");
      setLatitude(null);
      setLongitude(null);
      setRating(0);
      setImages([]);
      setSelectedCategoryIds([]);
    } catch (error: any) {
      console.error(error);
      if (error?.code === "23505") {
        Alert.alert(
          "Place Already Exists",
          "A place with this name already exists. Go and check it out!"
        );
      } else {
        Alert.alert("Error", error.message || "Failed to create place");
      }
    } finally {
      setLoading(false);
    }
  };

  const bgColor = isDark ? "#1c1c1e" : "#ffffff";
  const handleColor = isDark ? "#48484a" : "#d1d1d6";

  return (
    <ThemedView style={styles.root}>

      {/* ── Fullscreen map — location picker ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 37.9838,
          longitude: 23.7275,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={selectPlace}
      >
        {latitude !== null && longitude !== null && (
          <Marker coordinate={{ latitude, longitude }}>
            <View style={[styles.mapMarker, { backgroundColor: BRAND_BLUE }]}>
              <MaterialIcons name="location-on" size={20} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── Floating header ── */}
      <View style={styles.headerOverlay} pointerEvents="box-none">
        <View
          style={[
            styles.headerPillWrapper,
            {
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          <BlurView
            intensity={60}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.headerBlur,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.8)",
              },
            ]}
          >
            <View style={[styles.headerIcon, { backgroundColor: BRAND_BLUE }]}>
              <MaterialIcons name="add-location-alt" size={20} color="#fff" />
            </View>
            <View style={styles.headerTextWrap}>
              <ThemedText style={styles.headerTitle}>List your spot</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                Tap the map to set location
              </ThemedText>
            </View>
          </BlurView>
        </View>
      </View>

      {/* ── Re-center / use-my-location FAB — only when sheet is collapsed ── */}
      {sheetCollapsed && <TouchableOpacity
        style={[styles.locationFab, { backgroundColor: isDark ? "#2c2c2e" : "#fff" }]}
        onPress={useCurrentLocation}
        disabled={locating}
        activeOpacity={0.85}
      >
        <MaterialIcons
          name={locating ? "sync" : "my-location"}
          size={22}
          color={isDark ? "#fff" : "#111"}
        />
      </TouchableOpacity>}

      {/* ── Location status pill — only shown when the map is visible ── */}
      {latitude !== null && mapVisible && (
        <View style={styles.locationStatusWrap} pointerEvents="none">
          <BlurView
            intensity={70}
            tint={isDark ? "dark" : "light"}
            style={styles.locationStatusBlur}
          >
            <MaterialIcons name="check-circle" size={14} color={BRAND_BLUE} />
            <ThemedText style={styles.locationStatusText}>
              Location selected · tap to change
            </ThemedText>
          </BlurView>
        </View>
      )}

      {/* ── Draggable bottom sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          { height: SHEET_HEIGHT, backgroundColor: bgColor },
          sheetAnimStyle,
        ]}
      >
        {/* Handle bar — only gesture target */}
        <GestureDetector gesture={gesture}>
          <View style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
          </View>
        </GestureDetector>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <FormInput
              label="Name your place"
              placeholder="e.g. Cozy Corner Cafe"
              value={name}
              onChangeText={setName}
              backgroundColor={inputBg}
              textColor={textColor}
              placeholderColor={placeholderColor}
            />

            <FormInput
              label="Description"
              placeholder="What makes this spot great for working?"
              value={description}
              onChangeText={setDescription}
              multiline
              backgroundColor={inputBg}
              textColor={textColor}
              placeholderColor={placeholderColor}
            />

            {/* Photos */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>
                Photos ({images.length}/4)
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.addPhotoButton,
                    { borderColor: iconColor, backgroundColor: inputBg },
                  ]}
                  onPress={pickImages}
                  disabled={images.length >= 4}
                >
                  <MaterialIcons name="add-a-photo" size={24} color={BRAND_BLUE} />
                  <ThemedText
                    style={{ fontSize: 12, marginTop: 4, fontWeight: "600", color: BRAND_BLUE }}
                  >
                    Add Photo
                  </ThemedText>
                </TouchableOpacity>
                {images.map((img) => (
                  <View key={img.uri} style={styles.photoContainer}>
                    <Image source={{ uri: img.uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removeImage(img.uri)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="close" size={14} color="#000" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Rating */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>My Rating</ThemedText>
              <View style={[styles.ratingContainer, { backgroundColor: inputBg }]}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star === rating ? 0 : star)}
                  >
                    <MaterialIcons
                      name={star <= rating ? "star" : "star-border"}
                      size={32}
                      color={star <= rating ? BRAND_BLUE : iconColor}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Categories */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Categories</ThemedText>
              <View style={styles.categoriesWrapper}>
                {dbCategories.map((cat) => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  const meta = CATEGORIES.find((c) => c.id === cat.name);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? "#ffffff" : "#1c1c1e")
                            : inputBg,
                          borderColor: isSelected
                            ? (isDark ? "#ffffff" : "#1c1c1e")
                            : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                        },
                      ]}
                      onPress={() => toggleCategory(cat.id)}
                      activeOpacity={0.75}
                    >
                      {meta && (
                        <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                      )}
                      <ThemedText
                        style={[
                          styles.categoryChipText,
                          {
                            color: isSelected ? (isDark ? "#1c1c1e" : "#ffffff") : textColor,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {meta?.label ?? cat.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: BRAND_BLUE }]}
              onPress={handleCreatePlace}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitButtonText}>
                  Publish Listing
                </ThemedText>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* ── Full-screen loading overlay ── */}
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <BlurView
            intensity={40}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={BRAND_BLUE} />
            <ThemedText type="title" style={styles.loadingText}>
              Publishing...
            </ThemedText>
            <ThemedText style={styles.loadingSubtext}>
              Sharing your spot with the world
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Floating header ──
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === "android" ? 40 : 60,
    paddingBottom: 0,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  headerPillWrapper: {
    borderRadius: 50,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  headerBlur: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 1,
  },

  // ── Location FAB (mirrors recenterBtn in index.tsx) ──
  locationFab: {
    position: "absolute",
    right: 16,
    bottom: Platform.OS === "ios" ? SNAP_HALF + 20 : SNAP_HALF,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 200,
  },

  // ── Location status pill ──
  locationStatusWrap: {
    position: "absolute",
    bottom: SNAP_HALF + 12,
    alignSelf: "center",
    zIndex: 200,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  locationStatusBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  locationStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Map marker ──
  mapMarker: {
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  // ── Bottom sheet ──
  sheet: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 50,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: TAB_BAR_HEIGHT + 40,
    gap: 20,
  },

  // ── Form inputs ──
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
    marginLeft: 4,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },

  // ── Photos ──
  photosScroll: {
    gap: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  removePhotoButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  // ── Rating ──
  ratingContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    justifyContent: "center",
  },

  // ── Categories ──
  categoriesWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryChipText: {
    fontSize: 14,
  },

  // ── Submit button ──
  submitButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // ── Loading overlay ──
  loadingOverlay: {
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  loadingText: {
    fontWeight: "bold",
  },
  loadingSubtext: {
    opacity: 0.7,
    fontSize: 14,
  },
});
