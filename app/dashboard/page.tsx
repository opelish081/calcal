'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { addDays, format, isToday, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import MacroRing from '@/components/dashboard/MacroRing'
import MealList from '@/components/dashboard/MealList'
import WeeklyChart from '@/components/dashboard/WeeklyChart'
import QuickLog from '@/components/food/QuickLog'
import { getMacroPercent } from '@/lib/nutrition'

interface DailySummary {
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
}

interface Program {
  target_calories: number
  target_protein_g: number
  target_carbs_g: number
  target_fat_g: number
  program_type: string
  goal: string
}

interface FoodLog {
  id: string
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meal_type: string
  logged_at: string
  source?: string
  amount_g?: number | null
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [weeklyData, setWeeklyData] = useState([])
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const selectedDateValue = parseISO(selectedDate)
  const viewingToday = isToday(selectedDateValue)
  const selectedDateLabel = format(selectedDateValue, 'd MMMM', { locale: th })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
      return
    }
    if (status === 'authenticated') void fetchAll()
  }, [status, selectedDate, router])

  function shiftSelectedDate(days: number) {
    setSelectedDate((current) => format(addDays(parseISO(current), days), 'yyyy-MM-dd'))
  }

  async function fetchAll() {
    setLoading(true)
    try {
      const [goalsRes, logsRes, reportsRes] = await Promise.all([
        fetch('/api/goals', { cache: 'no-store' }),
        fetch(`/api/food/log?date=${selectedDate}`),
        fetch(`/api/reports?range=7&endDate=${selectedDate}`),
      ])

      const goalsData = await goalsRes.json().catch(() => ({}))
      if (goalsRes.status === 401) {
        router.replace('/auth/signin')
        return
      }
      if (!goalsRes.ok) {
        throw new Error(goalsData.error || 'โหลดข้อมูลเป้าหมายไม่สำเร็จ')
      }
      if (!goalsData.onboardingComplete) {
        router.replace('/onboarding')
        return
      }

      const logsData = await logsRes.json().catch(() => ({}))
      const reportsData = await reportsRes.json().catch(() => ({}))

      if (!logsRes.ok) {
        throw new Error(logsData.error || 'โหลดรายการอาหารไม่สำเร็จ')
      }
      if (!reportsRes.ok) {
        throw new Error(reportsData.error || 'โหลดรายงานไม่สำเร็จ')
      }

      setProgram(goalsData.program)
      setLogs(logsData.logs || [])
      setWeeklyData(reportsData.summaries || [])

      const selectedLogs = logsData.logs || []
      setSummary({
        total_calories: selectedLogs.reduce((s: number, l: FoodLog) => s + (l.calories || 0), 0),
        total_protein_g: selectedLogs.reduce((s: number, l: FoodLog) => s + (l.protein_g || 0), 0),
        total_carbs_g: selectedLogs.reduce((s: number, l: FoodLog) => s + (l.carbs_g || 0), 0),
        total_fat_g: selectedLogs.reduce((s: number, l: FoodLog) => s + (l.fat_g || 0), 0),
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) return <DashboardSkeleton />

  const cal = summary?.total_calories || 0
  const protein = summary?.total_protein_g || 0
  const carbs = summary?.total_carbs_g || 0
  const fat = summary?.total_fat_g || 0
  const calTarget = program?.target_calories || 2000
  const proteinTarget = program?.target_protein_g || 150
  const carbsTarget = program?.target_carbs_g || 200
  const fatTarget = program?.target_fat_g || 65

  const remaining = Math.max(calTarget - cal, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 capitalize">
              {format(selectedDateValue, 'EEEE, d MMMM', { locale: th })}
            </p>
            <h1 className="text-base font-medium text-gray-900">
              สวัสดี, {session?.user?.name?.split(' ')[0] || 'คุณ'} 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/scan" className="w-9 h-9 bg-gray-900 text-white rounded-xl flex items-center justify-center text-lg">
              📸
            </Link>
            <Link href="/profile" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
              {session?.user?.image
                ? <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                : <span className="text-sm font-medium text-gray-600">{session?.user?.name?.[0]}</span>
              }
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-32">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400">เลือกวันที่</p>
              <p className="text-sm font-medium text-gray-900">
                {viewingToday ? 'วันนี้' : format(selectedDateValue, 'EEEE, d MMMM', { locale: th })}
              </p>
            </div>
            {!viewingToday && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-all"
              >
                กลับมาวันนี้
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => shiftSelectedDate(-1)}
              className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
              aria-label="วันก่อนหน้า"
            >
              ←
            </button>
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value)
              }}
              className="input-base flex-1"
            />
            <button
              onClick={() => shiftSelectedDate(1)}
              disabled={selectedDate === todayStr}
              className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="วันถัดไป"
            >
              →
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            ดูย้อนหลังได้ทั้งรายการอาหาร แคลอรี่ และกราฟ 7 วันที่สิ้นสุดที่วันเลือก
          </p>
        </div>

        {/* Calorie summary card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-gray-500">
                {viewingToday ? 'แคลอรี่วันนี้' : 'แคลอรี่ย้อนหลัง'}
              </h2>
              {!viewingToday && (
                <p className="text-xs text-gray-400 mt-1">{selectedDateLabel}</p>
              )}
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-lg px-2 py-1">
              เป้า {calTarget.toLocaleString()} kcal
            </span>
          </div>
          <div className="flex items-center gap-6">
            <MacroRing
              value={cal}
              max={calTarget}
              size={88}
              color="#111827"
              label={`${Math.round(cal)}`}
              sublabel="kcal"
            />
            <div className="flex-1 space-y-3">
              <MacroBar label="โปรตีน" value={protein} max={proteinTarget} color="bg-blue-500" unit="g" />
              <MacroBar label="คาร์บ" value={carbs} max={carbsTarget} color="bg-amber-400" unit="g" />
              <MacroBar label="ไขมัน" value={fat} max={fatTarget} color="bg-rose-400" unit="g" />
            </div>
          </div>
          {remaining > 0 && (
            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
              เหลืออีก <span className="font-medium text-gray-700">{Math.round(remaining)} kcal</span>{' '}
              {viewingToday ? 'จะถึงเป้าหมายวันนี้' : `จะถึงเป้าหมายวันที่ ${selectedDateLabel}`}
            </p>
          )}
          {remaining === 0 && (
            <p className="text-xs text-brand-600 mt-3 pt-3 border-t border-gray-100 font-medium">
              {viewingToday ? '✅ ถึงเป้าหมายแคลอรี่วันนี้แล้ว!' : `✅ ถึงเป้าหมายแคลอรี่วันที่ ${selectedDateLabel} แล้ว!`}
            </p>
          )}
        </div>

        {/* Protein highlight */}
        <div className={`rounded-2xl p-4 flex items-center justify-between ${protein >= proteinTarget ? 'bg-brand-50 border border-brand-100' : 'bg-blue-50 border border-blue-100'}`}>
          <div>
            <p className="text-xs text-blue-600 font-medium mb-0.5">
              {viewingToday ? 'โปรตีนวันนี้' : `โปรตีนวันที่ ${selectedDateLabel}`}
            </p>
            <p className="text-2xl font-medium text-gray-900">{Math.round(protein)}<span className="text-sm font-normal text-gray-400">g</span></p>
            <p className="text-xs text-gray-400">เป้า {proteinTarget}g</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-medium ${protein >= proteinTarget ? 'text-brand-600' : 'text-blue-500'}`}>
              {getMacroPercent(protein, proteinTarget)}%
            </p>
            {protein < proteinTarget && (
              <p className="text-xs text-gray-400">ขาดอีก {Math.round(proteinTarget - protein)}g</p>
            )}
          </div>
        </div>

        {/* Meals logged */}
        <MealList
          logs={logs}
          onDelete={fetchAll}
          dateLabel={selectedDateLabel}
          isToday={viewingToday}
        />

        {/* Weekly chart */}
        <div className="card">
          <h2 className="text-sm font-medium text-gray-900 mb-1">7 วันที่ย้อนหลัง</h2>
          <p className="text-xs text-gray-400 mb-4">
            สิ้นสุดที่ {viewingToday ? 'วันนี้' : format(selectedDateValue, 'd MMMM yyyy', { locale: th })}
          </p>
          <WeeklyChart data={weeklyData} proteinTarget={proteinTarget} focusDate={selectedDate} />
        </div>

        {/* Quick add button */}
        <button
          onClick={() => setShowQuickLog(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all"
        >
          + เพิ่มรายการอาหาร
        </button>
      </main>

      {/* FAB */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-3 px-4 z-20">
        <button
          onClick={() => setShowQuickLog(true)}
          className="flex-1 max-w-xs btn-primary py-4 rounded-2xl text-base"
        >
          + บันทึกอาหาร
        </button>
        <Link href="/scan" className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-xl shadow-sm">
          📸
        </Link>
      </div>

      {showQuickLog && (
        <QuickLog
          onClose={() => setShowQuickLog(false)}
          onSaved={() => { setShowQuickLog(false); fetchAll() }}
          loggedAt={selectedDate}
        />
      )}
    </div>
  )
}

function MacroBar({ label, value, max, color, unit }: {
  label: string; value: number; max: number; color: string; unit: string
}) {
  const pct = getMacroPercent(value, max)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-700 font-medium">{Math.round(value)}/{max}{unit}</span>
      </div>
      <div className="progress-bar">
        <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="h-16 bg-white border-b border-gray-100" />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-44 bg-white rounded-2xl" />
        <div className="h-20 bg-white rounded-2xl" />
        <div className="h-48 bg-white rounded-2xl" />
      </div>
    </div>
  )
}
