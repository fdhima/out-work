import { ThemedText } from "@/components/themed-text";
import FullscreenGallery from "@/components/ui/fullscreen-gallery";
import { BRAND_BLUE, isDark } from "@/constants/theme";
import { getCategoryNameById } from "@/services/categories";
import { Place } from "@/services/places";
import { getPlaceCategoriesIds } from "@/services/places_categories";
import { Review } from "@/services/reviews";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import ImageCarousel from "./ImageCarousel";
import { RenderStars } from "./RenderStars";
import { ReviewForm } from "./ReviewForm";
import { ReviewsList } from "./ReviewsList";

type PlaceDetailedProps = {
  selectedPlace: PlaceImagesReviews;
  onClose: () => void;
}

type PlaceImagesReviews = Place & { images: { url: string }[]; reviews?: Review[] };

export function PlaceDetailed({
  selectedPlace,
  onClose
}: PlaceDetailedProps) {
  if (!selectedPlace) return null;
  console.log(`PlaceDetailed component with pros: ${JSON.stringify(selectedPlace)} ${onClose}`);
  useEffect(() => {
    const fetchPlaceCategories = async () => {
      try {
        const ids = await getPlaceCategoriesIds(selectedPlace.id);

        const categoryNames = await Promise.all(
          ids.map((id) => getCategoryNameById(id))
        );

        setPlaceCategories(categoryNames);
      } catch (err) {
        console.error("Error fetching place categories:", err);
      }
    };
    fetchPlaceCategories();
  }, [selectedPlace.id]);


  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const [placeCategories, setPlaceCategories] = useState<string[]>([]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.detailContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Detailed View Header */}
        <View style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={onClose}
          >
            <MaterialIcons name="arrow-back" size={20} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}>
          <View style={[styles.circleButton, { gap: 15, width: 'auto', paddingHorizontal: 12 }]}>
            <MaterialIcons name="share" size={20} color="#000" />
            <MaterialIcons name="favorite-border" size={20} color="#000" />
          </View>
        </View>

        <ImageCarousel
          images={selectedPlace.images?.length > 0 ? selectedPlace.images.map(img => img.url) : [`https://picsum.photos/400/250?random=${selectedPlace.id}`]}
          height={350}
          onPress={(i) => {
            setGalleryImages(selectedPlace.images?.length > 0 ? selectedPlace.images.map(img => img.url) : [`https://picsum.photos/400/250?random=${selectedPlace.id}`]);
            setGalleryIndex(i);
            setGalleryVisible(true);
          }}
        />

        <View style={styles.detailContent}>
          <ThemedText type="title" style={styles.detailTitle}>
            {selectedPlace.name}
          </ThemedText>
          <View style={styles.detailRatingRow}>
            {
              <RenderStars
                rating={selectedPlace.rating_avg}
                size={14}
                color={BRAND_BLUE}
              />
            }
            <ThemedText style={{ fontSize: 14, opacity: 0.6 }}> • {selectedPlace.reviews?.length || 0} reviews</ThemedText>
          </View>

          <ThemedText style={styles.detailDescription}>
            {selectedPlace.description}
          </ThemedText>

          {/* Meta Info */}
          <View
            style={[
              styles.detailMeta,
              {
                borderTopColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
              },
            ]}
          >
            {/* <View style={styles.metaRow}>
              <MaterialIcons name="place" size={24} color={BRAND_BLUE} />
              <View>
                <ThemedText style={{ fontWeight: '600' }}>
                  Location
                </ThemedText>
                <ThemedText style={{ fontSize: 14, opacity: 0.7 }}>
                  {selectedPlace.latitude.toFixed(4)}, {selectedPlace.longitude.toFixed(4)}
                </ThemedText>
              </View>
            </View> */}

            <View style={styles.metaRow}>
              <MaterialIcons name="workspace-premium" size={24} color={BRAND_BLUE} />
              <View>
                <ThemedText style={{ fontWeight: '600' }}>Top features</ThemedText>
                <ThemedText style={{ fontSize: 14, opacity: 0.7 }}>
                  {placeCategories
                    .map(name =>
                      name
                        .replace(/_/g, " ") // replace underscores with space
                        .split(" ")
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")
                    )
                    .join(" • ")}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Reviews */}
          <View style={styles.reviewsContainer}>
            <ThemedText type="title" style={styles.sectionTitle}>
              Reviews
            </ThemedText>

            {/* Review Form */}
            <ReviewForm
              placeForReview={selectedPlace}
            />

            {/* Reviews List */}
            <ReviewsList
              placeId={selectedPlace.id}
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.stickyBottomBar, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
        <View>
          <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>Free</ThemedText>
          <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>No reservation required</ThemedText>
        </View>
        <TouchableOpacity style={[styles.reserveButton, { backgroundColor: BRAND_BLUE }]}>
          <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Directions</ThemedText>
        </TouchableOpacity>
      </View>

      <FullscreenGallery
        visible={galleryVisible}
        images={galleryImages}
        initialIndex={galleryIndex}
        onRequestClose={() => setGalleryVisible(false)}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  detailContainer: {
    paddingBottom: 120, // space for sticky bar
  },
  circleButton: {
    flexDirection: 'row',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailContent: {
    padding: 24,
  },
  detailTitle: {
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 0,
  },
  detailRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    gap: 4
  },
  detailDescription: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    marginTop: 16,
  },
  detailMeta: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    gap: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  reviewsContainer: {
    marginTop: 32,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reserveButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
})