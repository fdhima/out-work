import { supabase } from "@/lib/supabase";

export interface Place {
  id: number,
  name: string,
  description: string,
  rating_avg: number,
  latitude: number,
  longitude: number,
  approved: boolean,
  created_at: string | null
  updated_at: string | null
}

export interface CreatePlaceInput {
  name: string,
  description: string,
  rating_avg: number, // later this should be removed, since it will be calculated in code
  latitude: number,
  longitude: number,
}

export async function getPlaceById(placeId: number) {
  let { data: places, error } = await supabase
    .from('places')
    .select('id')
  if (error) throw error
  return places
}

export async function getPlaces() {
  let { data: places, error } = await supabase
    .from('places')
    .select('*')
  if (error) throw error
  return places  
}

export async function createPlace(input: CreatePlaceInput) {
  const { data, error } = await supabase
    .from('places')
    .insert(input)
    .select('id, name, description, rating_avg, latitude, longitude, created_at, updated_at')
    .single()
  if (error) throw error
  return data
}