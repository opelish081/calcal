import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'CalCal — จดบันทึกอาหาร ง่ายๆ',
  description: 'บันทึกแคลอรี่และโปรตีน วิเคราะห์ด้วย AI ดู dashboard รายวันรายสัปดาห์',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {children}
          <Toaster position="top-center" toastOptions={{ className: 'text-sm font-sans' }} />
        </Providers>
      </body>
    </html>
  )
}
