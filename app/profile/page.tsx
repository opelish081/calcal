'use client'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PROGRAM_LABELS, calculateTargets, type ActivityLevel, type Goal } from '@/lib/nutrition'

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [program, setProgram] = useState<Record<string, unknown> | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lineToken, setLineToken] = useState<string | null>(null)

  // Edit form
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [activity, setActivity] = useState<ActivityLevel>('light_active')
  const [goal, setGoal] = useState<Goal>('maintain')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const res = await fetch('/api/goals')
    const data = await res.json()
    setProfile(data.profile)
    setProgram(data.program)
    if (data.profile) {
      setWeight(String(data.profile.weight_kg || ''))
      setHeight(String(data.profile.height_cm || ''))
      setAge(String(data.profile.age || ''))
      setGender((data.profile.gender as 'male' | 'female') || 'male')
    }
    if (data.program) {
      setActivity((data.program.program_type as ActivityLevel) || 'light_active')
      setGoal((data.program.goal as Goal) || 'maintain')
    }
  }

  async function save() {
    setSaving(true)
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
    if (res.ok) {
      toast.success('อัปเดตแล้ว!')
      setEditMode(false)
      fetchData()
    } else {
      toast.error('เกิดข้อผิดพลาด')
    }
    setSaving(false)
  }

  async function generateLineToken() {
    // Generate a simple token for LINE linking
    const token = Math.random().toString(36).substring(2, 10).toUpperCase()
    // In production: save this token to the user's profile in Supabase
    setLineToken(token)
    toast.success('คัดลอก token แล้ว!')
  }

  const targets = weight && height && age
    ? calculateTargets(
        { weight_kg: parseFloat(weight), height_cm: parseFloat(height), age: parseInt(age), gender },
        activity, goal
      )
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700">←</Link>
          <h1 className="text-base font-medium">โปรไฟล์</h1>
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="ml-auto text-sm text-gray-500 hover:text-gray-900">
              แก้ไข
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20">
        {/* User info */}
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
            {session?.user?.image
              ? <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              : <span className="text-xl font-medium text-gray-500">{session?.user?.name?.[0]}</span>
            }
          </div>
          <div>
            <p className="font-medium text-gray-900">{session?.user?.name}</p>
            <p className="text-sm text-gray-400">{session?.user?.email}</p>
          </div>
        </div>

        {/* Body + Program */}
        {!editMode ? (
          <>
            <div className="card space-y-4">
              <h2 className="text-sm font-medium text-gray-900">ข้อมูลร่างกาย</h2>
              <div className="grid grid-cols-3 gap-3">
                <InfoItem label="น้ำหนัก" value={profile?.weight_kg ? `${profile.weight_kg} กก.` : '-'} />
                <InfoItem label="ส่วนสูง" value={profile?.height_cm ? `${profile.height_cm} ซม.` : '-'} />
                <InfoItem label="อายุ" value={profile?.age ? `${profile.age} ปี` : '-'} />
              </div>
            </div>

            {program && (
              <div className="card space-y-4">
                <h2 className="text-sm font-medium text-gray-900">Program ปัจจุบัน</h2>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-medium text-gray-900">{PROGRAM_LABELS[program.program_type as ActivityLevel]}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {program.goal === 'lose_weight' ? 'เป้าหมาย: ลดน้ำหนัก' :
                     program.goal === 'gain_muscle' ? 'เป้าหมาย: เพิ่มกล้ามเนื้อ' : 'เป้าหมาย: รักษาน้ำหนัก'}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'แคล', value: `${Math.round(program.target_calories as number)}` },
                    { label: 'โปรตีน', value: `${Math.round(program.target_protein_g as number)}g` },
                    { label: 'คาร์บ', value: `${Math.round(program.target_carbs_g as number)}g` },
                    { label: 'ไขมัน', value: `${Math.round(program.target_fat_g as number)}g` },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl py-2">
                      <p className="text-sm font-medium text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => setEditMode(true)} className="w-full py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                  เปลี่ยน Program
                </button>
              </div>
            )}
          </>
        ) : (
          /* Edit form */
          <div className="card space-y-4">
            <h2 className="text-sm font-medium text-gray-900">แก้ไขข้อมูล</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">น้ำหนัก (กก.)</label>
                <input className="input-base" type="number" value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ส่วนสูง (ซม.)</label>
                <input className="input-base" type="number" value={height} onChange={e => setHeight(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">อายุ</label>
                <input className="input-base" type="number" value={age} onChange={e => setAge(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">เพศ</label>
                <div className="flex gap-2">
                  {(['male', 'female'] as const).map(g => (
                    <button key={g} onClick={() => setGender(g)} className={`flex-1 py-3 rounded-xl text-xs transition-all ${gender === g ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {g === 'male' ? 'ชาย' : 'หญิง'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">ระดับกิจกรรม</label>
              <div className="space-y-1.5">
                {(['sedentary', 'light_active', 'moderate_active', 'very_active'] as ActivityLevel[]).map(a => (
                  <button key={a} onClick={() => setActivity(a)} className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${activity === a ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {PROGRAM_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">เป้าหมาย</label>
              <div className="grid grid-cols-3 gap-2">
                {([['lose_weight', '⚖️ ลดน้ำหนัก'], ['maintain', '💪 รักษาน้ำหนัก'], ['gain_muscle', '🏋️ เพิ่มกล้าม']] as [Goal, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setGoal(v)} className={`py-2.5 rounded-xl text-xs transition-all ${goal === v ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {targets && (
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                เป้าหมายใหม่: {targets.target_calories} kcal · โปรตีน {targets.target_protein_g}g/วัน
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)} className="flex-1 btn-ghost border border-gray-200 py-3">
                ยกเลิก
              </button>
              <button onClick={save} disabled={saving} className="flex-1 btn-primary py-3">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        )}

        {/* LINE linking */}
        <div id="line" className="card space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h2 className="text-sm font-medium text-gray-900">เชื่อมต่อ LINE Bot</h2>
          </div>
          {profile?.line_user_id ? (
            <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
              <span>✅</span> เชื่อมต่อ LINE แล้ว
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 leading-relaxed">
                เพิ่มเพื่อน LINE Bot → พิมพ์ /link [token] เพื่อเชื่อมบัญชี
              </p>
              {lineToken ? (
                <div className="bg-gray-100 rounded-xl p-3 flex items-center justify-between">
                  <code className="text-sm font-mono font-medium text-gray-900">/link {lineToken}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`/link ${lineToken}`); toast.success('คัดลอกแล้ว!') }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    คัดลอก
                  </button>
                </div>
              ) : (
                <button onClick={generateLineToken} className="btn-primary py-3 w-full">
                  รับ Token สำหรับ LINE
                </button>
              )}
            </>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full py-3 text-sm text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200 rounded-2xl transition-all"
        >
          ออกจากระบบ
        </button>
      </main>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className="text-base font-medium text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
