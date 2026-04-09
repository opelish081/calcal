'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'

interface DayData {
  summary_date: string
  total_protein_g: number
  total_calories: number
}

export default function WeeklyChart({
  data,
  proteinTarget,
  focusDate,
}: {
  data: DayData[]
  proteinTarget: number
  focusDate?: string
}) {
  const chartData = data.map(d => ({
    day: format(parseISO(d.summary_date), 'EEE', { locale: th }),
    protein: Math.round(d.total_protein_g),
    calories: Math.round(d.total_calories),
    date: d.summary_date,
  }))

  const highlightedDate = focusDate || format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="space-y-4">
      {/* Protein chart */}
      <div>
        <p className="text-xs text-gray-400 mb-3">โปรตีน (g)</p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={chartData} barSize={18}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, Math.max(proteinTarget * 1.2, 10)]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium">{payload[0].value}g โปรตีน</p>
                  </div>
                )
              }}
            />
            <ReferenceLine y={proteinTarget} stroke="#e5e7eb" strokeDasharray="4 4" strokeWidth={1} />
            <Bar dataKey="protein" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.protein >= proteinTarget ? '#22c55e' : entry.date === highlightedDate ? '#111827' : '#e5e7eb'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Calorie chart */}
      <div>
        <p className="text-xs text-gray-400 mb-3">แคลอรี่ (kcal)</p>
        <ResponsiveContainer width="100%" height={70}>
          <BarChart data={chartData} barSize={18}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
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
            <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.date === highlightedDate ? '#f59e0b' : '#fef3c7'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
