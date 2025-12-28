import { supabase } from "@/lib/supabase";

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