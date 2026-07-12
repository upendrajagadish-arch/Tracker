import { requireSupabase } from '@/lib/supabase'
import {
  hasConfigAccounts,
  normalizeProfileUsername,
  validateProfileUsername,
  type ProfileConfig,
} from '@/lib/profileConfig'
import type { Json } from '@/types/supabase'

export interface PublicProfileRecord {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  config: ProfileConfig
}

export function asProfileConfig(value: Json): ProfileConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const config: ProfileConfig = {}
  for (const [platform, accounts] of Object.entries(value)) {
    if (!Array.isArray(accounts)) continue
    const clean = accounts.filter((account): account is string => typeof account === 'string' && account.trim() !== '')
    if (clean.length) config[platform as keyof ProfileConfig] = [...new Set(clean.map((account) => account.trim()))]
  }
  return config
}

function toJson(config: ProfileConfig): Json {
  return config as Json
}

export async function signInWithPassword(email: string, password: string) {
  const client = requireSupabase()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function getMyPublicProfile() {
  const client = requireSupabase()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user) return null

  const { data, error } = await client
    .from('public_profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveProfileUsername(usernameInput: string) {
  const client = requireSupabase()
  const username = normalizeProfileUsername(usernameInput)
  const validation = validateProfileUsername(username)
  if (validation) throw new Error(validation)

  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('Sign in before choosing a username.')

  const metadata = auth.user.user_metadata as { full_name?: string; name?: string; avatar_url?: string; picture?: string }
  const { data, error } = await client
    .from('public_profiles')
    .upsert({
      id: auth.user.id,
      username,
      display_name: metadata.full_name ?? metadata.name ?? null,
      avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
    }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMyPrimaryProfileConfig(): Promise<ProfileConfig | null> {
  const client = requireSupabase()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user) return null

  const { data, error } = await client
    .from('profile_configs')
    .select('config')
    .eq('user_id', auth.user.id)
    .eq('is_primary', true)
    .maybeSingle()
  if (error) throw error
  return data ? asProfileConfig(data.config) : null
}

export async function savePrimaryProfileConfig(config: ProfileConfig) {
  if (!hasConfigAccounts(config)) throw new Error('Add at least one account before saving a profile.')

  const client = requireSupabase()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('Sign in before saving a profile.')

  const { data: existing, error: lookupError } = await client
    .from('profile_configs')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('is_primary', true)
    .maybeSingle()
  if (lookupError) throw lookupError

  if (existing) {
    const { data, error } = await client
      .from('profile_configs')
      .update({ config: toJson(config), is_public: true })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await client
    .from('profile_configs')
    .insert({ user_id: auth.user.id, config: toJson(config), is_primary: true, is_public: true })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPublicProfileByUsername(usernameInput: string): Promise<PublicProfileRecord | null> {
  const client = requireSupabase()
  const username = normalizeProfileUsername(usernameInput)

  const { data: profile, error: profileError } = await client
    .from('public_profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) return null

  const { data: config, error: configError } = await client
    .from('profile_configs')
    .select('config')
    .eq('user_id', profile.id)
    .eq('is_primary', true)
    .eq('is_public', true)
    .maybeSingle()
  if (configError) throw configError

  // A claimed handle with no saved accounts is still a real profile — return
  // it with an empty config so the UI can prompt instead of 404ing.
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    config: config ? asProfileConfig(config.config) : {},
  }
}
