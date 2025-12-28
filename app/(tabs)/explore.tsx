import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { createImage, uploadImage } from "@/services/images";
import { createPlace } from "@/services/places";
import { getUserId } from "@/services/users";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
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

export default function CreatePlaceScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");
  const backgroundColor = useThemeColor({}, "background");

  // WorkSpot Theme
  const primaryColor = "#ff6b35";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [loading, setLoading] = useState(false);

  const inputBg = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6';

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
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
      });

      for (let i = 0; i < images.length; i++) {
        const url = await uploadImage(images[i].uri, newPlace.id, i);
        await createImage({ url: url, place_id: newPlace.id });
      }
      Alert.alert("Success", "Place created successfully!");
      // Reset form
      setName("");
      setDescription("");
      setLatitude(null);
      setLongitude(null);
      setRating(0);
      setImages([]);
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
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              List your space
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Share your perfect work spot with others
            </ThemedText>
          </View>

          <View style={styles.formContainer}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Name your place</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBg, color: textColor }
                ]}
                placeholder="e.g. Cozy Corner Cafe"
                placeholderTextColor={iconColor}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Description</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: inputBg, color: textColor }
                ]}
                placeholder="What makes this spot great for working?"
                placeholderTextColor={iconColor}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Images Section */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Photos ({images.length}/4)</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
                <TouchableOpacity
                  style={[styles.addPhotoButton, { borderColor: iconColor }]}
                  onPress={pickImages}
                  disabled={images.length >= 4}
                >
                  <MaterialIcons name="add-a-photo" size={28} color={primaryColor} />
                  <ThemedText style={{ fontSize: 12, marginTop: 4, fontWeight: '500' }}>Add Photo</ThemedText>
                </TouchableOpacity>

                {images.map((img) => (
                  <View key={img.uri} style={styles.photoContainer}>
                    <Image source={{ uri: img.uri }} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removeImage(img.uri)}
                    >
                      <MaterialIcons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Map Selection */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Location</ThemedText>
              <View style={styles.mapWrapper}>
                <MapView
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
                      <View style={[styles.mapMarker, { backgroundColor: primaryColor }]}>
                        <MaterialIcons name="location-on" size={20} color="#fff" />
                      </View>
                    </Marker>
                  )}
                </MapView>
                <View style={styles.mapOverlay}>
                  {latitude ? (
                    <ThemedText style={styles.locationText}>
                      Location selected ✓
                    </ThemedText>
                  ) : (
                    <ThemedText style={styles.locationText}>
                      Tap to select location
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>

            {/* Rating */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Initial Rating</ThemedText>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star === rating ? 0 : star)}>
                    <MaterialIcons
                      name={star <= rating ? "star" : "star-border"}
                      size={32}
                      color={star <= rating ? primaryColor : iconColor}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: primaryColor }]}
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

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
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
    paddingTop: Platform.OS === 'android' ? 40 : 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
  },
  textArea: {
    minHeight: 120,
  },
  photosScroll: {
    gap: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 2,
  },
  mapWrapper: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    padding: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    alignItems: 'center',
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  submitButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: "#ff6b35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
