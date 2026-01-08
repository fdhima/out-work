import { ThemedText } from '@/components/themed-text';
import { BRAND_BLUE, isDark } from '@/constants/theme';
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from '@/hooks/use-theme-color';
import { Place } from '@/services/places';
import { createReview, getReviewsByPlaceId } from '@/services/reviews';
import { MaterialIcons } from '@expo/vector-icons'; // Assuming Expo; use 'react-native-vector-icons' otherwise
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type ReviewFormProps = {
  placeForReview: Place;
}

export function ReviewForm({ placeForReview }: ReviewFormProps) {
  const { session } = useAuth();
  
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const textColor = useThemeColor({}, "text"); //Consider remocing it or placing it into a shared file
  
  
  const submitReview = async () => {
    if (!placeForReview || !session?.user) return;
    const placeId = placeForReview.id;
    setSubmittingReview(true);
    try {
      await createReview({
        comment: reviewText.trim(),
        rating: reviewRating,
        place_id: placeId,
        profile_id: session.user.id,
        created_at: new Date().toISOString(),
      });
      const reviews = await getReviewsByPlaceId(placeId);
      const avg = reviews && reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

      // setSelectedPlace((prev) => (prev ? { ...prev, reviews, rating_avg: avg } : prev));
      // setPlaces((prev) => prev.map((p) => (p.id === placeId ? { ...p, reviews, rating_avg: avg } : p)));

      setReviewText("");
      setReviewRating(5);
      setShowAllReviews(true);
    } catch (err) {
      console.error("Error posting review:", err);
    } finally {
      setSubmittingReview(false);
    }
  };
  
  return (
    <View style={styles.reviewFormCard}>
      <ThemedText style={styles.writeReviewTitle}>
        Write a review
      </ThemedText>
      
      <View style={styles.starSelector}>
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
            <MaterialIcons
              name={s <= reviewRating ? "star" : "star-border"}
              size={28}
              color={BRAND_BLUE}
            />
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        value={reviewText}
        onChangeText={setReviewText}
        placeholder="Share your experience…"
        placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
        multiline
        style={[
          styles.reviewInput,
          {
            color: textColor,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#fff",
            borderColor: isDark ? "transparent" : "#e5e7eb",
            borderWidth: 1
          },
        ]}
      />

      <TouchableOpacity
        activeOpacity={0.85}
        // Pass the rating and text to your submit function
        onPress={() => submitReview}
        disabled={!reviewText.trim() || submittingReview || !session?.user}
        style={[
          styles.submitButton,
          {
            backgroundColor: BRAND_BLUE,
            opacity: !reviewText.trim() || submittingReview || !session?.user ? 0.6 : 1,
          },
        ]}
      >
        {submittingReview ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Post</ThemedText>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  reviewInput: {
    fontSize: 16,
    padding: 12,
    borderRadius: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewFormCard: {
    marginBottom: 32,
    padding: 0,
  },
  writeReviewTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 12,
  },
  starSelector: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
})