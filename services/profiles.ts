import { supabase } from "@/lib/supabase";

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