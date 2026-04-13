import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ensureUserProfile } from '@/lib/user-profile'

const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

function createLineLinkToken(length = 8) {
  const bytes = crypto.randomBytes(length)
  let token = ''

  for (let index = 0; index < length; index += 1) {
    token += TOKEN_ALPHABET[bytes[index] % TOKEN_ALPHABET.length]
  }

  return token
}

function buildLineLinkPayload(profile: { line_user_id: string | null; line_link_token: string | null }) {
  return {
    lineLinked: Boolean(profile.line_user_id),
    lineUserId: profile.line_user_id,
    lineLinkToken: profile.line_link_token,
    lineCommand: profile.line_link_token ? `/link ${profile.line_link_token}` : null,
  }
}

async function getCurrentProfile() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  if (!session.user.email) {
    throw new Error('Signed-in user has no email')
  }

  return ensureUserProfile({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  })
}

export async function GET() {
  try {
    const profile = await getCurrentProfile()
    return NextResponse.json(buildLineLinkPayload(profile))
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 })
  }
}

export async function POST() {
  try {
    const profile = await getCurrentProfile()

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const nextToken = createLineLinkToken()
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          line_link_token: nextToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select('line_user_id, line_link_token')
        .single()

      if (!error && data) {
        return NextResponse.json(buildLineLinkPayload(data))
      }

      if (error?.code !== '23505') {
        throw new Error(error?.message || 'Failed to generate LINE link token')
      }
    }

    throw new Error('Failed to generate a unique LINE link token')
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 })
  }
}

export async function DELETE() {
  try {
    const profile = await getCurrentProfile()
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        line_user_id: null,
        line_link_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select('line_user_id, line_link_token')
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Failed to disconnect LINE')
    }

    return NextResponse.json(buildLineLinkPayload(data))
  } catch (error) {
    const message = getErrorMessage(error)
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 })
  }
}
