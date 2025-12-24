import { supabase } from "@/lib/supabase";
import { File } from "expo-file-system";

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

export async function uploadImage(
  uri: string,
  placeId: number,
  index: number
): Promise<string> {
  const file = new File(uri); // File points to your local file

  // Convert file to Uint8Array
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const ext = uri.split(".").pop() ?? "jpg";
  const filePath = `${placeId}/${Date.now()}-${index}.${ext}`;

  const { error } = await supabase.storage
    .from("place-images")
    .upload(filePath, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("place-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}


export async function createImage(input: CreateImageInput) { Promise<Image>
  const { data, error } = await supabase
    .from('images')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error;
}

export async function getImagesForPlace(placeId: number): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from("place-images")
    .list(`${placeId}`, {
      limit: 100,        // adjust if needed
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    console.error("Error fetching images:", error);
    return [];
  }

  if (!data) return [];

  // Get public URLs for each image
  return data.map((file) => {
    const { data: urlData } = supabase.storage
      .from("place-images")
      .getPublicUrl(`${placeId}/${file.name}`);
    return urlData.publicUrl;
  });
}


