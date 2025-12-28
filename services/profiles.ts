import { supabase } from "@/lib/supabase";

interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string
  website: string
  updated_at: string | null
}
interface UpdateProfileInput {
  username?: string
  full_name?: string
  avatar_url?: string
  website?: string
}

export async function getUsernameById(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  if (error) {
    console.error(error)
    return null
  }

  return data.full_name
}

export async function updateProfile(
  profileId: string,
  updates: UpdateProfileInput
): Promise<Profile> {

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .single()

  if (error) throw error
  return data
}