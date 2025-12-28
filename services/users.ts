import { supabase } from '@/lib/supabase'

export interface User {
  id: number
  username: string
  email: string
  created_at: string | null
  updated_at: string | null
}

export interface CreateUserInput {
  username: string
  email: string
  password_hash: string
  created_at: string
}

export interface UpdateUserInput {
  username?: string
  email?: string
  password_hash?: string
  updated_at: string
}

export async function getUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error;
  return user?.id
}

export async function updateUser(
  userId: number,
  updates: UpdateUserInput
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id, username, email, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

