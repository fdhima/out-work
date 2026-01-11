import { ThemedText } from "@/components/themed-text";
import { BRAND_BLUE, isDark, MAX_REVIEWS_PREVIEW } from "@/constants/theme";
import { getReviewsByPlaceId, Review } from "@/services/reviews";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { RenderStars } from "./RenderStars";

type ReviewsListProps = {
  // reviews: Review[] | undefined,
  placeId: number
}

export function ReviewsList({
  placeId
}: ReviewsListProps) {

  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const data = await getReviewsByPlaceId(placeId);
        setReviews(data ?? []);
      } catch (err) {
        console.error("Failed to load reviews", err);
        setReviews([]);
      }
    };

    if (placeId) {
      loadReviews();
    }
  }, [placeId]);
  console.log(reviews);

  const visibleReviews = showAllReviews
    ? reviews ?? []
    : (reviews ?? []).slice(0, MAX_REVIEWS_PREVIEW);

  const hasMoreReviews =
    (reviews?.length ?? 0) > MAX_REVIEWS_PREVIEW;

  const averageRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return visibleReviews.length ? (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <MaterialIcons name="star" size={18} color={isDark ? "#fff" : "#000"} />
        <ThemedText style={styles.summaryText}>
          {averageRating} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
        </ThemedText>
      </View>

      {visibleReviews.map((r) => (
        <View key={r.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
              <ThemedText style={[styles.avatarText, { color: isDark ? '#fff' : '#000' }]}>
                {r.full_name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View>
              <ThemedText style={styles.reviewAuthor}>
                {r.full_name}
              </ThemedText>
              <ThemedText style={styles.reviewDate}>
                {r.created_at
                  ? new Date(r.created_at.replace(" ", "T")).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                  : ""}
              </ThemedText>
            </View>
          </View>

          <View style={styles.ratingStars}>
            <RenderStars rating={r.rating} size={12} color={BRAND_BLUE} />
          </View>

          <ThemedText style={styles.reviewText}>
            {r.comment}
          </ThemedText>
        </View>
      ))}

      {hasMoreReviews && (
        <TouchableOpacity
          onPress={() => setShowAllReviews((v) => !v)}
          style={[styles.showMoreButton, { borderColor: isDark ? "#fff" : "#000" }]}
          activeOpacity={0.7}
        >
          <ThemedText style={{ color: isDark ? "#fff" : "#000", fontWeight: "600" }}>
            {showAllReviews ? "Show less" : `Show all ${reviews?.length} reviews`}
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  ) : (
    <ThemedText style={styles.noReviewsText}>
      No reviews yet — be the first ✨
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: '600',
  },
  reviewCard: {
    marginBottom: 32,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  reviewAuthor: {
    fontWeight: '600',
    fontSize: 16,
  },
  reviewDate: {
    fontSize: 14,
    opacity: 0.5,
  },
  ratingStars: {
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  noReviewsText: {
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: 10,
  },
  showMoreButton: {
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'stretch', // Full width button looks better for "Show all" in Airbnb-like lists
    paddingHorizontal: 24,
  },
})