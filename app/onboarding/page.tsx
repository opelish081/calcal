'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { calculateTargets, PROGRAM_LABELS, type ActivityLevel, type Goal } from '@/lib/nutrition'

const STEPS = ['body', 'activity', 'goal', 'review'] as const
type Step = typeof STEPS[number]

const GOALS = [
  { value: 'lose_weight', label: '⚖️ ลดน้ำหนัก', desc: 'แคลอรี่น้อยลง 300 kcal/วัน' },
  { value: 'maintain', label: '💪 รักษาน้ำหนัก', desc: 'แคลอรี่สมดุล TDEE' },
  { value: 'gain_muscle', label: '🏋️ เพิ่มกล้ามเนื้อ', desc: 'แคลอรี่เพิ่ม 250 kcal + โปรตีนสูง' },
]

const ACTIVITIES: { value: ActivityLevel; label: string; desc: string; emoji: string }[] = [
  { value: 'sedentary', label: 'นั่งทำงานทั้งวัน', desc: 'แทบไม่ออกกำลังกาย', emoji: '🪑' },
  { value: 'light_active', label: 'ออกกำลังกายเบา', desc: '1-3 วัน/สัปดาห์', emoji: '🚶' },
  { value: 'moderate_active', label: 'ออกกำลังกายปานกลาง', desc: '3-5 วัน/สัปดาห์', emoji: '🏃' },
  { value: 'very_active', label: 'ออกกำลังกายหนักมาก', desc: 'ทุกวัน / นักกีฬา', emoji: '🏋️' },
]

export default function OnboardingPage() {
  const { status } = useSession()
  const router = useRouter()

  const [step, setStep] = useState<Step>('body')
  const [saving, setSaving] = useState(false)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [activity, setActivity] = useState<ActivityLevel>('light_active')
  const [goal, setGoal] = useState<Goal>('maintain')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">กำลังโหลด...</div>
  }

  const stepIndex = STEPS.indexOf(step)

  function canNext(): boolean {
    if (step === 'body') return !!(weight && height && age)
    return true
  }

  function next() {
    if (step === 'review') return save()
    const idx = STEPS.indexOf(step)
    setStep(STEPS[idx + 1])
  }

  function back() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: parseFloat(weight),
          height_cm: parseFloat(height),
          age: parseInt(age),
          gender,
          program_type: activity,
          goal,
          quiz_answers: { weight, height, age, gender, activity, goal },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('ตั้งค่าเสร็จแล้ว! 🎉')
        router.push('/dashboard')
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาด')
      }
    } finally {
      setSaving(false)
    }
  }

  const targets = weight && height && age
    ? calculateTargets(
        { weight_kg: parseFloat(weight), height_cm: parseFloat(height), age: parseInt(age), gender },
        activity, goal
      )
    : null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="w-full h-1 bg-gray-100">
        <div className="h-full bg-gray-900 transition-all duration-500" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
      </div>
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 py-10">
        <div className="flex-1">
          {step === 'body' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-xs text-gray-400 mb-1">1 / 4</p>
                <h1 className="text-2xl font-medium text-gray-900">ข้อมูลร่างกายของคุณ</h1>
                <p className="text-sm text-gray-400 mt-1">ใช้คำนวณค่าพลังงานที่เหมาะสม</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">น้ำหนัก (กก.)</label>
                    <input className="input-base" type="number" placeholder="65" value={weight} onChange={e => setWeight(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ส่วนสูง (ซม.)</label>
                    <input className="input-base" type="number" placeholder="170" value={height} onChange={e => setHeight(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">อายุ</label>
                  <input className="input-base" type="number" placeholder="25" value={age} onChange={e => setAge(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">เพศ</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['male', 'female'] as const).map(g => (
                      <button key={g} onClick={() => setGender(g)} className={`py-3 rounded-xl text-sm transition-all ${gender === g ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {g === 'male' ? '👨 ชาย' : '👩 หญิง'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {step === 'activity' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-xs text-gray-400 mb-1">2 / 4</p>
                <h1 className="text-2xl font-medium text-gray-900">ระดับกิจกรรม</h1>
                <p className="text-sm text-gray-400 mt-1">เลือกที่ใกล้เคียงกับชีวิตประจำวันของคุณมากที่สุด</p>
              </div>
              <div className="space-y-2">
                {ACTIVITIES.map(a => (
                  <button key={a.value} onClick={() => setActivity(a.value)} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all border ${activity === a.value ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <span className="text-2xl">{a.emoji}</span>
                    <div>
                      <p className={`text-sm font-medium ${activity === a.value ? 'text-white' : 'text-gray-900'}`}>{a.label}</p>
                      <p className="text-xs text-gray-400">{a.desc}</p>
                    </div>
                    {activity === a.value && <span className="ml-auto text-white">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 'goal' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-xs text-gray-400 mb-1">3 / 4</p>
                <h1 className="text-2xl font-medium text-gray-900">เป้าหมายของคุณ</h1>
                <p className="text-sm text-gray-400 mt-1">กำหนดเป้าหมายแคลอรี่และโปรตีนที่เหมาะสม</p>
              </div>
              <div className="space-y-2">
                {GOALS.map(g => (
                  <button key={g.value} onClick={() => setGoal(g.value as Goal)} className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all border ${goal === g.value ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${goal === g.value ? 'text-white' : 'text-gray-900'}`}>{g.label}</p>
                      <p className="text-xs text-gray-400">{g.desc}</p>
                    </div>
                    {goal === g.value && <span className="text-white">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 'review' && targets && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-xs text-gray-400 mb-1">4 / 4</p>
                <h1 className="text-2xl font-medium text-gray-900">เป้าหมายของคุณ 🎯</h1>
                <p className="text-sm text-gray-400 mt-1">คำนวณจากข้อมูลร่างกายโดย Mifflin-St Jeor Equation</p>
              </div>
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 mb-3">ค่าพื้นฐาน</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="BMR (พักเฉยๆ)" value={`${targets.bmr} kcal`} />
                    <Stat label="TDEE (รวมกิจกรรม)" value={`${targets.tdee} kcal`} />
                  </div>
                </div>
                <div className="bg-gray-900 rounded-2xl p-4 text-white">
                  <p className="text-xs text-gray-400 mb-3">เป้าหมายรายวัน</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="แคลอรี่" value={`${targets.target_calories} kcal`} light />
                    <Stat label="โปรตีน" value={`${targets.target_protein_g}g`} light />
                    <Stat label="คาร์บ" value={`${targets.target_carbs_g}g`} light />
                    <Stat label="ไขมัน" value={`${targets.target_fat_g}g`} light />
                  </div>
                </div>
                <div className="bg-blue-50 rounded-2xl p-3 text-sm text-blue-700">
                  <p className="font-medium mb-0.5">{PROGRAM_LABELS[activity]}</p>
                  <p className="text-xs text-blue-500">
                    {goal === 'lose_weight' ? 'ลดแคลอรี่ 300/วัน เพื่อลด ~0.3กก./สัปดาห์' :
                     goal === 'gain_muscle' ? 'เพิ่มแคลอรี่ 250/วัน + โปรตีนสูงสำหรับกล้ามเนื้อ' :
                     'แคลอรี่สมดุลกับการใช้พลังงาน'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-6">
          {stepIndex > 0 && (
            <button onClick={back} className="btn-ghost border border-gray-200 py-4 px-6">←</button>
          )}
          <button onClick={next} disabled={!canNext() || saving} className="flex-1 btn-primary py-4 text-base">
            {step === 'review' ? (saving ? 'กำลังบันทึก...' : 'เริ่มต้นใช้งาน 🚀') : 'ถัดไป →'}
          </button>
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value, light }: { label: string; value: string; light?: boolean }) {
  return (
    <div>
      <p className={`text-xs mb-0.5 ${light ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-base font-medium ${light ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
