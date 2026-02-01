import { supabase } from "@/lib/supabase";

export interface Review {
  id: number;
  comment: string;
  rating: number;
  place_id: number;
  profile_id: string;
  created_at: string | null;
  updated_at: string | null;
  username: string;
  full_name: string;
}

export interface CreateReviewInput {
  comment: string;
  rating: number;
  place_id: number;
  profile_id: string;
  created_at: string;
}

export interface UpdateReviewInput {
  comment?: string;
  rating?: number;
  updated_at: string;
}

// Get all reviews
export async function getReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*');

  if (error) throw error;
  return data;
}

// Get review by ID
export async function getReviewById(reviewId: number): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .single();
  if (error) throw error;
  return data;
}

// Get reviews by place ID
export async function getReviewsByPlaceId(placeId: number): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      comment,
      rating,
      place_id,
      profile_id,
      created_at,
      profiles (
        username,
        full_name
      )
    `)
    .eq('place_id', placeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return (
    data?.map((r: any) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      return {
        ...r,
        username: profile?.username ?? 'Unknown',
        full_name: profile?.full_name ?? 'Unknown',
      }
    }) ?? []
  )
}

// Get reviews by user ID
export async function getReviewsByUserId(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('profile_id', userId);
  if (error) throw error;
  return data;
}

// Create a new review
export async function createReview(input: CreateReviewInput): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Update an existing review
export async function updateReview(reviewId: number, input: UpdateReviewInput): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update(input)
    .eq('id', reviewId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Delete a review
export async function deleteReview(reviewId: number): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

