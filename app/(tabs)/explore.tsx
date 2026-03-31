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
import { WorkingHours, WorkingHoursDay } from "@/utils/workingHours";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
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

// ─── Opening hours helpers ────────────────────────────────────────────────────
const ORDERED_DAYS: Array<{ key: keyof WorkingHours; label: string; fullLabel: string }> = [
  { key: "mon", label: "Mon", fullLabel: "Monday" },
  { key: "tue", label: "Tue", fullLabel: "Tuesday" },
  { key: "wed", label: "Wed", fullLabel: "Wednesday" },
  { key: "thu", label: "Thu", fullLabel: "Thursday" },
  { key: "fri", label: "Fri", fullLabel: "Friday" },
  { key: "sat", label: "Sat", fullLabel: "Saturday" },
  { key: "sun", label: "Sun", fullLabel: "Sunday" },
];

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "22:00";

/** "HH:MM" → Date object (today's date, given hours/minutes) */
function timeStringToDate(t: string): Date {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** Date → "HH:MM" */
function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function TimePill({
  value,
  label,
  onPress,
  isDark,
}: {
  value: string;
  label: string;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        timePillStyle.pill,
        { backgroundColor: isDark ? "#2c2c2e" : "#f3f4f6" },
      ]}
    >
      <Text style={[timePillStyle.label, { color: isDark ? "#8e8e93" : "#6b7280" }]}>
        {label}
      </Text>
      <Text style={[timePillStyle.value, { color: isDark ? "#ffffff" : "#111827" }]}>
        {value}
      </Text>
    </TouchableOpacity>
  );
}
const timePillStyle = StyleSheet.create({
  pill: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 72,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
});

function TimePickerModal({
  visible,
  title,
  value,
  isDark,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  value: string;
  isDark: boolean;
  onConfirm: (v: string) => void;
  onClose: () => void;
}) {
  const [current, setCurrent] = React.useState(() => timeStringToDate(value));
  React.useEffect(() => {
    if (visible) setCurrent(timeStringToDate(value));
  }, [visible, value]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={timeModalStyle.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={[
          timeModalStyle.sheet,
          { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" },
        ]}
      >
        {/* Handle */}
        <View
          style={[
            timeModalStyle.handle,
            { backgroundColor: isDark ? "#48484a" : "#d1d1d6" },
          ]}
        />

        {/* Header */}
        <View style={timeModalStyle.header}>
          <TouchableOpacity onPress={onClose} style={timeModalStyle.headerBtn}>
            <Text style={[timeModalStyle.headerBtnText, { color: isDark ? "#636366" : "#8e8e93" }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[timeModalStyle.headerTitle, { color: isDark ? "#ffffff" : "#111827" }]}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={() => { onConfirm(dateToTimeString(current)); onClose(); }}
            style={timeModalStyle.headerBtn}
          >
            <Text style={[timeModalStyle.headerBtnText, { color: BRAND_BLUE, fontWeight: "700" }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Native drum-roll wheel */}
        <DateTimePicker
          value={current}
          mode="time"
          display="spinner"
          is24Hour
          onChange={(_, date) => { if (date) setCurrent(date); }}
          style={timeModalStyle.picker}
          themeVariant={isDark ? "dark" : "light"}
        />
      </View>
    </Modal>
  );
}
const timeModalStyle = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  headerBtnText: {
    fontSize: 16,
  },
  picker: {
    height: 200,
  },
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

// ─── Mascot guide ────────────────────────────────────────────────────────────
const MASCOT     = require("@/assets/images/mascot.png");
const MASCOT_SAD = require("@/assets/images/mascot-sad.png");

const STEP_MESSAGES: Array<{ main: string; sub: string }> = [
  { main: "Pin your spot on the map!",        sub: "Tap anywhere to mark its location" },
  { main: "What's this place called?",         sub: "Add a name and some photos to start" },
  { main: "Tell the story of this place!",     sub: "What makes it perfect for working?" },
  { main: "How's the vibe here?",              sub: "Rate the experience for the community" },
  { main: "When can people visit?",            sub: "Toggle days open and set the times" },
  { main: "Almost done — tag this place!",     sub: "What kind of spot is it?" },
];

function MascotGuide({
  stepIndex,
  isDark,
  hasError = false,
}: {
  stepIndex: number;
  isDark: boolean;
  hasError?: boolean;
}) {
  const scale = useSharedValue(0.88);
  const opacity = useSharedValue(0);
  const floatY = useSharedValue(0);

  React.useEffect(() => {
    scale.value = 0.88;
    opacity.value = 0;
    scale.value = withSpring(1, { damping: 13, stiffness: 200, mass: 0.7 });
    opacity.value = withTiming(1, { duration: 220 });
  }, [stepIndex]);

  React.useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const avatarFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const msg = STEP_MESSAGES[stepIndex] ?? STEP_MESSAGES[0];
  const bubbleBg = isDark ? "#2c2c2e" : "#f3f4f6";
  const borderCol = isDark ? "#3a3a3c" : "#e5e7eb";

  return (
    <Animated.View style={[mascotStyles.row, animStyle]}>
      <Animated.Image source={hasError ? MASCOT_SAD : MASCOT} style={[mascotStyles.avatar, avatarFloatStyle]} />
      <View style={[mascotStyles.bubble, { backgroundColor: bubbleBg, borderColor: borderCol }]}>
        {/* Speech-bubble tail (border + fill layers) */}
        <View style={[mascotStyles.tailBorder, { borderRightColor: borderCol }]} />
        <View style={[mascotStyles.tailFill,   { borderRightColor: bubbleBg }]} />
        <ThemedText style={mascotStyles.mainText}>{msg.main}</ThemedText>
        <ThemedText style={mascotStyles.subText}>{msg.sub}</ThemedText>
      </View>
    </Animated.View>
  );
}

const mascotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  bubble: {
    flex: 1,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tailBorder: {
    position: "absolute",
    left: -11,
    top: 16,
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderRightWidth: 11,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  tailFill: {
    position: "absolute",
    left: -9,
    top: 17,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  mainText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subText: {
    fontSize: 13,
    opacity: 0.55,
    marginTop: 3,
  },
});

// ─── Publishing overlay ───────────────────────────────────────────────────────
const PUBLISH_MSGS = [
  "Uploading photos…",
  "Saving your location…",
  "Publishing your spot…",
  "Almost there…",
];

function PublishingOverlay({ isDark }: { isDark: boolean }) {
  const floatY = useSharedValue(0);
  const msgOpacity = useSharedValue(1);
  const [msgIndex, setMsgIndex] = React.useState(0);

  React.useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 750, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,  { duration: 750, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    const interval = setInterval(() => {
      msgOpacity.value = withSequence(
        withTiming(0, { duration: 180, easing: Easing.in(Easing.ease) }),
        withTiming(1, { duration: 280, easing: Easing.out(Easing.ease) })
      );
      setTimeout(() => setMsgIndex((i) => (i + 1) % PUBLISH_MSGS.length), 180);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));
  const msgStyle = useAnimatedStyle(() => ({ opacity: msgOpacity.value }));

  return (
    <View style={[StyleSheet.absoluteFill, publishStyles.overlay]}>
      <BlurView
        intensity={55}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />

      <Animated.Image
        source={require("@/assets/images/mascot-working.png")}
        style={[publishStyles.mascot, mascotStyle]}
      />

      {/* Cycling message */}
      <Animated.Text
        style={[publishStyles.msg, { color: isDark ? "#ffffff" : "#111827" }, msgStyle]}
      >
        {PUBLISH_MSGS[msgIndex]}
      </Animated.Text>
      <Text style={[publishStyles.sub, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)" }]}>
        Sharing your spot with the world
      </Text>
    </View>
  );
}

const publishStyles = StyleSheet.create({
  overlay: {
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  mascot: {
    width: 140,
    height: 140,
  },
  msg: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 14,
    marginTop: -16,
  },
});

// ─── Success overlay ─────────────────────────────────────────────────────────
function SuccessOverlay({ isDark, onDone }: { isDark: boolean; onDone: () => void }) {
  const scale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(16);

  React.useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Single under-damped spring — naturally overshoots and bounces back
    scale.value = withSpring(1, { damping: 7, stiffness: 160, mass: 0.5 });
    // Content fades + rises after the emoji pop settles
    contentOpacity.value = withDelay(300, withTiming(1, { duration: 320 }));
    contentY.value = withDelay(300, withSpring(0, { damping: 18, stiffness: 160 }));
  }, []);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, successStyles.overlay]}>
      <BlurView
        intensity={60}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <Animated.Image
        source={require("@/assets/images/mascot-celebration.png")}
        style={[successStyles.mascot, emojiStyle]}
      />
      <Animated.View style={[successStyles.content, contentStyle]}>
        <ThemedText style={successStyles.title}>Place Published!</ThemedText>
        <ThemedText style={successStyles.sub}>Your spot is now live for everyone</ThemedText>
        <TouchableOpacity
          style={[successStyles.btn, { backgroundColor: BRAND_BLUE }]}
          onPress={onDone}
          activeOpacity={0.85}
        >
          <Text style={successStyles.btnText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const successStyles = StyleSheet.create({
  overlay: {
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  mascot: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  content: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 15,
    opacity: 0.55,
  },
  btn: {
    marginTop: 16,
    paddingHorizontal: 44,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
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
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [timePicker, setTimePicker] = useState<{
    key: keyof WorkingHours;
    field: keyof WorkingHoursDay;
    value: string;
    title: string;
  } | null>(null);
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
  const slideX = useSharedValue(0);

  const stepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

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
    slideX.value = SCREEN_WIDTH;
    slideX.value = withSpring(0, SPRING);
    setCurrentStep((s) => Math.min(s + 1, 5));
  }, [currentStep, name]);

  const goBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    slideX.value = -SCREEN_WIDTH;
    slideX.value = withSpring(0, SPRING);
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

  // ── Working hours ─────────────────────────────────────────────────────────
  const toggleDay = (key: keyof WorkingHours) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWorkingHours((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { open: DEFAULT_OPEN, close: DEFAULT_CLOSE } };
    });
  };

  const updateDayTime = (
    key: keyof WorkingHours,
    field: keyof WorkingHoursDay,
    value: string
  ) => {
    setWorkingHours((prev) => ({
      ...prev,
      [key]: { ...prev[key]!, [field]: value },
    }));
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
        working_hours: Object.keys(workingHours).length > 0 ? workingHours : null,
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
    setWorkingHours({});
    setSelectedCategoryIds([]);
    setNameError(null);
    setFormError(null);
    setShowSuccess(false);
    slideX.value = -SCREEN_WIDTH;
    slideX.value = withSpring(0, SPRING);
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
              <View style={[styles.mapHeaderCard, { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" }]}>
                <MascotGuide stepIndex={0} isDark={isDark} hasError={!!formError} />
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
                {[1, 2, 3, 4, 5].map((s) => (
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
                    <MascotGuide stepIndex={1} isDark={isDark} hasError={!!formError || !!nameError} />

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
                    <MascotGuide stepIndex={2} isDark={isDark} hasError={!!formError} />

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
                    <MascotGuide stepIndex={3} isDark={isDark} hasError={!!formError} />

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

                {/* ── Step 4: Opening hours ────────────────────────────── */}
                {currentStep === 4 && (
                  <>
                    <MascotGuide stepIndex={4} isDark={isDark} hasError={!!formError} />

                    {ORDERED_DAYS.map(({ key, label, fullLabel }) => {
                      const day = workingHours[key];
                      const isOpen = day !== undefined;
                      return (
                        <View
                          key={key}
                          style={[
                            styles.dayRow,
                            { backgroundColor: inputBg, borderColor: inputBorder },
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.dayToggleArea}
                            onPress={() => toggleDay(key)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.dayToggle,
                                {
                                  backgroundColor: isOpen
                                    ? BRAND_BLUE
                                    : isDark
                                    ? "rgba(255,255,255,0.12)"
                                    : "#e5e7eb",
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.dayToggleThumb,
                                  { transform: [{ translateX: isOpen ? 18 : 2 }] },
                                ]}
                              />
                            </View>
                            <ThemedText
                              style={[
                                styles.dayLabel,
                                { fontWeight: isOpen ? "600" : "400", opacity: isOpen ? 1 : 0.5 },
                              ]}
                            >
                              {label}
                            </ThemedText>
                          </TouchableOpacity>

                          {isOpen && (
                            <View style={styles.dayTimes}>
                              <TimePill
                                value={day.open}
                                label="Open"
                                isDark={isDark}
                                onPress={() =>
                                  setTimePicker({ key, field: "open", value: day.open, title: `${fullLabel} · Opens` })
                                }
                              />
                              <ThemedText style={styles.dayDash}>–</ThemedText>
                              <TimePill
                                value={day.close}
                                label="Close"
                                isDark={isDark}
                                onPress={() =>
                                  setTimePicker({ key, field: "close", value: day.close, title: `${fullLabel} · Closes` })
                                }
                              />
                            </View>
                          )}
                        </View>
                      );
                    })}

                    {timePicker && (
                      <TimePickerModal
                        visible
                        title={timePicker.title}
                        value={timePicker.value}
                        isDark={isDark}
                        onConfirm={(v) => updateDayTime(timePicker.key, timePicker.field, v)}
                        onClose={() => setTimePicker(null)}
                      />
                    )}
                  </>
                )}

                {/* ── Step 5: Categories ────────────────────────────────── */}
                {currentStep === 5 && (
                  <>
                    <MascotGuide stepIndex={5} isDark={isDark} hasError={!!formError} />

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

            {/* Arrow continue button (steps 1–4) */}
            {currentStep < 5 && (
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

      {/* ── Publishing overlay ───────────────────────────────────────────────── */}
      {loading && <PublishingOverlay isDark={isDark} />}

      {/* ── Success overlay ───────────────────────────────────────────────── */}
      {showSuccess && <SuccessOverlay isDark={isDark} onDone={resetForm} />}
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
  mapHeaderCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    alignSelf: "center",
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
  // ── Opening hours ──
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  dayToggleArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dayToggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
  },
  dayToggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  dayLabel: {
    fontSize: 15,
  },
  dayTimes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dayDash: {
    fontSize: 15,
    opacity: 0.4,
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
    fontSize: 72,
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
