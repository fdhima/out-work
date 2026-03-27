import { supabase } from "@/lib/supabase";
import { WorkingHours } from "@/utils/workingHours";

export interface Place {
  id: number;
  profile_id: string,
  name: string;
  description: string;
  rating_avg: number;
  latitude: number;
  longitude: number;
  approved: boolean;
  working_hours: WorkingHours | null;
  created_at: string | null;
  updated_at: string | null;
}

export type PlaceEnhanced = Place & {
  images: { url: string }[];
  reviews?: any[];
  profiles?: { full_name: string };
  places_categories?: { categories: { name: string } | null }[];
};

export interface CreatePlaceInput {
  profile_id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  rating_avg: number; // to be calculated later in code
  approved: boolean
  created_at: string
}

export interface UpdatePlaceInput {
  name?: string;
  description?: string;
  rating_avg?: number;
  latitude?: number;
  longitude?: number;
  approved?: boolean;
  updated_at: string
}

// Get all places
export async function getPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('*');
  if (error) throw error;
  return data;
}

// Get approved places only
export async function getApprovedPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('approved', true);
  if (error) throw error;
  return data;
}

// Get place by ID
export async function getPlaceById(placeId: number): Promise<Place | null> {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('id', placeId)
    .single();
  if (error) throw error;
  return data;
}

// Create a new place
export async function createPlace(input: CreatePlaceInput): Promise<Place> {
  const { data, error } = await supabase
    .from('places')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Update an existing place
export async function updatePlace(placeId: number, input: UpdatePlaceInput): Promise<Place> {
  const { data, error } = await supabase
    .from('places')
    .update(input)
    .eq('id', placeId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Delete a place
export async function deletePlace(placeId: number): Promise<Place> {
  const { data, error } = await supabase
    .from('places')
    .delete()
    .eq('id', placeId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Approve a place
export async function approvePlace(placeId: number): Promise<Place> {
  const { data, error } = await supabase
    .from('places')
    .update({ approved: true })
    .eq('id', placeId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getPlaceImages(placeId: number) {
  const { data, error } = await supabase
    .from("images")
    .select("id, url")
    .eq("place_id", placeId);
  if (error) throw error;
  return data;
}

// API to grab all the places, irrespectively if category or query filtering has been applied
export async function getPlacesEnhanced(categoryId?: number | null, query?: string): Promise<PlaceEnhanced[]> {
  let request = supabase
    .from('places')
    .select(`
      *,
      images(*),
      places_categories(categories(name)),
      profiles(full_name)
    `);

  // Logic: Only apply category filter if categoryId is provided and not "all"
  if (categoryId) {
    request = request
      .select(`
        *,
        images(*),
        places_categories!inner(categories(name)),
        profiles(full_name)
      `)
      .eq("places_categories.category_id", categoryId);
  }

  // Logic: Only apply search if query has text
  if (query && query.trim().length > 0) {
    request = request.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await request;

  if (error) {
    console.error('Error fetching places:', error);
    throw error;
  }
  console.log(`fetched places: ${JSON.stringify(data)}`);
  return data;
}

export async function getPlaceEnhancedById(placeId: number): Promise<PlaceEnhanced | null> {
  const { data, error } = await supabase
    .from('places')
    .select(`
      *,
      images(*),
      places_categories(categories(name)),
      profiles(full_name)
    `)
    .eq('id', placeId)
    .single();

  if (error) {
    console.error('Error fetching place by id:', error);
    return null;
  }
  return data;
}

export async function getPlacesEnhancedByIds(ids: number[]): Promise<PlaceEnhanced[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('places')
    .select(`
      *,
      images(*),
      places_categories(categories(name)),
      profiles(full_name)
    `)
    .in('id', ids);
  if (error) {
    console.error('Error fetching places by ids:', error);
    throw error;
  }
  return data;
}

/** Fetch up to `limit` approved places excluding `excludeId` for the "Similar places" row. */
export async function getSimilarPlaces(excludeId: number, limit = 6): Promise<PlaceEnhanced[]> {
  const { data, error } = await supabase
    .from('places')
    .select(`
      *,
      images(*),
      places_categories(categories(name)),
      profiles(full_name)
    `)
    .eq('approved', true)
    .neq('id', excludeId)
    .order('rating_avg', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching similar places:', error);
    return [];
  }
  return data ?? [];
}