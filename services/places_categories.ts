import { supabase } from "@/lib/supabase";

interface CreatePlaceCategory {
  place_id: number,
  category_id: number,
}

export async function createPlaceCategory(input: CreatePlaceCategory) {
  const { data, error } = await supabase
    .from("places_categories")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getPlaceCategoriesIds(placeId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from("places_categories")
    .select("category_id")
    .eq("place_id", placeId);
  if (error) throw error;
  return data?.map(row => row.category_id) ?? [];
}
