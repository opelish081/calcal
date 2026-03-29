'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface FoodLog {
  id: string
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meal_type: string
  source?: string
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 เช้า',
  lunch: '☀️ กลางวัน',
  dinner: '🌙 เย็น',
  snack: '🍎 ของว่าง',
}

const SOURCE_BADGE: Record<string, string> = {
  ai_scan: 'AI',
  line_photo: 'LINE',
  manual: '',
  search: '',
}

export default function MealList({ logs, onDelete }: { logs: FoodLog[]; onDelete: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/food/log?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('ลบรายการแล้ว')
      onDelete()
    } else {
      toast.error('เกิดข้อผิดพลาด')
    }
    setDeleting(null)
  }

  if (logs.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-3xl mb-2">🍽️</p>
        <p className="text-sm text-gray-400">ยังไม่มีรายการอาหารวันนี้</p>
        <p className="text-xs text-gray-300 mt-1">กด + บันทึกอาหาร หรือถ่ายรูปเพื่อเพิ่ม</p>
      </div>
    )
  }

  // Group by meal type
  const grouped = logs.reduce((acc, log) => {
    const meal = log.meal_type || 'snack'
    if (!acc[meal]) acc[meal] = []
    acc[meal].push(log)
    return acc
  }, {} as Record<string, FoodLog[]>)

  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack']

  return (
    <div className="card space-y-4">
      <h2 className="text-sm font-medium text-gray-900">รายการอาหารวันนี้</h2>
      {mealOrder.filter(m => grouped[m]).map(meal => (
        <div key={meal}>
          <p className="text-xs font-medium text-gray-400 mb-2">{MEAL_LABELS[meal]}</p>
          <div className="space-y-2">
            {grouped[meal].map(log => (
              <div key={log.id} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-base">
                  🍽️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 truncate">{log.food_name}</p>
                    {SOURCE_BADGE[log.source || ''] && (
                      <span className="text-xs bg-blue-100 text-blue-600 rounded px-1 py-0.5 flex-shrink-0">
                        {SOURCE_BADGE[log.source || '']}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {Math.round(log.calories)} kcal · โปรตีน {Math.round(log.protein_g)}g
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(log.id)}
                  disabled={deleting === log.id}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-50 text-red-400 text-xs flex items-center justify-center hover:bg-red-100 transition-all flex-shrink-0"
                >
                  {deleting === log.id ? '…' : '×'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
