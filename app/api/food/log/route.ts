import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function parseNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

type SummaryAccumulator = {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

type HistoryLogRow = {
  food_name: string | null
  amount_g: unknown
  meal_type: string | null
  calories: unknown
  protein_g: unknown
  carbs_g: unknown
  fat_g: unknown
  logged_at: string | null
}

function parseNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function syncDailySummary(userId: string, date: string) {
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('food_logs')
    .select('calories, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .eq('logged_at', date)

  if (logsError) {
    throw new Error(logsError.message)
  }

  if (!logs?.length) {
    const { error: deleteError } = await supabaseAdmin
      .from('daily_summaries')
      .delete()
      .eq('user_id', userId)
      .eq('summary_date', date)

    if (deleteError) {
      throw new Error(deleteError.message)
    }
    return
  }

  const typedLogs = logs as Array<{
    calories: unknown
    protein_g: unknown
    carbs_g: unknown
    fat_g: unknown
  }>

  const totals = typedLogs.reduce((acc: SummaryAccumulator, log) => ({
    calories: acc.calories + parseNumber(log.calories),
    protein_g: acc.protein_g + parseNumber(log.protein_g),
    carbs_g: acc.carbs_g + parseNumber(log.carbs_g),
    fat_g: acc.fat_g + parseNumber(log.fat_g),
  }), {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  })

  const { error: summaryError } = await supabaseAdmin
    .from('daily_summaries')
    .upsert({
      user_id: userId,
      summary_date: date,
      total_calories: totals.calories,
      total_protein_g: totals.protein_g,
      total_carbs_g: totals.carbs_g,
      total_fat_g: totals.fat_g,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,summary_date' })

  if (summaryError) {
    throw new Error(summaryError.message)
  }
}

// GET: fetch today's or specific date's logs
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const historyMode = searchParams.get('history') === '1'

  if (historyMode) {
    const rawLimit = Number(searchParams.get('limit') || 12)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 20) : 12

    const { data, error } = await supabaseAdmin
      .from('food_logs')
      .select('food_name, amount_g, meal_type, calories, protein_g, carbs_g, fat_g, logged_at, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit * 10)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const historyMap = new Map<string, {
      food_name: string
      amount_g: number | null
      calories: number
      protein_g: number
      carbs_g: number
      fat_g: number
      last_meal_type: string
      last_logged_at: string
      use_count: number
    }>()

    for (const row of (data || []) as HistoryLogRow[]) {
      const foodName = row.food_name?.trim()
      if (!foodName) continue

      const key = foodName.toLocaleLowerCase()
      const existing = historyMap.get(key)

      if (existing) {
        existing.use_count += 1
        continue
      }

      historyMap.set(key, {
        food_name: foodName,
        amount_g: parseNullableNumber(row.amount_g),
        calories: parseNumber(row.calories),
        protein_g: parseNumber(row.protein_g),
        carbs_g: parseNumber(row.carbs_g),
        fat_g: parseNumber(row.fat_g),
        last_meal_type: row.meal_type || 'snack',
        last_logged_at: row.logged_at || new Date().toISOString().split('T')[0],
        use_count: 1,
      })
    }

    return NextResponse.json({
      history: Array.from(historyMap.values()).slice(0, limit),
    })
  }

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

  try {
    await syncDailySummary(session.user.id, data.logged_at)
  } catch (summaryError) {
    console.error('Daily summary sync error after insert:', summaryError)
  }

  return NextResponse.json({ log: data })
}

// PUT: update an existing food log
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, food_name, amount_g, meal_type, calories, protein_g, carbs_g, fat_g, fiber_g, logged_at } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (!food_name?.trim()) return NextResponse.json({ error: 'Missing food name' }, { status: 400 })

  const { data: existingLog, error: existingError } = await supabaseAdmin
    .from('food_logs')
    .select('id, logged_at')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()

  if (existingError || !existingLog) {
    return NextResponse.json({ error: existingError?.message || 'Food log not found' }, { status: 404 })
  }

  const nextLoggedAt = logged_at || existingLog.logged_at

  const { data, error } = await supabaseAdmin
    .from('food_logs')
    .update({
      food_name: food_name.trim(),
      amount_g: amount_g ?? null,
      meal_type: meal_type || 'snack',
      calories: calories || 0,
      protein_g: protein_g || 0,
      carbs_g: carbs_g || 0,
      fat_g: fat_g || 0,
      fiber_g: fiber_g || 0,
      logged_at: nextLoggedAt,
    })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await syncDailySummary(session.user.id, nextLoggedAt)
    if (existingLog.logged_at !== nextLoggedAt) {
      await syncDailySummary(session.user.id, existingLog.logged_at)
    }
  } catch (summaryError) {
    console.error('Daily summary sync error after update:', summaryError)
  }

  return NextResponse.json({ log: data })
}

// DELETE: remove a food log entry
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: existingLog, error: existingError } = await supabaseAdmin
    .from('food_logs')
    .select('id, logged_at')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()

  if (existingError || !existingLog) {
    return NextResponse.json({ error: existingError?.message || 'Food log not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id) // security: only own logs

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await syncDailySummary(session.user.id, existingLog.logged_at)
  } catch (summaryError) {
    console.error('Daily summary sync error after delete:', summaryError)
  }

  return NextResponse.json({ success: true })
}
