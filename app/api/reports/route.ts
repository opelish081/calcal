import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'
import { subDays, format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || '7' // days
  const days = parseInt(range)

  const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')
  const endDate = format(new Date(), 'yyyy-MM-dd')

  const { data: summaries, error } = await supabaseAdmin
    .from('daily_summaries')
    .select('*')
    .eq('user_id', session.user.id)
    .gte('summary_date', startDate)
    .lte('summary_date', endDate)
    .order('summary_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fill missing days with zeros
  const filled = []
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const found = summaries?.find(s => s.summary_date === date)
    filled.push(found || {
      summary_date: date,
      total_calories: 0,
      total_protein_g: 0,
      total_carbs_g: 0,
      total_fat_g: 0,
    })
  }

  // Averages
  const nonZero = filled.filter(d => d.total_calories > 0)
  const avgCalories = nonZero.length ? Math.round(nonZero.reduce((s, d) => s + d.total_calories, 0) / nonZero.length) : 0
  const avgProtein = nonZero.length ? Math.round(nonZero.reduce((s, d) => s + d.total_protein_g, 0) / nonZero.length) : 0
  const daysGoalMet = summaries?.filter(s => s.goal_met).length || 0

  return NextResponse.json({
    summaries: filled,
    stats: { avgCalories, avgProtein, daysGoalMet, totalDays: days }
  })
}
