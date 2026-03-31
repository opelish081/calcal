'use client'
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface FoodItem {
  name: string
  name_en: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  amount_g: number
  confidence: 'high' | 'medium' | 'low'
}

interface Analysis {
  foods: FoodItem[]
  total: { calories: number; protein_g: number; carbs_g: number; fat_g: number }
  meal_type_suggestion: string
  notes: string
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅 เช้า',
  lunch: '☀️ กลางวัน',
  dinner: '🌙 เย็น',
  snack: '🍎 ของว่าง',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-red-100 text-red-600',
}

const MAX_ANALYZE_UPLOAD_BYTES = 3.5 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 1600

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image load failed'))
    }

    image.src = objectUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Image compression failed'))
        return
      }
      resolve(blob)
    }, 'image/jpeg', quality)
  })
}

async function optimizeImageForAnalyze(file: File) {
  const image = await loadImage(file)
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height))

  let width = Math.max(1, Math.round(image.width * scale))
  let height = Math.max(1, Math.round(image.height * scale))
  let quality = 0.86

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')

  const render = async () => {
    canvas.width = width
    canvas.height = height
    context.clearRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)
    return canvasToBlob(canvas, quality)
  }

  let blob = await render()

  while (blob.size > MAX_ANALYZE_UPLOAD_BYTES && quality > 0.56) {
    quality -= 0.08
    blob = await render()
  }

  while (blob.size > MAX_ANALYZE_UPLOAD_BYTES && Math.max(width, height) > 900) {
    width = Math.max(1, Math.round(width * 0.85))
    height = Math.max(1, Math.round(height * 0.85))
    blob = await render()
  }

  if (blob.size > MAX_ANALYZE_UPLOAD_BYTES) {
    throw new Error('IMAGE_TOO_LARGE')
  }

  return new File(
    [blob],
    file.name.replace(/\.[^.]+$/, '') + '.jpg',
    { type: 'image/jpeg', lastModified: Date.now() }
  )
}

export default function ScanPage() {
  const { data: session, status } = useSession()
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [mealType, setMealType] = useState('snack')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  if (status === 'unauthenticated') redirect('/')

  async function handleFileSelect(f: File) {
    if (!f.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพ')
      return
    }

    setPreparing(true)
    try {
      const optimized = await optimizeImageForAnalyze(f)
      setFile(optimized)
      setAnalysis(null)
      setPreview(URL.createObjectURL(optimized))

      if (optimized.size < f.size) {
        toast.success(`ย่อรูปแล้ว: ${formatFileSize(f.size)} -> ${formatFileSize(optimized.size)}`)
      }
    } catch (error) {
      console.error(error)
      toast.error('รูปใหญ่เกินไป กรุณาเลือกรูปที่เล็กลงหรือครอปก่อนอัปโหลด')
      setFile(null)
      setPreview(null)
      setAnalysis(null)
    } finally {
      setPreparing(false)
    }
  }

  async function analyze() {
    if (!file) return
    if (file.size > MAX_ANALYZE_UPLOAD_BYTES) {
      toast.error('รูปยังใหญ่เกินไปสำหรับการวิเคราะห์')
      return
    }

    setAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/food/analyze', { method: 'POST', body: formData })

      let data: { analysis?: Analysis; error?: string } = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (!res.ok) {
        if (res.status === 413) {
          toast.error('รูปใหญ่เกินไป กรุณาถ่ายใกล้ขึ้นหรือครอปรูปก่อน')
          return
        }
        toast.error(data.error || 'วิเคราะห์ไม่สำเร็จ ลองใหม่อีกครั้ง')
        return
      }

      if (data.analysis) {
        setAnalysis(data.analysis)
        setMealType(data.analysis.meal_type_suggestion || 'snack')
      } else {
        toast.error('วิเคราะห์ไม่สำเร็จ ลองใหม่อีกครั้ง')
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setAnalyzing(false)
    }
  }

  async function saveAll() {
    if (!analysis) return
    setSaving(true)
    try {
      for (const food of analysis.foods) {
        await fetch('/api/food/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            food_name: food.name,
            calories: food.calories,
            protein_g: food.protein_g,
            carbs_g: food.carbs_g,
            fat_g: food.fat_g,
            amount_g: food.amount_g,
            meal_type: mealType,
            source: 'ai_scan',
            ai_analysis: food,
          }),
        })
      }
      toast.success('บันทึกทุกรายการแล้ว! 🎉')
      setPreview(null)
      setFile(null)
      setAnalysis(null)
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors">←</Link>
          <h1 className="text-base font-medium">วิเคราะห์อาหาร AI</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">
        {!preview ? (
          /* Upload area */
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-gray-300 hover:bg-gray-50/50 transition-all min-h-[280px]"
          >
            <div className="text-5xl">📸</div>
            <div className="text-center">
              <p className="font-medium text-gray-700">เลือกรูปอาหาร</p>
              <p className="text-sm text-gray-400 mt-1">หรือถ่ายรูปใหม่</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                className="btn-ghost text-sm border border-gray-200"
              >
                📁 เลือกจากคลัง
              </button>
              <button
                onClick={e => { e.stopPropagation(); cameraRef.current?.click() }}
                className="btn-primary text-sm"
              >
                📷 ถ่ายรูป
              </button>
            </div>
          </div>
        ) : (
          /* Preview + result */
          <div className="space-y-4">
            {/* Image */}
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-[4/3]">
              <img src={preview} alt="food" className="w-full h-full object-cover" />
              {!analysis && !analyzing && !preparing && (
                <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                  <button
                    onClick={() => { setPreview(null); setFile(null) }}
                    className="flex-1 py-3 bg-white/90 backdrop-blur-sm rounded-2xl text-sm font-medium text-gray-700"
                  >
                    เลือกใหม่
                  </button>
                  <button
                    onClick={analyze}
                    className="flex-1 py-3 bg-gray-900 text-white rounded-2xl text-sm font-medium"
                  >
                    วิเคราะห์
                  </button>
                </div>
              )}
              {preparing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <p className="text-white text-sm font-medium">กำลังเตรียมรูป...</p>
                  <p className="text-white/60 text-xs">ย่อและบีบอัดรูปก่อนส่งวิเคราะห์</p>
                </div>
              )}
              {analyzing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <p className="text-white text-sm font-medium">กำลังวิเคราะห์...</p>
                  <p className="text-white/60 text-xs">Claude กำลังระบุอาหาร</p>
                </div>
              )}
            </div>
            {!analysis && file && (
              <p className="text-xs text-gray-400 px-1">
                รูปพร้อมส่งวิเคราะห์: {formatFileSize(file.size)}
              </p>
            )}

            {/* Analysis result */}
            {analysis && (
              <div className="space-y-4 animate-fade-in">
                {/* Notes */}
                {analysis.notes && (
                  <div className="bg-blue-50 rounded-2xl px-4 py-3 text-sm text-blue-700">
                    💡 {analysis.notes}
                  </div>
                )}

                {/* Meal type selector */}
                <div className="card">
                  <p className="text-xs text-gray-400 mb-2">มื้ออาหาร</p>
                  <div className="flex gap-2">
                    {Object.entries(MEAL_LABELS).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setMealType(val)}
                        className={`flex-1 text-xs py-2 rounded-xl transition-all ${
                          mealType === val ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total summary */}
                <div className="card">
                  <p className="text-xs text-gray-400 mb-3">รวมทั้งหมด</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'แคลอรี่', value: analysis.total.calories, unit: 'kcal' },
                      { label: 'โปรตีน', value: analysis.total.protein_g, unit: 'g' },
                      { label: 'คาร์บ', value: analysis.total.carbs_g, unit: 'g' },
                      { label: 'ไขมัน', value: analysis.total.fat_g, unit: 'g' },
                    ].map(m => (
                      <div key={m.label} className="bg-gray-50 rounded-xl py-2">
                        <p className="text-lg font-medium text-gray-900">{Math.round(m.value)}</p>
                        <p className="text-xs text-gray-400">{m.unit}</p>
                        <p className="text-xs text-gray-400">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Food list */}
                <div className="card space-y-3">
                  <p className="text-xs text-gray-400">รายการอาหารที่ตรวจพบ</p>
                  {analysis.foods.map((food, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{food.name}</p>
                          <span className={`text-xs rounded-lg px-1.5 py-0.5 ${CONFIDENCE_COLORS[food.confidence]}`}>
                            {food.confidence === 'high' ? 'แม่น' : food.confidence === 'medium' ? 'ปานกลาง' : 'ไม่แน่ใจ'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{food.name_en} · {food.amount_g}g</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{food.calories} kcal</p>
                        <p className="text-xs text-blue-500">P: {food.protein_g}g</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setPreview(null); setFile(null); setAnalysis(null) }}
                    className="flex-1 btn-ghost border border-gray-200 py-3"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={saveAll}
                    disabled={saving}
                    className="flex-1 btn-primary py-3"
                  >
                    {saving ? 'กำลังบันทึก...' : `บันทึก ${analysis.foods.length} รายการ`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* How to use LINE */}
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💬</span>
            <p className="text-sm font-medium text-green-800">ส่งรูปผ่าน LINE ได้เลย!</p>
          </div>
          <p className="text-xs text-green-600 leading-relaxed">
            เพิ่มเพื่อน LINE Bot แล้วส่งรูปอาหารมาได้เลย — ระบบจะบันทึกเข้า account ของคุณอัตโนมัติ
          </p>
          <Link href="/profile#line" className="text-xs text-green-700 underline mt-2 block">
            ตั้งค่าเชื่อม LINE →
          </Link>
        </div>
      </main>

      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
          e.currentTarget.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
          e.currentTarget.value = ''
        }}
      />
    </div>
  )
}
