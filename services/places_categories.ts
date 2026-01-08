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