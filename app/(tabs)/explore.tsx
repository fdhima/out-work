import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { createPlace } from "@/services/places";
import { getUserId } from "@/services/users";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function CreatePlace() {
  const colorScheme = useColorScheme() ?? "light";
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const iconColor = useThemeColor({}, "icon");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const inputBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6'
  const cardBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)'

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
  };


  const handleCreatePlace = async () => {
    // Basic validation
    if (!name || !description || !latitude || !longitude) {
      Alert.alert("Error", "Please fill in all fields");
      console.log(name, description, latitude, longitude, await getUserId())
      return;
    }

    setLoading(true);

    try {
      const newPlace = await createPlace({
        user_id: await getUserId() ?? '',
        name,
        description,
        latitude: latitude,
        longitude: longitude,
        rating_avg: rating > 0 ? rating : 5, // Use user rating if selected, otherwise default to 5
        approved: true,
      });

      Alert.alert("Success", "Place created successfully!");
      // Reset form
      setName("");
      setDescription("");
      setLatitude(null);
      setLongitude(null);
      setRating(0);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to create place");
    } finally {
      setLoading(false);
    }

  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <ThemedText type="title" style={styles.title}>
              Create Place
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Add a new place to explore
            </ThemedText>

            <Input
              label="Name"
              placeholder="Enter place name"
              value={name}
              onChangeText={setName}
              textColor={textColor}
              iconColor={iconColor}
              backgroundColor={inputBg}
            />

            <Input
              label="Description"
              placeholder="Enter description"
              value={description}
              onChangeText={setDescription}
              multiline
              textColor={textColor}
              iconColor={iconColor}
              backgroundColor={inputBg}
              style={styles.multilineInput}
            />

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Select Location</ThemedText>
              <View
                style={[
                  styles.mapContainer,
                  {
                    borderColor:
                      colorScheme === "dark"
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.1)",
                  },
                ]}
              >
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: 37.9838,
                    longitude: 23.7275,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                  onPress={handleMapPress}
                >
                  {latitude !== null && longitude !== null && (
                    <Marker coordinate={{ latitude, longitude }} />
                  )}
                </MapView>
              </View>
              {latitude !== null && longitude !== null ? (
                <ThemedText style={styles.mapHint}>
                  Location selected: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </ThemedText>
              ) : (
                <ThemedText style={styles.mapHint}>
                  Tap on the map to select a location
                </ThemedText>
              )}
            </View>

            <StarRating
              label="Rating (optional)"
              value={rating}
              onValueChange={setRating}
              tintColor={tintColor}
              iconColor={iconColor}
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    colorScheme === 'dark'
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(255, 255, 255, 0.95)',
                },
              ]}
              onPress={handleCreatePlace}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText
                  lightColor="#fff"
                  darkColor="#fff"
                  style={styles.primaryButtonText}
                >
                  Create Place
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

interface InputProps {
  label: string;
  textColor: string;
  iconColor: string;
  backgroundColor: string;
  style?: any;
  [key: string]: any;
}

function Input({
  label,
  textColor,
  iconColor,
  backgroundColor,
  style,
  ...props
}: InputProps) {
  return (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        {...props}
        style={[
          styles.input,
          {
            backgroundColor,
            color: textColor,
            borderColor:
              backgroundColor === "rgba(255, 255, 255, 0.1)"
                ? "rgba(255, 255, 255, 0.2)"
                : "transparent",
          },
          style,
        ]}
        placeholderTextColor={iconColor}
      />
    </View>
  );
}

interface StarRatingProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  tintColor: string;
  iconColor: string;
}

function StarRating({
  label,
  value,
  onValueChange,
  tintColor,
  iconColor,
}: StarRatingProps) {
  const handleStarPress = (starIndex: number) => {
    // If clicking the same star that's already selected, unselect (set to 0)
    if (value === starIndex) {
      onValueChange(0);
    } else {
      onValueChange(starIndex);
    }
  };

  return (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((starIndex) => (
          <TouchableOpacity
            key={starIndex}
            onPress={() => handleStarPress(starIndex)}
            activeOpacity={0.7}
            style={styles.starButton}
          >
            <MaterialIcons
              name={starIndex <= value ? "star" : "star-border"}
              size={40}
              color={starIndex <= value ? tintColor : iconColor}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 60,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    gap: 8,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
    fontSize: 32,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 32,
    opacity: 0.7,
    fontSize: 16,
    fontWeight: "400",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "600",
    opacity: 0.9,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 52,
    borderWidth: 1,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 8,
  },
  map: {
    width: "100%",
    height: 250,
  },
  mapHint: {
    fontSize: 13,
    opacity: 0.6,
    fontStyle: "italic",
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    // shadowColor: "#0a7ea4",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  primaryButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  starContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
});