'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

const COMMON_FOODS = [
  { name: 'ข้าวสวย (1 ทัพพี)', calories: 180, protein_g: 3, carbs_g: 40, fat_g: 0.5, amount_g: 100 },
  { name: 'ไข่ต้ม', calories: 78, protein_g: 6, carbs_g: 0.6, fat_g: 5, amount_g: 60 },
  { name: 'อกไก่ต้ม 100g', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, amount_g: 100 },
  { name: 'นมจืด 1 แก้ว', calories: 150, protein_g: 8, carbs_g: 11, fat_g: 8, amount_g: 240 },
  { name: 'กล้วยหอม', calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, amount_g: 120 },
  { name: 'ข้าวผัด', calories: 350, protein_g: 12, carbs_g: 55, fat_g: 9, amount_g: 250 },
  { name: 'ผัดกะเพรา', calories: 320, protein_g: 22, carbs_g: 15, fat_g: 18, amount_g: 200 },
  { name: 'ต้มยำกุ้ง', calories: 120, protein_g: 15, carbs_g: 5, fat_g: 5, amount_g: 300 },
  { name: 'ปลาแซลมอน 100g', calories: 208, protein_g: 20, carbs_g: 0, fat_g: 13, amount_g: 100 },
  { name: 'โปรตีนเชค 1 scoop', calories: 120, protein_g: 25, carbs_g: 3, fat_g: 1.5, amount_g: 35 },
]

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 เช้า' },
  { value: 'lunch', label: '☀️ กลางวัน' },
  { value: 'dinner', label: '🌙 เย็น' },
  { value: 'snack', label: '🍎 ของว่าง' },
]

function guessCurrentMeal(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 10) return 'breakfast'
  if (h >= 11 && h < 14) return 'lunch'
  if (h >= 17 && h < 21) return 'dinner'
  return 'snack'
}

export default function QuickLog({
  onClose,
  onSaved,
  loggedAt,
}: {
  onClose: () => void
  onSaved: () => void
  loggedAt?: string
}) {
  const [mode, setMode] = useState<'quick' | 'manual'>('quick')
  const [mealType, setMealType] = useState(guessCurrentMeal())
  const [saving, setSaving] = useState(false)

  // Manual mode fields
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  async function saveFood(food: {
    food_name: string; calories: number; protein_g: number
    carbs_g: number; fat_g: number; amount_g?: number
  }) {
    setSaving(true)
    const res = await fetch('/api/food/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...food, meal_type: mealType, source: 'manual', logged_at: loggedAt }),
    })
    if (res.ok) {
      toast.success('บันทึกแล้ว! 🎉')
      onSaved()
    } else {
      toast.error('บันทึกไม่สำเร็จ')
    }
    setSaving(false)
  }

  async function handleManualSave() {
    if (!name.trim() || !calories) return toast.error('กรุณาใส่ชื่ออาหารและแคลอรี่')
    await saveFood({
      food_name: name,
      calories: parseFloat(calories) || 0,
      protein_g: parseFloat(protein) || 0,
      carbs_g: parseFloat(carbs) || 0,
      fat_g: parseFloat(fat) || 0,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium">บันทึกอาหาร</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          {/* Meal type selector */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {MEAL_TYPES.map(m => (
              <button
                key={m.value}
                onClick={() => setMealType(m.value)}
                className={`flex-shrink-0 text-xs rounded-xl px-3 py-2 transition-all ${
                  mealType === m.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-5 bg-gray-100 rounded-xl p-1">
            {(['quick', 'manual'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-xs rounded-lg transition-all ${
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {m === 'quick' ? '⚡ รายการด่วน' : '✏️ กรอกเอง'}
              </button>
            ))}
          </div>

          {mode === 'quick' ? (
            <div className="space-y-2">
              {COMMON_FOODS.map(food => (
                <button
                  key={food.name}
                  onClick={() => saveFood({ food_name: food.name, ...food })}
                  disabled={saving}
                  className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{food.name}</p>
                    <p className="text-xs text-gray-400">{food.calories} kcal · โปรตีน {food.protein_g}g</p>
                  </div>
                  <span className="text-gray-300 text-lg">+</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                className="input-base"
                placeholder="ชื่ออาหาร เช่น ข้าวผัดหมู"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">แคลอรี่ (kcal) *</label>
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
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">ไขมัน (g)</label>
                  <input className="input-base" type="number" placeholder="0" value={fat} onChange={e => setFat(e.target.value)} />
                </div>
              </div>
              <button onClick={handleManualSave} disabled={saving} className="btn-primary w-full py-3.5">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
