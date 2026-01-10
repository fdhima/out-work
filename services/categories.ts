import { supabase } from "@/lib/supabase";

interface Category {
  id: number,
  name: string,
}

export async function getPlacesByCategory(categories: string[])  {
  const { data: idsData, error: idsError } = await supabase
    .from('places_with_categories')
    .select('id')
    .contains('categories', categories)

  if (idsError) throw idsError

  const placeIds = idsData.map(row => row.id)

  const { data: places, error: placesError } = await supabase
    .from('places')
    .select('*')
    .in('id', placeIds)
  
  if (placesError) throw placesError;
  return places;
}

export async function getCategories() {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
  if ( error ) throw error;
  return categories;
}

export async function getCategoryIdByName(categoryName: string): Promise<number | null> {
  const { data, error } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .single();
    
    if (error) throw error;

    return data ? data.id : null;
}

export async function getCategoryNameById(categoryId: number): Promise<string> {
  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .eq("id", categoryId)
    .single();
  if (error) throw error;
  return data?.name ?? "";
}