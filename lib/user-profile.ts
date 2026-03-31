import { randomUUID } from 'crypto'
import { supabaseAdmin, type Database } from '@/lib/supabase'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

type UserIdentity = {
  id?: string | null
  email?: string | null
  name?: string | null
  image?: string | null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')
  }
  return supabaseAdmin
}

export function isUuid(value?: string | null): value is string {
  return !!value && UUID_PATTERN.test(value)
}

export async function findUserProfile(identity: Pick<UserIdentity, 'id' | 'email'>): Promise<UserProfile | null> {
  const client = getSupabaseAdmin()

  if (identity.id && isUuid(identity.id)) {
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('id', identity.id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data) return data
  }

  if (identity.email) {
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('email', identity.email)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data) return data
  }

  return null
}

export async function ensureUserProfile(identity: UserIdentity): Promise<UserProfile> {
  if (!identity.email) {
    throw new Error('No email found for signed-in user')
  }

  const client = getSupabaseAdmin()
  const existingProfile = await findUserProfile({ id: identity.id, email: identity.email })
  const profileId = existingProfile?.id ?? (isUuid(identity.id) ? identity.id : randomUUID())

  const { data, error } = await client
    .from('user_profiles')
    .upsert({
      id: profileId,
      email: identity.email,
      name: identity.name ?? null,
      avatar_url: identity.image ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to sync user profile')
  }

  return data
}
