import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateTargets, type ActivityLevel, type Goal } from '@/lib/nutrition'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const { data: program } = await supabaseAdmin
    .from('user_programs')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .single()

  return NextResponse.json({ profile, program })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { weight_kg, height_cm, age, gender, program_type, goal, quiz_answers } = body

  // 1. Update user profile
  await supabaseAdmin
    .from('user_profiles')
    .update({ weight_kg, height_cm, age, gender, updated_at: new Date().toISOString() })
    .eq('id', session.user.id)

  // 2. Deactivate old program
  await supabaseAdmin
    .from('user_programs')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .eq('is_active', true)

  // 3. Calculate new targets
  const targets = calculateTargets(
    { weight_kg, height_cm, age, gender },
    program_type as ActivityLevel,
    goal as Goal
  )

  // 4. Create new program
  const { data: program, error } = await supabaseAdmin
    .from('user_programs')
    .insert({
      user_id: session.user.id,
      program_type,
      goal,
      quiz_answers,
      ...targets,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ program, targets })
}
