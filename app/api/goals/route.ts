import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOnboardingComplete, isProfileComplete, isProgramComplete } from '@/lib/onboarding'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateTargets, type ActivityLevel, type Goal } from '@/lib/nutrition'
import { ensureUserProfile, findUserProfile } from '@/lib/user-profile'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const profile = await findUserProfile({ id: session.user.id, email: session.user.email })

    if (!profile) {
      return NextResponse.json({
        profile: null,
        program: null,
        profileComplete: false,
        programComplete: false,
        onboardingComplete: false,
      })
    }

    const { data: program, error: programError } = await supabaseAdmin
      .from('user_programs')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .maybeSingle()

    if (programError) {
      return NextResponse.json({ error: programError.message }, { status: 500 })
    }

    const profileComplete = isProfileComplete(profile)
    const programComplete = isProgramComplete(program)

    return NextResponse.json({
      profile,
      program,
      profileComplete,
      programComplete,
      onboardingComplete: isOnboardingComplete(profile, program),
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { weight_kg, height_cm, age, gender, program_type, goal, quiz_answers } = body

    if (!session.user.email) {
      return NextResponse.json({ error: 'Signed-in user has no email' }, { status: 400 })
    }

    if (![weight_kg, height_cm, age].every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)) {
      return NextResponse.json({ error: 'Invalid body data' }, { status: 400 })
    }

    const profile = await ensureUserProfile({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    })

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ weight_kg, height_cm, age, gender, updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const { error: deactivateError } = await supabaseAdmin
      .from('user_programs')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .eq('is_active', true)

    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 500 })
    }

    const targets = calculateTargets(
      { weight_kg, height_cm, age, gender },
      program_type as ActivityLevel,
      goal as Goal
    )

    const { data: program, error } = await supabaseAdmin
      .from('user_programs')
      .insert({
        user_id: profile.id,
        program_type,
        goal,
        quiz_answers,
        ...targets,
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      program,
      targets,
      profileComplete: true,
      programComplete: true,
      onboardingComplete: true,
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
