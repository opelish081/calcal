'use client'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SignInPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [routingAfterLogin, setRoutingAfterLogin] = useState(false)

  useEffect(() => {
    if (!session) {
      setRoutingAfterLogin(false)
      return
    }

    let cancelled = false

    async function routeSignedInUser() {
      setRoutingAfterLogin(true)

      try {
        const res = await fetch('/api/goals', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))

        if (cancelled) return

        if (!res.ok) {
          router.replace('/onboarding')
          return
        }

        router.replace(data.onboardingComplete ? '/dashboard' : '/onboarding')
      } catch {
        if (!cancelled) router.replace('/onboarding')
      }
    }

    void routeSignedInUser()

    return () => {
      cancelled = true
    }
  }, [session, router])

  if (status === 'loading' || routingAfterLogin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <p className="text-sm text-gray-400">กำลังพาไปหน้าถัดไป...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-medium text-gray-900 mb-2">CalCal</h1>
          <p className="text-gray-400 text-sm">จดบันทึกอาหาร ง่ายๆ ทุกวัน</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => signIn('google', { callbackUrl: '/auth/signin' })}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 leading-relaxed">
          การเข้าสู่ระบบถือว่าคุณยอมรับ<br />
          นโยบายความเป็นส่วนตัวของเรา
        </p>
      </div>
    </div>
  )
}
