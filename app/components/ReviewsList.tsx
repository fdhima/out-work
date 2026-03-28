import { ThemedText } from "@/components/themed-text";
import { formatRelativeTime } from "@/lib/date";
import { BRAND_BLUE, isDark, MAX_REVIEWS_PREVIEW } from "@/constants/theme";
import { deleteReview, getReviewsByPlaceId, Review, updateReview } from "@/services/reviews";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RenderStars } from "./RenderStars";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";

type ReviewsListProps = {
  placeId: number;
  refreshTrigger?: number;
}

export function ReviewsList({
  placeId,
  refreshTrigger = 0,
}: ReviewsListProps) {
  const { session } = useAuth();
  const currentUserId = session?.user?.id;
  const textColor = useThemeColor({}, "text");

  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Edit modal state
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [savingEdit, setSavingEdit] = useState(false);

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
  }, [placeId, refreshTrigger]);

  const visibleReviews = showAllReviews
    ? reviews ?? []
    : (reviews ?? []).slice(0, MAX_REVIEWS_PREVIEW);

  const hasMoreReviews = (reviews?.length ?? 0) > MAX_REVIEWS_PREVIEW;

  const averageRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const handleDeleteReview = (review: Review) => {
    Alert.alert(
      "Delete review",
      "Are you sure you want to delete this review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReview(review.id);
              setReviews(reviews.filter((r) => r.id !== review.id));
            } catch (err) {
              console.error("Failed to delete review", err);
              Alert.alert("Error", "Could not delete review. Please try again.");
            }
          },
        },
      ]
    );
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review);
    setEditComment(review.comment);
    setEditRating(review.rating);
  };

  const handleSaveEdit = async () => {
    if (!editingReview || !editComment.trim()) return;
    setSavingEdit(true);
    try {
      await updateReview(editingReview.id, {
        comment: editComment.trim(),
        rating: editRating,
        updated_at: new Date().toISOString(),
      });
      const updated = reviews.map((r) =>
        r.id === editingReview.id
          ? { ...r, comment: editComment.trim(), rating: editRating }
          : r
      );
      setReviews(updated);
      setEditingReview(null);
    } catch (err) {
      console.error("Failed to update review", err);
      Alert.alert("Error", "Could not update review. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <>
      {visibleReviews.length ? (
        <View style={styles.container}>
          <View style={styles.summaryContainer}>
            <MaterialIcons name="star" size={18} color={isDark ? "#fff" : "#000"} />
            <ThemedText style={styles.summaryText}>
              {averageRating} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </ThemedText>
          </View>

          {visibleReviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? "#333" : "#f0f0f0" }]}>
                  <ThemedText style={[styles.avatarText, { color: isDark ? "#fff" : "#000" }]}>
                    {r.full_name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.reviewHeaderInfo}>
                  <ThemedText style={styles.reviewAuthor}>{r.full_name}</ThemedText>
                  <ThemedText style={styles.reviewDate}>
                    {formatRelativeTime(r.created_at)}
                  </ThemedText>
                </View>
                {currentUserId && r.profile_id === currentUserId && (
                  <View style={styles.ownerActions}>
                    <TouchableOpacity onPress={() => openEditModal(r)} hitSlop={8}>
                      <MaterialIcons name="edit" size={18} color={BRAND_BLUE} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteReview(r)} hitSlop={8}>
                      <MaterialIcons name="delete-outline" size={18} color={isDark ? "#ef4444" : "#dc2626"} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.ratingStars}>
                <RenderStars rating={r.rating} size={12} color={BRAND_BLUE} />
              </View>

              <ThemedText style={styles.reviewText}>{r.comment}</ThemedText>
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
      )}

      {/* Edit Review Modal */}
      <Modal
        visible={!!editingReview}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingReview(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            <ThemedText style={styles.modalTitle}>Edit review</ThemedText>

            <View style={styles.starSelector}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setEditRating(s)}>
                  <MaterialIcons
                    name={s <= editRating ? "star" : "star-border"}
                    size={28}
                    color={BRAND_BLUE}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={editComment}
              onChangeText={setEditComment}
              placeholder="Share your experience…"
              placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
              multiline
              style={[
                styles.editInput,
                {
                  color: textColor,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f9fafb",
                  borderColor: isDark ? "transparent" : "#e5e7eb",
                },
              ]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setEditingReview(null)}
                style={[styles.modalButton, styles.cancelButton, { borderColor: isDark ? "#555" : "#e5e7eb" }]}
              >
                <ThemedText style={{ fontWeight: "600" }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={!editComment.trim() || savingEdit}
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { opacity: !editComment.trim() || savingEdit ? 0.6 : 1 },
                ]}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Save</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  summaryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: "600",
  },
  reviewCard: {
    marginBottom: 32,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
  },
  reviewAuthor: {
    fontWeight: "600",
    fontSize: 16,
  },
  reviewDate: {
    fontSize: 14,
    opacity: 0.5,
  },
  ownerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
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
    fontStyle: "italic",
    marginTop: 10,
  },
  showMoreButton: {
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    alignSelf: "stretch",
    paddingHorizontal: 24,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  starSelector: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 16,
  },
  editInput: {
    fontSize: 16,
    padding: 12,
    borderRadius: 12,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 20,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: BRAND_BLUE,
  },
});
