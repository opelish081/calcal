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
  amount_g?: number | null
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

export default function MealList({
  logs,
  onDelete,
  dateLabel,
  isToday = true,
}: {
  logs: FoodLog[]
  onDelete: () => void
  dateLabel?: string
  isToday?: boolean
}) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState<FoodLog['meal_type']>('snack')
  const [amount, setAmount] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  function openEditor(log: FoodLog) {
    setEditingLog(log)
    setName(log.food_name)
    setMealType(log.meal_type)
    setAmount(log.amount_g ? String(log.amount_g) : '')
    setCalories(String(log.calories ?? ''))
    setProtein(String(log.protein_g ?? ''))
    setCarbs(String(log.carbs_g ?? ''))
    setFat(String(log.fat_g ?? ''))
  }

  function closeEditor() {
    setEditingLog(null)
    setName('')
    setMealType('snack')
    setAmount('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/food/log?id=${id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      toast.success('ลบรายการแล้ว')
      onDelete()
    } else {
      toast.error(data.error || 'ลบรายการไม่สำเร็จ')
    }
    setDeleting(null)
  }

  async function handleEditSave() {
    if (!editingLog) return
    if (!name.trim()) {
      toast.error('กรุณาใส่ชื่ออาหาร')
      return
    }

    setSavingEdit(true)
    const res = await fetch('/api/food/log', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingLog.id,
        food_name: name,
        meal_type: mealType,
        amount_g: amount ? parseFloat(amount) : null,
        calories: parseFloat(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      }),
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      toast.success('แก้ไขรายการแล้ว')
      closeEditor()
      onDelete()
    } else {
      toast.error(data.error || 'แก้ไขรายการไม่สำเร็จ')
    }

    setSavingEdit(false)
  }

  if (logs.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-3xl mb-2">🍽️</p>
        <p className="text-sm text-gray-400">
          {isToday ? 'ยังไม่มีรายการอาหารวันนี้' : `ยังไม่มีรายการอาหารวันที่ ${dateLabel}`}
        </p>
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
      <h2 className="text-sm font-medium text-gray-900">
        {isToday ? 'รายการอาหารวันนี้' : `รายการอาหารวันที่ ${dateLabel}`}
      </h2>
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
                    {log.amount_g ? ` · ${Math.round(log.amount_g)}g` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openEditor(log)}
                    className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 text-xs flex items-center justify-center hover:bg-gray-200 transition-all"
                    aria-label={`แก้ไข ${log.food_name}`}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    disabled={deleting === log.id}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-400 text-xs flex items-center justify-center hover:bg-red-100 transition-all"
                    aria-label={`ลบ ${log.food_name}`}
                  >
                    {deleting === log.id ? '…' : '×'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={e => e.target === e.currentTarget && closeEditor()}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeEditor} />
          <div className="relative w-full bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pb-8 pt-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium">แก้ไขรายการอาหาร</h3>
                <button onClick={closeEditor} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>

              <div className="space-y-3">
                <input
                  className="input-base"
                  placeholder="ชื่ออาหาร"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {Object.entries(MEAL_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setMealType(value)}
                      className={`flex-shrink-0 text-xs rounded-xl px-3 py-2 transition-all ${
                        mealType === value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ปริมาณ (g)</label>
                    <input className="input-base" type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">แคลอรี่ (kcal)</label>
                    <input className="input-base" type="number" placeholder="0" value={calories} onChange={e => setCalories(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">โปรตีน (g)</label>
                    <input className="input-base" type="number" placeholder="0" value={protein} onChange={e => setProtein(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">คาร์บ (g)</label>
                    <input className="input-base" type="number" placeholder="0" value={carbs} onChange={e => setCarbs(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">ไขมัน (g)</label>
                    <input className="input-base" type="number" placeholder="0" value={fat} onChange={e => setFat(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={closeEditor} className="flex-1 btn-ghost border border-gray-200 py-3">
                    ยกเลิก
                  </button>
                  <button onClick={handleEditSave} disabled={savingEdit} className="flex-1 btn-primary py-3">
                    {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
