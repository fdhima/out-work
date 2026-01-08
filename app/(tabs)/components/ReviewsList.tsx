import { ThemedText } from "@/components/themed-text";
import { isDark, MAX_REVIEWS_PREVIEW } from "@/constants/theme";
import { Review } from "@/services/reviews";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type ReviewsListProps = {
  reviews: Review[] | undefined,
}

export function ReviewsList({
  reviews
}: ReviewsListProps) {
  const [showAllReviews, setShowAllReviews] = useState(false);

  const visibleReviews = showAllReviews
    ? reviews ?? []
    : (reviews ?? []).slice(0, MAX_REVIEWS_PREVIEW);

  const hasMoreReviews =
    (reviews?.length ?? 0) > MAX_REVIEWS_PREVIEW;
  
  
  return visibleReviews.length ? (
    <>
      {visibleReviews.map((r) => (
        <View key={r.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.avatarPlaceholder}>
              <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>{r.full_name.charAt(0)}</ThemedText>
            </View>
            <View>
              <ThemedText style={styles.reviewAuthor}>
                {r.full_name}
              </ThemedText>
              <ThemedText style={styles.reviewDate}>
                {/* {new Date(r.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} */}
                {"08/01/26"}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.reviewText}>
            {r.comment}
          </ThemedText>
        </View>
      ))}

      {hasMoreReviews && (
        <TouchableOpacity
          onPress={() => setShowAllReviews((v) => !v)}
          style={styles.showMoreButton}
          activeOpacity={0.7}
        >
          <ThemedText style={{ color: isDark ? "#fff" : "#000", fontWeight: "600", textDecorationLine: 'underline' }}>
            {showAllReviews ? "Show less" : `Show all ${reviews?.length} reviews`}
          </ThemedText>
        </TouchableOpacity>
      )}
    </>
  ) : (
    <ThemedText style={styles.noReviewsText}>
      No reviews yet — be the first ✨
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  reviewCard: {
    marginBottom: 32,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reviewAuthor: {
    fontWeight: '600',
    fontSize: 16,
  },
  reviewDate: {
    fontSize: 14,
    opacity: 0.5,
  },
  reviewText: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  noReviewsText: {
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: 10,
  },
    avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreButton: {
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    // On Darkmode this needs to handle border color manually in inline style
  },
})