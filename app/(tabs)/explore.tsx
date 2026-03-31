import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BRAND_BLUE, CATEGORIES } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getCategories } from "@/services/categories";
import { createImage, uploadImage } from "@/services/images";
import { createPlace, deletePlace, placeNameExists } from "@/services/places";
import { createPlaceCategory } from "@/services/places_categories";
import { createReview } from "@/services/reviews";
import { getUserId } from "@/services/users";
import { pickImages as pickImagesFromLibrary } from "@/lib/imagePicker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import Svg, { Path } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 85 : 70;
const SPRING = { damping: 22, stiffness: 180, mass: 0.8 };
const SUB_RATING_LEVELS = 4;

// ─── Sub-rating row ───────────────────────────────────────────────────────────
function SubRatingRow({
  icon,
  label,
  value,
  onChange,
  isDark,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  isDark: boolean;
}) {
  return (
    <View style={sub.row}>
      <View style={sub.labelGroup}>
        {icon}
        <ThemedText style={sub.label}>{label}</ThemedText>
      </View>
      <View style={sub.segments}>
        {Array.from({ length: SUB_RATING_LEVELS }, (_, i) => {
          const level = i + 1;
          const filled = value !== null && level <= value;
          return (
            <TouchableOpacity
              key={level}
              onPress={() => onChange(level)}
              activeOpacity={0.7}
              style={[
                sub.segment,
                {
                  backgroundColor: filled
                    ? BRAND_BLUE
                    : isDark
                    ? "rgba(255,255,255,0.12)"
                    : "#e5e7eb",
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const sub = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  labelGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 14, fontWeight: "500" },
  segments: { flexDirection: "row", gap: 4 },
  segment: { width: 28, height: 22, borderRadius: 6 },
});

// ─── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View style={banner.wrap}>
      <MaterialIcons name="error-outline" size={18} color="#fff" style={{ marginTop: 1 }} />
      <Text style={banner.text} numberOfLines={3}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </View>
  );
}

const banner = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#c0392b",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginBottom: 4,
  },
  text: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CreatePlaceScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const textColor = useThemeColor({}, "text");

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [wifiSpeed, setWifiSpeed] = useState<number | null>(null);
  const [noiseLevel, setNoiseLevel] = useState<number | null>(null);
  const [seatComfort, setSeatComfort] = useState<number | null>(null);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const mapRef = useRef<MapView | null>(null);

  // ── Step state & animation ────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const dirRef = useRef<"forward" | "back">("forward");
  const isFirstMount = useRef(true);
  const slideX = useSharedValue(0);

  const stepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  useLayoutEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    slideX.value = dirRef.current === "forward" ? SCREEN_WIDTH : -SCREEN_WIDTH;
    slideX.value = withSpring(0, SPRING);
  }, [currentStep]);

  const goForward = useCallback(async () => {
    if (currentStep === 1) {
      const exists = await placeNameExists(name);
      if (exists) {
        setNameError("A place with this name already exists. Try a more specific name.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      setNameError(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dirRef.current = "forward";
    setCurrentStep((s) => Math.min(s + 1, 4));
  }, [currentStep, name]);

  const goBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dirRef.current = "back";
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  // ── Can advance check ─────────────────────────────────────────────────────
  const canAdvance = useMemo(() => {
    if (currentStep === 0) return latitude !== null;
    if (currentStep === 1) return name.trim().length > 0 && images.length > 0;
    if (currentStep === 2) return description.trim().length > 0;
    return true;
  }, [currentStep, latitude, name, description, images]);

  // ── Categories ────────────────────────────────────────────────────────────
  useEffect(() => {
    getCategories().then(setDbCategories).catch(console.error);
  }, []);

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // ── Images ────────────────────────────────────────────────────────────────
  const pickImages = async () => {
    const assets = await pickImagesFromLibrary({ multiple: true, limit: 8, quality: 0.8 });
    if (assets.length > 0) setImages(assets);
  };

  const removeImage = (uri: string) =>
    setImages((prev) => prev.filter((img) => img.uri !== uri));

  // ── Location ──────────────────────────────────────────────────────────────
  const selectPlace = (event: any) => {
    const { latitude: lat, longitude: lng } = event.nativeEvent.coordinate;
    setLatitude(lat);
    setLongitude(lng);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setFormError("Location permission is required to pin your spot.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      mapRef.current?.animateToRegion(
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        1000
      );
    } catch {
      setFormError("Could not get your current location. Try again.");
    } finally {
      setLocating(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreatePlace = async () => {
    if (!name || !description || !latitude || !longitude) {
      setFormError("Please fill in all fields and select a location.");
      return;
    }
    setFormError(null);
    setLoading(true);
    let createdPlaceId: number | null = null;
    try {
      const userId = await getUserId();
      if (!userId) {
        setFormError("You must be logged in to publish a place.");
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
      createdPlaceId = newPlace.id;

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

      if (
        rating > 0 ||
        wifiSpeed !== null ||
        noiseLevel !== null ||
        seatComfort !== null
      ) {
        await createReview({
          comment: "",
          rating: rating > 0 ? rating : 5,
          wifi_speed: wifiSpeed,
          noise_level: noiseLevel,
          seat_comfort: seatComfort,
          place_id: newPlace.id,
          profile_id: userId,
          created_at: new Date().toISOString(),
        });
      }

      setShowSuccess(true);
    } catch (error: any) {
      if (createdPlaceId !== null) {
        try { await deletePlace(createdPlaceId); } catch { /* best-effort rollback */ }
      }
      if (error?.code === "23505") {
        setFormError("A place with this name already exists. Try a more specific name.");
      } else {
        setFormError(error.message || "Failed to publish place. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setLatitude(null);
    setLongitude(null);
    setRating(0);
    setWifiSpeed(null);
    setNoiseLevel(null);
    setSeatComfort(null);
    setImages([]);
    setSelectedCategoryIds([]);
    setNameError(null);
    setFormError(null);
    setShowSuccess(false);
    dirRef.current = "back";
    setCurrentStep(0);
  };

  const bgColor = isDark ? "#1c1c1e" : "#ffffff";
  const inputBg = isDark ? "#2c2c2e" : "#f9fafb";
  const inputBorder = isDark ? "#3a3a3c" : "#e5e7eb";
  const placeholderColor = isDark ? "#6b7280" : "#9ca3af";

  return (
    <ThemedView style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, stepStyle]}>
        {/* ── Step 0: Location picker ─────────────────────────────────────── */}
        {currentStep === 0 && (
          <View style={styles.root}>
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

            {/* Floating heading + status pill */}
            <View style={styles.mapHeaderWrap} pointerEvents="none">
              <View
                style={[
                  styles.mapHeaderBlur,
                  { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" },
                ]}
              >
                <ThemedText style={styles.mapHeading}>Pick a location</ThemedText>
                <ThemedText style={styles.mapSubheading}>
                  Tap the map to pin your spot
                </ThemedText>
              </View>

              {latitude !== null && (
                <View style={styles.mapPillWrap}>
                  <View
                    style={[
                      styles.mapPillBlur,
                      { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" },
                    ]}
                  >
                    <MaterialIcons name="check-circle" size={14} color={BRAND_BLUE} />
                    <ThemedText style={styles.mapPillText}>
                      Location pinned · tap to adjust
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>

            {/* Use my location FAB */}
            <TouchableOpacity
              style={[
                styles.locationFab,
                { backgroundColor: isDark ? "#2c2c2e" : "#fff" },
              ]}
              onPress={useCurrentLocation}
              disabled={locating}
              activeOpacity={0.85}
            >
              {locating ? (
                <ActivityIndicator size="small" color={isDark ? "#fff" : "#111"} />
              ) : (
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={isDark ? "#fff" : "#111"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </Svg>
              )}
            </TouchableOpacity>

            {/* Location error banner */}
            {formError && currentStep === 0 && (
              <View style={styles.mapErrorWrap} pointerEvents="box-none">
                <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
              </View>
            )}

            {/* Arrow continue button */}
            <View style={styles.arrowBtnArea} pointerEvents="box-none">
              <TouchableOpacity
                style={[
                  styles.arrowBtn,
                  {
                    backgroundColor: canAdvance
                      ? BRAND_BLUE
                      : isDark
                      ? "#3a3a3c"
                      : "#d1d5db",
                  },
                ]}
                onPress={canAdvance ? goForward : undefined}
                activeOpacity={0.85}
              >
                <MaterialIcons name="arrow-forward" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Steps 1–4: Form steps ───────────────────────────────────────── */}
        {currentStep > 0 && (
          <View style={[styles.root, { backgroundColor: bgColor }]}>
            {/* Top nav: back button + step dots */}
            <View style={styles.stepNav}>
              <TouchableOpacity
                onPress={goBack}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={22} color={textColor} />
              </TouchableOpacity>

              <View style={styles.stepDots}>
                {[1, 2, 3, 4].map((s) => (
                  <View
                    key={s}
                    style={[
                      styles.stepDot,
                      s === currentStep
                        ? [styles.stepDotActive, { backgroundColor: BRAND_BLUE }]
                        : {
                            backgroundColor:
                              s < currentStep
                                ? BRAND_BLUE
                                : isDark
                                ? "#3a3a3c"
                                : "#e5e7eb",
                            opacity: s < currentStep ? 0.45 : 1,
                          },
                    ]}
                  />
                ))}
              </View>

              <View style={{ width: 36 }} />
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.keyboardView}
            >
              <ScrollView
                contentContainerStyle={styles.stepContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* ── Step 1: Name + Photos ─────────────────────────────── */}
                {currentStep === 1 && (
                  <>
                    <View style={styles.questionBlock}>
                      <ThemedText style={styles.questionText}>
                        What's it called?
                      </ThemedText>
                      <ThemedText style={styles.questionSub}>
                        Give your spot a name
                      </ThemedText>
                    </View>

                    <TextInput
                      style={[
                        styles.mainInput,
                        {
                          backgroundColor: inputBg,
                          color: textColor,
                          borderColor: nameError ? "#c0392b" : inputBorder,
                        },
                      ]}
                      placeholder="e.g. Cozy Corner Cafe"
                      placeholderTextColor={placeholderColor}
                      value={name}
                      onChangeText={(v) => { setName(v); setNameError(null); }}
                      returnKeyType="done"
                      autoFocus
                    />

                    {nameError && (
                      <View style={styles.fieldErrorWrap}>
                        <MaterialIcons name="error-outline" size={14} color="#c0392b" />
                        <Text style={styles.fieldErrorText}>{nameError}</Text>
                      </View>
                    )}

                    <View style={styles.photosSection}>
                      <ThemedText style={styles.sectionLabel}>
                        PHOTOS{" "}
                        <ThemedText style={[styles.sectionLabel, { opacity: 0.4 }]}>
                          ({images.length}/8)
                        </ThemedText>
                      </ThemedText>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.photosRow}
                      >
                        <TouchableOpacity
                          style={[
                            styles.addPhotoBtn,
                            { borderColor: inputBorder, backgroundColor: inputBg },
                          ]}
                          onPress={pickImages}
                          disabled={images.length >= 8}
                        >
                          <MaterialIcons name="add-a-photo" size={24} color={BRAND_BLUE} />
                          <ThemedText
                            style={{
                              fontSize: 11,
                              marginTop: 4,
                              color: BRAND_BLUE,
                              fontWeight: "600",
                            }}
                          >
                            Add Photos
                          </ThemedText>
                        </TouchableOpacity>
                        {images.map((img) => (
                          <View key={img.uri} style={styles.photoItem}>
                            <Image source={{ uri: img.uri }} style={styles.photoThumb} />
                            <TouchableOpacity
                              style={styles.removePhoto}
                              onPress={() => removeImage(img.uri)}
                            >
                              <MaterialIcons name="close" size={12} color="#000" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </>
                )}

                {/* ── Step 2: Description ───────────────────────────────── */}
                {currentStep === 2 && (
                  <>
                    <View style={styles.questionBlock}>
                      <ThemedText style={styles.questionText}>
                        Describe this spot
                      </ThemedText>
                      <ThemedText style={styles.questionSub}>
                        What makes it great for working?
                      </ThemedText>
                    </View>

                    <TextInput
                      style={[
                        styles.mainInput,
                        styles.mainTextArea,
                        {
                          backgroundColor: inputBg,
                          color: textColor,
                          borderColor: inputBorder,
                        },
                      ]}
                      placeholder="Fast wifi, cozy atmosphere, great coffee…"
                      placeholderTextColor={placeholderColor}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      textAlignVertical="top"
                      autoFocus
                    />
                  </>
                )}

                {/* ── Step 3: Rating ────────────────────────────────────── */}
                {currentStep === 3 && (
                  <>
                    <View style={styles.questionBlock}>
                      <ThemedText style={styles.questionText}>
                        How would you rate it?
                      </ThemedText>
                      <ThemedText style={styles.questionSub}>
                        Overall and detailed ratings
                      </ThemedText>
                    </View>

                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setRating(star === rating ? 0 : star);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.starEmoji}>
                            {star <= rating ? "⭐️" : "☆"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View
                      style={[
                        styles.subRatingsCard,
                        { backgroundColor: inputBg, borderColor: inputBorder },
                      ]}
                    >
                      <SubRatingRow
                        icon={<Text style={styles.ratingEmoji}>🛜</Text>}
                        label="WiFi Speed"
                        value={wifiSpeed}
                        onChange={setWifiSpeed}
                        isDark={isDark}
                      />
                      <View
                        style={[styles.subDivider, { backgroundColor: inputBorder }]}
                      />
                      <SubRatingRow
                        icon={<Text style={styles.ratingEmoji}>🔇</Text>}
                        label="Noise Level"
                        value={noiseLevel}
                        onChange={setNoiseLevel}
                        isDark={isDark}
                      />
                      <View
                        style={[styles.subDivider, { backgroundColor: inputBorder }]}
                      />
                      <SubRatingRow
                        icon={<Text style={styles.ratingEmoji}>🪑</Text>}
                        label="Seat Comfort"
                        value={seatComfort}
                        onChange={setSeatComfort}
                        isDark={isDark}
                      />
                    </View>
                  </>
                )}

                {/* ── Step 4: Categories ────────────────────────────────── */}
                {currentStep === 4 && (
                  <>
                    <View style={styles.questionBlock}>
                      <ThemedText style={styles.questionText}>
                        What kind of place is it?
                      </ThemedText>
                      <ThemedText style={styles.questionSub}>
                        Select all that apply
                      </ThemedText>
                    </View>

                    <View style={styles.categoriesWrap}>
                      {dbCategories.map((cat) => {
                        const isSelected = selectedCategoryIds.includes(cat.id);
                        const meta = CATEGORIES.find((c) => c.id === cat.name);
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.catChip,
                              {
                                backgroundColor: isSelected
                                  ? isDark
                                    ? "#fff"
                                    : "#1c1c1e"
                                  : inputBg,
                                borderColor: isSelected
                                  ? isDark
                                    ? "#fff"
                                    : "#1c1c1e"
                                  : inputBorder,
                              },
                            ]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              toggleCategory(cat.id);
                            }}
                            activeOpacity={0.75}
                          >
                            {meta && <Text style={{ fontSize: 18 }}>{meta.icon}</Text>}
                            <ThemedText
                              style={[
                                styles.catChipText,
                                {
                                  color: isSelected
                                    ? isDark
                                      ? "#1c1c1e"
                                      : "#fff"
                                    : textColor,
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

                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        { backgroundColor: BRAND_BLUE, opacity: loading ? 0.6 : 1 },
                      ]}
                      onPress={handleCreatePlace}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <ThemedText style={styles.submitBtnText}>
                          Publish Listing
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </KeyboardAvoidingView>

            {/* Form-level error banner (steps 1–4) */}
            {formError && currentStep > 0 && (
              <View style={styles.formErrorArea} pointerEvents="box-none">
                <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
              </View>
            )}

            {/* Arrow continue button (steps 1–3) */}
            {currentStep < 4 && (
              <View style={styles.arrowBtnArea} pointerEvents="box-none">
                <TouchableOpacity
                  style={[
                    styles.arrowBtn,
                    {
                      backgroundColor: canAdvance
                        ? BRAND_BLUE
                        : isDark
                        ? "#3a3a3c"
                        : "#d1d5db",
                    },
                  ]}
                  onPress={canAdvance ? goForward : undefined}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="arrow-forward" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </Animated.View>

      {/* ── Full-screen loading overlay ───────────────────────────────────── */}
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <BlurView
            intensity={40}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <ActivityIndicator size="large" color={BRAND_BLUE} />
          <ThemedText style={styles.loadingTitle}>Publishing…</ThemedText>
          <ThemedText style={styles.loadingSub}>
            Sharing your spot with the world
          </ThemedText>
        </View>
      )}

      {/* ── Success overlay ───────────────────────────────────────────────── */}
      {showSuccess && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <BlurView
            intensity={60}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.successIcon, { backgroundColor: isDark ? "#2c2c2e" : "#f0fdf4" }]}>
            <MaterialIcons name="check-circle" size={52} color="#22c55e" />
          </View>
          <ThemedText style={styles.loadingTitle}>Place Published!</ThemedText>
          <ThemedText style={styles.loadingSub}>Your spot is now live for everyone</ThemedText>
          <TouchableOpacity
            style={[styles.successBtn, { backgroundColor: BRAND_BLUE }]}
            onPress={resetForm}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Map step ──
  mapHeaderWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === "android" ? 44 : 64,
    paddingHorizontal: 20,
  },
  mapHeaderBlur: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    overflow: "hidden",
  },
  mapHeading: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  mapSubheading: {
    fontSize: 14,
    opacity: 0.55,
    marginTop: 3,
  },
  locationFab: {
    position: "absolute",
    right: 16,
    bottom: Platform.OS === "ios" ? 320 : 300,
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
    zIndex: 20,
  },
  mapBottomArea: {
    position: "absolute",
    bottom: TAB_BAR_HEIGHT + 24,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  mapPillWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
    alignSelf: "flex-start",
  },
  mapPillBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  mapPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  mapMarker: {
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  // ── Form steps ──
  stepNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 44 : 64,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotActive: {
    width: 20,
    height: 8,
    borderRadius: 4,
  },
  keyboardView: { flex: 1 },
  stepContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: TAB_BAR_HEIGHT + 100,
    gap: 24,
  },
  questionBlock: {
    gap: 6,
    marginBottom: 4,
  },
  questionText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  questionSub: {
    fontSize: 15,
    opacity: 0.5,
  },
  mainInput: {
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  mainTextArea: {
    minHeight: 140,
    paddingTop: 15,
  },

  // ── Photos ──
  photosSection: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.5,
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  photosRow: { gap: 10 },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  photoItem: {
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  photoThumb: { width: "100%", height: "100%" },
  removePhoto: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 3,
  },

  // ── Stars ──
  starsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  starEmoji: {
    fontSize: 38,
  },

  // ── Sub-ratings ──
  subRatingsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  subDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  ratingEmoji: { fontSize: 15 },

  // ── Categories ──
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  catChipText: { fontSize: 14 },

  // ── Arrow continue button ──
  arrowBtnArea: {
    position: "absolute",
    bottom: TAB_BAR_HEIGHT + 24,
    right: 24,
    zIndex: 30,
  },
  arrowBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Submit (step 4) ──
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Loading overlay ──
  loadingOverlay: {
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  loadingSub: {
    opacity: 0.6,
    fontSize: 14,
  },

  // ── Success overlay extras ──
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successBtn: {
    marginTop: 8,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
  },

  // ── Field error ──
  fieldErrorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -16,
  },
  fieldErrorText: {
    fontSize: 13,
    color: "#c0392b",
    flex: 1,
  },

  // ── Map error banner position ──
  mapErrorWrap: {
    position: "absolute",
    bottom: TAB_BAR_HEIGHT + 100,
    left: 0,
    right: 0,
    zIndex: 25,
  },

  // ── Form error banner position ──
  formErrorArea: {
    position: "absolute",
    bottom: TAB_BAR_HEIGHT + 100,
    left: 0,
    right: 0,
    zIndex: 25,
  },
});
