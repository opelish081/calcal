'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { th } from 'date-fns/locale'

const WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export default function DateCalendar({
  label,
  selectedDate,
  maxDate,
  onSelect,
  helperText,
}: {
  label: string
  selectedDate: string
  maxDate: string
  onSelect: (value: string) => void
  helperText?: string
}) {
  const selectedDateValue = parseISO(selectedDate)
  const maxDateValue = parseISO(maxDate)
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(selectedDateValue))

  useEffect(() => {
    setVisibleMonth(startOfMonth(parseISO(selectedDate)))
  }, [selectedDate])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth)
    const monthEnd = endOfMonth(visibleMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [visibleMonth])

  const canGoNextMonth = !isAfter(startOfMonth(addMonths(visibleMonth, 1)), startOfMonth(maxDateValue))

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm font-medium text-gray-900">
            {isSameDay(selectedDateValue, maxDateValue)
              ? 'วันนี้'
              : format(selectedDateValue, 'EEEE, d MMMM', { locale: th })}
          </p>
        </div>
        {!isSameDay(selectedDateValue, maxDateValue) && (
          <button
            onClick={() => onSelect(maxDate)}
            className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-all"
          >
            กลับมาวันนี้
          </button>
        )}
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-gray-100 bg-gradient-to-b from-gray-50 to-white p-3.5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
            aria-label="เดือนก่อนหน้า"
          >
            ←
          </button>

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gray-300">Calendar</p>
            <p className="text-sm font-medium text-gray-900">
              {format(visibleMonth, 'MMMM yyyy', { locale: th })}
            </p>
          </div>

          <button
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
            disabled={!canGoNextMonth}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="เดือนถัดไป"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mt-4">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-[11px] font-medium text-gray-400">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 mt-2">
          {calendarDays.map((day) => {
            const dayValue = format(day, 'yyyy-MM-dd')
            const selected = isSameDay(day, selectedDateValue)
            const isToday = isSameDay(day, maxDateValue)
            const inVisibleMonth = isSameMonth(day, visibleMonth)
            const disabled = isAfter(day, maxDateValue)

            return (
              <button
                key={dayValue}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(dayValue)}
                aria-label={format(day, 'EEEE, d MMMM yyyy', { locale: th })}
                className={[
                  'aspect-square rounded-2xl text-sm transition-all border',
                  selected
                    ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                    : isToday
                      ? 'bg-brand-50 border-brand-200 text-brand-700'
                      : inVisibleMonth
                        ? 'bg-white border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50'
                        : 'bg-transparent border-transparent text-gray-300 hover:bg-gray-50',
                  disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent hover:border-transparent' : '',
                ].join(' ')}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
        <div>
          <p className="text-xs font-medium text-gray-600">แตะวันที่ได้เลย</p>
          <p className="text-[11px] text-gray-400">
            {helperText || 'หรือใช้ตัวเลือกวันที่ด้านขวาเพื่อข้ามไปวันไกล ๆ'}
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          max={maxDate}
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value)
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
    </div>
  )
}
