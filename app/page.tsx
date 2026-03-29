import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <span className="text-lg font-medium tracking-tight">CalCal</span>
        <Link href="/auth/signin" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          เข้าสู่ระบบ →
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 rounded-full px-4 py-1.5 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
          วิเคราะห์อาหารด้วย AI
        </div>
        <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-gray-900 max-w-2xl leading-tight mb-6">
          จดแคลและโปรตีน<br />
          <span className="text-gray-400">ง่ายกว่าที่คิด</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-md mb-10 leading-relaxed">
          ถ่ายรูปอาหาร — AI วิเคราะห์ให้เลย<br />
          ดู dashboard รายวันรายสัปดาห์ ส่งผ่าน LINE ได้ด้วย
        </p>
        <Link href="/auth/signin" className="btn-primary text-base px-8 py-4 rounded-2xl">
          เริ่มต้นฟรี — ใช้ Google เข้าสู่ระบบ
        </Link>
        <p className="text-xs text-gray-400 mt-4">ไม่มีค่าใช้จ่าย · ไม่ต้องใส่บัตรเครดิต</p>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto w-full px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '📸', title: 'AI วิเคราะห์ภาพ', desc: 'ถ่ายรูปอาหาร ระบบคำนวณแคล/โปรตีนให้อัตโนมัติ' },
          { icon: '📊', title: 'Dashboard รายวัน', desc: 'เห็นภาพรวมการกินทุกวัน แยก macro ชัดเจน' },
          { icon: '💬', title: 'ส่งผ่าน LINE', desc: 'ส่งรูปใน LINE บันทึกข้อมูลทันที ไม่ต้องเปิดเว็บ' },
          { icon: '🎯', title: 'เป้าหมายส่วนตัว', desc: 'คำนวณ BMR/TDEE ตามร่างกายคุณ เลือก program ได้' },
          { icon: '📅', title: 'สรุปรายสัปดาห์', desc: 'กราฟแสดงแนวโน้มการกิน เทียบกับเป้าหมาย' },
          { icon: '🥗', title: 'คำแนะนำอาหาร', desc: 'AI แนะนำเมนูให้เหมาะกับเป้าหมายของคุณ' },
        ].map(f => (
          <div key={f.title} className="card">
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-medium text-gray-900 mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
