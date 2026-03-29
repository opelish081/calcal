import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

// GET: fetch today's or specific date's logs
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('food_logs')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('logged_at', date)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}

// POST: add food log entry
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { food_name, amount_g, meal_type, calories, protein_g, carbs_g, fat_g, fiber_g, source, ai_analysis, logged_at } = body

  const { data, error } = await supabaseAdmin
    .from('food_logs')
    .insert({
      user_id: session.user.id,
      food_name,
      amount_g,
      meal_type: meal_type || 'snack',
      calories: calories || 0,
      protein_g: protein_g || 0,
      carbs_g: carbs_g || 0,
      fat_g: fat_g || 0,
      fiber_g: fiber_g || 0,
      source: source || 'manual',
      ai_analysis,
      logged_at: logged_at || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}

// DELETE: remove a food log entry
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id) // security: only own logs

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
