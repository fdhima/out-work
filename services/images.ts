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
  profile_id: string,
  created_at: string,
}

/**
 * Uploads an image to Supabase Storage.
 * Handles React Native URIs using the modern Expo File API.
 */
export async function uploadImage(
  uri: string,
  placeId: number,
  index: number
): Promise<string> {
  try {
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${Date.now()}-${index}.${ext}`;
    const filePath = `${placeId}/${fileName}`;

    // Read file using the modern File API
    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();

    // Determine content type
    let contentType = "image/jpeg";
    if (ext === "png") contentType = "image/png";
    else if (ext === "webp") contentType = "image/webp";
    else if (ext === "heic") contentType = "image/heic";

    const { error } = await supabase.storage
      .from("place-images")
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("place-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error("Upload error:", err);
    throw err;
  }
}


export async function createImage(input: CreateImageInput): Promise<Image | void> {
  const { data, error } = await supabase
    .from('images')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error;
  return data;
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


