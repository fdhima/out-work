import { supabase } from "@/lib/supabase";

export async function getUsernameById(userId: string) {
  let { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single()
  if (error) throw error;
  return data;
}