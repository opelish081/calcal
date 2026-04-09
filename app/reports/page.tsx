'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { addDays, format, isToday, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Summary {
  summary_date: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
}

interface Stats {
  avgCalories: number
  avgProtein: number
  daysGoalMet: number
  totalDays: number
}

export default function ReportsPage() {
  const { status } = useSession()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [range, setRange] = useState(7)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'authenticated') void fetchData()
  }, [status, range, selectedDate])

  function shiftSelectedDate(days: number) {
    setSelectedDate((current) => format(addDays(parseISO(current), days), 'yyyy-MM-dd'))
  }

  async function fetchData() {
    setLoading(true)
    const res = await fetch(`/api/reports?range=${range}&endDate=${selectedDate}`)
    const data = await res.json()
    setSummaries(data.summaries || [])
    setStats(data.stats)
    setLoading(false)
  }

  const chartData = summaries.map(s => ({
    day: format(parseISO(s.summary_date), 'd MMM', { locale: th }),
    โปรตีน: Math.round(s.total_protein_g),
    แคลอรี่: Math.round(s.total_calories),
    คาร์บ: Math.round(s.total_carbs_g),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700">←</Link>
          <h1 className="text-base font-medium">รายงาน</h1>
          <div className="ml-auto flex gap-1.5">
            {[7, 14, 30].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${range === r ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                {r} วัน
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-16">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400">สิ้นสุดที่วันที่</p>
              <p className="text-sm font-medium text-gray-900">
                {isToday(parseISO(selectedDate)) ? 'วันนี้' : format(parseISO(selectedDate), 'EEEE, d MMMM', { locale: th })}
              </p>
            </div>
            {selectedDate !== todayStr && (
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
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center">
              <p className="text-xl font-medium text-gray-900">{stats.avgCalories}</p>
              <p className="text-xs text-gray-400 mt-0.5">kcal เฉลี่ย/วัน</p>
            </div>
            <div className="card text-center">
              <p className="text-xl font-medium text-gray-900">{stats.avgProtein}g</p>
              <p className="text-xs text-gray-400 mt-0.5">โปรตีนเฉลี่ย/วัน</p>
            </div>
            <div className="card text-center">
              <p className="text-xl font-medium text-brand-600">{stats.daysGoalMet}</p>
              <p className="text-xs text-gray-400 mt-0.5">วันที่ถึงเป้า</p>
            </div>
          </div>
        )}

        {/* Protein chart */}
        <div className="card">
          <h2 className="text-sm font-medium text-gray-900 mb-1">โปรตีน (g)</h2>
          <p className="text-xs text-gray-400 mb-4">
            {range} วันย้อนหลัง สิ้นสุดที่ {format(parseISO(selectedDate), 'd MMM yyyy', { locale: th })}
          </p>
          {!loading && (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="proteinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium">{payload[0].value}g</p>
                      </div>
                    )
                  }}
                />
                <Area type="monotone" dataKey="โปรตีน" stroke="#3b82f6" strokeWidth={2} fill="url(#proteinGrad)" dot={{ r: 3, fill: '#3b82f6' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Calories chart */}
        <div className="card">
          <h2 className="text-sm font-medium text-gray-900 mb-1">แคลอรี่ (kcal)</h2>
          <p className="text-xs text-gray-400 mb-4">
            {range} วันย้อนหลัง สิ้นสุดที่ {format(parseISO(selectedDate), 'd MMM yyyy', { locale: th })}
          </p>
          {!loading && (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium">{payload[0].value} kcal</p>
                      </div>
                    )
                  }}
                />
                <Area type="monotone" dataKey="แคลอรี่" stroke="#f59e0b" strokeWidth={2} fill="url(#calGrad)" dot={{ r: 3, fill: '#f59e0b' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily breakdown */}
        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-gray-900">รายวัน</h2>
          {summaries.slice().reverse().map(s => (
            <div key={s.summary_date} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-10 text-center">
                <p className="text-xs font-medium text-gray-900">{format(parseISO(s.summary_date), 'd')}</p>
                <p className="text-xs text-gray-400">{format(parseISO(s.summary_date), 'MMM', { locale: th })}</p>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>แคล: <span className="text-gray-700 font-medium">{Math.round(s.total_calories)}</span></span>
                  <span>โปรตีน: <span className="text-blue-600 font-medium">{Math.round(s.total_protein_g)}g</span></span>
                  <span>คาร์บ: <span className="text-amber-500 font-medium">{Math.round(s.total_carbs_g)}g</span></span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${Math.min((s.total_protein_g / 150) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
