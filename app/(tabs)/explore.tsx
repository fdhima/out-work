import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BRAND_BLUE } from "@/constants/theme";
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
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

const FormInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  backgroundColor,
  textColor,
  placeholderColor
}: any) => (
  <View style={styles.inputGroup}>
    <ThemedText style={styles.label}>{label}</ThemedText>
    <TextInput
      style={[
        styles.input,
        multiline && styles.textArea,
        { backgroundColor, color: textColor }
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

export default function CreatePlaceScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapView | null>(null);

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

  const inputBg = colorScheme === 'dark' ? '#1c1c1e' : '#f3f4f6';
  const placeholderColor = colorScheme === 'dark' ? '#636366' : '#9ca3af';

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
      exif: false,
    });

    if (!result.canceled) {
      setImages(result.assets);
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((img) => img.uri !== uri));
  };

  const selectPlace = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission is required to find your position.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setLatitude(latitude);
      setLongitude(longitude);

      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);

    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Could not get your current location.");
    } finally {
      setLocating(false);
    }
  };

  const handleCreatePlace = async () => {
    if (!name || !description || !latitude || !longitude) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const newPlace = await createPlace({
        profile_id: await getUserId() ?? '',
        name,
        description,
        latitude: latitude,
        longitude: longitude,
        rating_avg: rating > 0 ? rating : 5,
        approved: true,
        created_at: new Date().toISOString(),
      });

      for (let i = 0; i < images.length; i++) {
        const url = await uploadImage(images[i].uri, newPlace.id, i);
        await createImage({ url: url, place_id: newPlace.id, created_at: new Date().toISOString() });
      }

      // Create category associations
      for (const categoryId of selectedCategoryIds) {
        await createPlaceCategory({ place_id: newPlace.id, category_id: categoryId });
      }

      Alert.alert("Success", "Place created successfully!");
      // Reset form
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
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: BRAND_BLUE }]}>
              <MaterialIcons name="add-location-alt" size={24} color="#fff" />
            </View>
            <View>
              <ThemedText type="title" style={styles.title}>
                List your space
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Share your perfect work spot with others
              </ThemedText>
            </View>
          </View>

          <View style={styles.formContainer}>

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

            {/* Images Section */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Photos ({images.length}/4)</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
                <TouchableOpacity
                  style={[styles.addPhotoButton, { borderColor: iconColor, backgroundColor: inputBg }]}
                  onPress={pickImages}
                  disabled={images.length >= 4}
                >
                  <MaterialIcons name="add-a-photo" size={24} color={BRAND_BLUE} />
                  <ThemedText style={{ fontSize: 12, marginTop: 4, fontWeight: '600', color: BRAND_BLUE }}>Add Photo</ThemedText>
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

            <View style={styles.mapHeaderRow}>
              <ThemedText style={styles.label}>Location</ThemedText>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={useCurrentLocation}
                disabled={locating}
              >
                <MaterialIcons
                  name={locating ? "sync" : "my-location"}
                  size={16}
                  color={BRAND_BLUE}
                  style={locating ? { transform: [{ rotate: '45deg' }] } : undefined}
                />
                <ThemedText style={styles.locationButtonText}>
                  {locating ? "Locating..." : "Use current position"}
                </ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.mapWrapper}>
              <MapView
                ref={mapRef}
                style={styles.map}
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
              <View style={[styles.mapOverlay, { backgroundColor: latitude ? BRAND_BLUE : 'rgba(0,0,0,0.6)' }]}>
                <ThemedText style={styles.locationText}>
                  {latitude ? "Location Selected ✓" : "Tap map to select location"}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>My Rating</ThemedText>
            <View style={[styles.ratingContainer, { backgroundColor: inputBg }]}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star === rating ? 0 : star)}>
                  <MaterialIcons
                    name={star <= rating ? "star" : "star-border"}
                    size={32}
                    color={star <= rating ? BRAND_BLUE : iconColor}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories Selection */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Categories</ThemedText>
            <View style={styles.categoriesWrapper}>
              {dbCategories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? BRAND_BLUE : inputBg,
                        borderColor: isSelected ? BRAND_BLUE : 'transparent',
                      },
                    ]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <ThemedText
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? "#fff" : textColor },
                      ]}
                    >
                      {cat.name}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </ScrollView>
        <View style={styles.floatingButtonContainer}>
          <BlurView
            intensity={80}
            tint={colorScheme === 'dark' ? "dark" : "light"}
            style={styles.blurButtonContainer}
          >
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: BRAND_BLUE + 'CC' }]} // Add some transparency to the button color itself for better blending
              onPress={handleCreatePlace}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitButtonText}>Publish Listing</ThemedText>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </ThemedView >
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
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 80 : 60,
    paddingBottom: 150, // Extra space for floating tab bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    transform: [{ rotate: '-5deg' }]
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    marginLeft: 4
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
  photosScroll: {
    gap: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  mapWrapper: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  locationText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center'
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
    left: 20,
    right: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden', // Important for BlurView corner clipping
  },
  blurButtonContainer: {
    width: '100%',
    padding: 4, // creates that nice padding inside the glass
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  locationButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND_BLUE,
  },
});
