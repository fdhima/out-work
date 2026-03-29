import { ThemedText } from "@/components/themed-text";
import { formatRelativeTime } from "@/lib/date";
import { BRAND_BLUE, isDark, MAX_REVIEWS_PREVIEW } from "@/constants/theme";
import { deleteReview, getReviewsByPlaceId, Review, updateReview } from "@/services/reviews";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RenderStars } from "./RenderStars";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";

function SubRatingPill({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={pillStyles.pill}>
      <Text style={pillStyles.pillEmoji}>{icon}</Text>
      <ThemedText style={pillStyles.label}>{label}</ThemedText>
      <View style={pillStyles.segments}>
        {Array.from({ length: 4 }, (_, i) => (
          <View
            key={i}
            style={[
              pillStyles.segment,
              { backgroundColor: i < value ? color : isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const pillStyles = {
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  pillEmoji: {
    fontSize: 11,
  },
  label: {
    fontSize: 11,
    opacity: 0.6,
  },
  segments: {
    flexDirection: 'row' as const,
    gap: 2,
  },
  segment: {
    width: 14,
    height: 5,
    borderRadius: 3,
  },
};

function EditSubRatingRow({
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
    <View style={editSubStyles.row}>
      <View style={editSubStyles.labelGroup}>
        {icon}
        <ThemedText style={editSubStyles.label}>{label}</ThemedText>
      </View>
      <View style={editSubStyles.segments}>
        {Array.from({ length: 4 }, (_, i) => {
          const level = i + 1;
          const filled = value !== null && level <= value;
          return (
            <TouchableOpacity
              key={level}
              onPress={() => onChange(level)}
              activeOpacity={0.7}
              style={[
                editSubStyles.segment,
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

const editSubStyles = StyleSheet.create({
  emoji: {
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  segments: {
    flexDirection: "row",
    gap: 4,
  },
  segment: {
    width: 28,
    height: 22,
    borderRadius: 6,
  },
});

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
  const [editRating, setEditRating] = useState(0);
  const [editWifiSpeed, setEditWifiSpeed] = useState<number | null>(null);
  const [editNoiseLevel, setEditNoiseLevel] = useState<number | null>(null);
  const [editSeatComfort, setEditSeatComfort] = useState<number | null>(null);
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
    setEditWifiSpeed(review.wifi_speed);
    setEditNoiseLevel(review.noise_level);
    setEditSeatComfort(review.seat_comfort);
  };

  const handleSaveEdit = async () => {
    if (!editingReview || editRating === 0) return;
    setSavingEdit(true);
    try {
      await updateReview(editingReview.id, {
        comment: editComment.trim(),
        rating: editRating,
        wifi_speed: editWifiSpeed,
        noise_level: editNoiseLevel,
        seat_comfort: editSeatComfort,
        updated_at: new Date().toISOString(),
      });
      const updated = reviews.map((r) =>
        r.id === editingReview.id
          ? {
              ...r,
              comment: editComment.trim(),
              rating: editRating,
              wifi_speed: editWifiSpeed,
              noise_level: editNoiseLevel,
              seat_comfort: editSeatComfort,
            }
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

              {(r.wifi_speed || r.noise_level || r.seat_comfort) ? (
                <View style={styles.subRatings}>
                  {r.wifi_speed ? <SubRatingPill icon="🛜" label="WiFi" value={r.wifi_speed} color={BRAND_BLUE} /> : null}
                  {r.noise_level ? <SubRatingPill icon="🔇" label="Noise" value={r.noise_level} color="#ef4444" /> : null}
                  {r.seat_comfort ? <SubRatingPill icon="🪑" label="Seats" value={r.seat_comfort} color="#22c55e" /> : null}
                </View>
              ) : null}

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
        animationType="slide"
        onRequestClose={() => setEditingReview(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1c1c1e" : "#fff" }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditingReview(null)} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={isDark ? "#fff" : "#000"} />
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>Edit Review</ThemedText>
              <View style={{ width: 22 }} />
            </View>

            {/* Overall Experience */}
            <ThemedText style={styles.modalSectionLabel}>Overall Experience</ThemedText>
            <View style={styles.modalStarRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setEditRating(s)} activeOpacity={0.7}>
                  <MaterialIcons
                    name={s <= editRating ? "star" : "star-border"}
                    size={36}
                    color={s <= editRating ? "#f59e0b" : isDark ? "#555" : "#d1d5db"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Sub-ratings */}
            <View style={[styles.modalSubCard, { backgroundColor: isDark ? "#2c2c2e" : "#f9fafb", borderColor: isDark ? "#3a3a3c" : "#e5e7eb" }]}>
              <EditSubRatingRow
                icon={<Text style={editSubStyles.emoji}>🛜</Text>}
                label="WiFi Speed"
                value={editWifiSpeed}
                onChange={setEditWifiSpeed}
                isDark={isDark}
              />
              <View style={[styles.modalDivider, { backgroundColor: isDark ? "#3a3a3c" : "#e5e7eb" }]} />
              <EditSubRatingRow
                icon={<Text style={editSubStyles.emoji}>🔇</Text>}
                label="Noise Level"
                value={editNoiseLevel}
                onChange={setEditNoiseLevel}
                isDark={isDark}
              />
              <View style={[styles.modalDivider, { backgroundColor: isDark ? "#3a3a3c" : "#e5e7eb" }]} />
              <EditSubRatingRow
                icon={<Text style={editSubStyles.emoji}>🪑</Text>}
                label="Seat Comfort"
                value={editSeatComfort}
                onChange={setEditSeatComfort}
                isDark={isDark}
              />
            </View>

            {/* Comment */}
            <TextInput
              value={editComment}
              onChangeText={setEditComment}
              placeholder="Share your experience…"
              placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
              multiline
              style={[
                styles.editInput,
                {
                  color: textColor,
                  backgroundColor: isDark ? "#2c2c2e" : "#f9fafb",
                  borderColor: isDark ? "#3a3a3c" : "#e5e7eb",
                },
              ]}
            />

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={editRating === 0 || savingEdit}
              style={[styles.saveButton, { opacity: editRating === 0 || savingEdit ? 0.5 : 1 }]}
            >
              {savingEdit ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save Review</ThemedText>
              )}
            </TouchableOpacity>
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
  subRatings: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
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
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  modalStarRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalSubCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  modalDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  editInput: {
    marginHorizontal: 20,
    marginBottom: 16,
    fontSize: 15,
    padding: 12,
    borderRadius: 12,
    height: 96,
    textAlignVertical: "top",
    borderWidth: 1,
  },
  saveButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_BLUE,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
