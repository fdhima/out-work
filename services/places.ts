import { supabase } from "@/lib/supabase";

export interface Place {
  id: number;
  user_id: string,
  name: string;
  description: string;
  rating_avg: number;
  latitude: number;
  longitude: number;
  approved: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreatePlaceInput {
  user_id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  rating_avg: number; // to be calculated later in code
  approved: boolean
}

export interface UpdatePlaceInput {
  name?: string;
  description?: string;
  rating_avg?: number;
  latitude?: number;
  longitude?: number;
  approved?: boolean;
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
