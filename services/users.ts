import { supabase } from '@/lib/supabase'

/* --------------------------------------------------
 * Types
 * -------------------------------------------------- */

const SALT_ROUNDS = 10 // same as Supabase

export interface User {
  id: number
  username: string
  email: string
  created_at: string | null
  updated_at: string | null
}

/**
 * Payload used when creating a user
 * password_hash should already be hashed
 */
export interface CreateUserInput {
  username: string
  email: string
  password_hash: string
}

/**
 * Payload for updating user profile
 * All fields optional
 */
export interface UpdateUserInput {
  username?: string
  email?: string
  password_hash?: string
}

/* --------------------------------------------------
 * Queries
 * -------------------------------------------------- */


export async function getUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error;
  return user?.id
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, created_at, updated_at')
    .eq('username', username)
    .single()

  if (error) throw error
  return data
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, created_at, updated_at')
    .eq('email', email)
    .single()

  if (error) throw error
  return data
}

/**
 * Create user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert(input)
    .select('id, username, email, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

/**
 * Update user
 */
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

// export async function updateUserPassword(
//   userId: number,
//   newPassword: string
// ): Promise<User> {
//   const { error } = await supabase.auth.updateUser({
//     password: newPassword,
//   })

// }

/**
 * Delete user
 */
export async function deleteUser(userId: number): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) throw error
}
