import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, type Database } from '@/lib/supabase'
import { subDays, format } from 'date-fns'

type DailySummary = Database['public']['Tables']['daily_summaries']['Row']
type ReportSummary = Pick<DailySummary, 'summary_date' | 'total_calories' | 'total_protein_g' | 'total_carbs_g' | 'total_fat_g'>

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || '7' // days
  const days = parseInt(range, 10)

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

  const typedSummaries: DailySummary[] = summaries ?? []

  // Fill missing days with zeros
  const filled: ReportSummary[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const found = typedSummaries.find((s) => s.summary_date === date)
    filled.push(found || {
      summary_date: date,
      total_calories: 0,
      total_protein_g: 0,
      total_carbs_g: 0,
      total_fat_g: 0,
    })
  }

  // Averages
  const nonZero = filled.filter((d) => d.total_calories > 0)
  const avgCalories = nonZero.length ? Math.round(nonZero.reduce((sum, d) => sum + d.total_calories, 0) / nonZero.length) : 0
  const avgProtein = nonZero.length ? Math.round(nonZero.reduce((sum, d) => sum + d.total_protein_g, 0) / nonZero.length) : 0
  const daysGoalMet = typedSummaries.filter((s) => s.goal_met).length

  return NextResponse.json({
    summaries: filled,
    stats: { avgCalories, avgProtein, daysGoalMet, totalDays: days }
  })
}
