# CalCal — Setup Guide

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Database**: Supabase (PostgreSQL + Auth)
- **Auth**: NextAuth.js (Google OAuth)
- **AI**: Anthropic Claude API (food image analysis)
- **Deploy**: Vercel
- **LINE Bot**: LINE Messaging API

---

## Step 1: Supabase Setup

1. สมัคร [supabase.com](https://supabase.com) → New Project
2. ไปที่ **SQL Editor** → วาง code จาก `supabase/schema.sql` → Run
3. Copy: **Project URL** และ **anon key** จาก Settings > API

---

## Step 2: Google OAuth

1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com)
2. New Project → Credentials → OAuth 2.0 Client ID
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-app.vercel.app/api/auth/callback/google`
4. Copy Client ID และ Client Secret

---

## Step 3: Anthropic API

1. สมัคร [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key
3. มี $5 free credits เริ่มต้น (~1,600 ครั้งวิเคราะห์ภาพ)

---

## Step 4: LINE Bot (Optional)

1. สมัคร [developers.line.biz](https://developers.line.biz)
2. Create Provider → New Channel → Messaging API
3. Basic Settings → copy **Channel Secret**
4. Messaging API → Issue **Channel Access Token**
5. Webhook URL จะเป็น: `https://your-app.vercel.app/api/line/webhook`

---

## Step 5: Local Development

```bash
cp .env.local.example .env.local
# แก้ไข .env.local ใส่ค่าทั้งหมด

npm install
npm run dev
```

---

## Step 6: Deploy to Vercel

```bash
npm i -g vercel
vercel
```

หรือ Connect GitHub repo บน vercel.com → ตั้งค่า Environment Variables ทั้งหมด

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=  # random 32+ chars
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ANTHROPIC_API_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

---

## Features

| Feature | Status |
|---|---|
| Google Login | ✅ |
| BMR/TDEE Calculation | ✅ |
| 4 Activity Programs | ✅ |
| Manual Food Log | ✅ |
| AI Image Analysis | ✅ Claude Vision |
| Daily Dashboard | ✅ |
| Weekly Reports | ✅ |
| LINE Bot Integration | ✅ |
| Change Program | ✅ History kept |
| Facebook Login | ⚠️ Requires Meta Business Verification |

---

## File Structure

```
app/
  page.tsx              → Landing page
  dashboard/page.tsx    → Main dashboard
  onboarding/page.tsx   → Setup wizard (4 steps)
  scan/page.tsx         → AI food photo analysis
  profile/page.tsx      → Profile + LINE linking
  reports/page.tsx      → 7/14/30 day charts
  auth/signin/page.tsx  → Google sign in
  api/
    auth/[...nextauth]/ → NextAuth handler
    food/analyze/       → Claude AI analysis
    food/log/           → CRUD food entries
    goals/              → Program management
    reports/            → Weekly data
    line/webhook/       → LINE Bot handler
components/
  dashboard/MacroRing.tsx
  dashboard/MealList.tsx
  dashboard/WeeklyChart.tsx
  food/QuickLog.tsx
lib/
  supabase.ts
  nutrition.ts          → BMR/TDEE calculations
supabase/
  schema.sql            → Database setup
```
