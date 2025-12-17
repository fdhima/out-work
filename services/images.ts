import { supabase } from "@/lib/supabase";

export interface Image {
  id: number,
  place_id: number,
  url: string,
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateImageInput {
  place_id: number,
  url: string,
}

// Seperate service is needed since images are stored first at Supabase Storage
// and then their URL is inserted into the database table.
export async function uploadImage(
  uri: string,
  placeId: number,
  index: number
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const filePath = `${placeId}/${Date.now()}-${index}.jpg`;

  const { error } = await supabase.storage
    .from("place-images")
    .upload(filePath, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("place-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function getImageById(id: number) { Promise<Image | null> 
  let { data: images, error } = await supabase
    .from('images')
    .select('id')
  if (error) throw error;
  return images;
}

export async function getImages() { Promise<Image[]> 
  let { data: images, error } = await supabase
    .from('images')
    .select('*')

}

export async function createImage(input: CreateImageInput) { Promise<Image>
  const { data, error } = await supabase
    .from('images')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error;
}

