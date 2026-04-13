import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const appBaseUrl = (process.env.NEXTAUTH_URL || 'https://calcal.vercel.app').replace(/\/$/, '')
const profileUrl = `${appBaseUrl}/profile`

function verifyLineSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET!)
    .update(body)
    .digest('base64')
  return hash === signature
}

async function getLineImageContent(messageId: string): Promise<Buffer> {
  const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
  })
  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer)
}

async function sendLineMessage(endpoint: 'reply' | 'push', payload: Record<string, unknown>) {
  const response = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LINE ${endpoint} failed: ${response.status} ${errorText}`)
  }
}

async function replyToLine(replyToken: string, text: string) {
  await sendLineMessage('reply', {
    replyToken,
    messages: [{ type: 'text', text }],
  })
}

async function pushToLine(to: string, text: string) {
  await sendLineMessage('push', {
    to,
    messages: [{ type: 'text', text }],
  })
}

const FOOD_PROMPT = `Analyze this food image. Return ONLY valid JSON:
{
  "foods": [{"name": "ชื่ออาหาร", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "amount_g": 0}],
  "total": {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0},
  "meal_type_suggestion": "breakfast|lunch|dinner|snack",
  "notes": "สรุปสั้นๆ เป็นภาษาไทย"
}`

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') || ''

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  const body = JSON.parse(rawBody)
  const events = body.events || []

  for (const event of events) {
    if (event.type !== 'message') continue

    const { replyToken, source, message } = event
    const lineUserId = source.userId

    if (!lineUserId) {
      await replyToLine(replyToken, 'ตอนนี้บอทรองรับเฉพาะการคุยแบบ 1:1 กับ LINE Official Account')
      continue
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    if (message.type === 'text') {
      const text = message.text?.trim()

      if (text?.startsWith('/link ')) {
        const token = text.replace('/link ', '').trim().toUpperCase()
        const { data: linkData } = await supabaseAdmin
          .from('user_profiles')
          .select('id, name')
          .eq('line_link_token', token)
          .maybeSingle()

        if (!linkData) {
          await replyToLine(replyToken, '❌ Token ไม่ถูกต้อง กรุณาไปที่เว็บไซต์เพื่อรับ token ใหม่')
          continue
        }

        const { data: existingLinkedProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('line_user_id', lineUserId)
          .maybeSingle()

        if (existingLinkedProfile && existingLinkedProfile.id !== linkData.id) {
          await supabaseAdmin
            .from('user_profiles')
            .update({
              line_user_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingLinkedProfile.id)
        }

        const { error: linkError } = await supabaseAdmin
          .from('user_profiles')
          .update({
            line_user_id: lineUserId,
            line_link_token: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', linkData.id)

        if (linkError) {
          console.error('LINE link error:', linkError)
          await replyToLine(replyToken, '❌ เชื่อมต่อบัญชีไม่สำเร็จ กรุณาลองสร้าง token ใหม่จากเว็บไซต์')
          continue
        }

        await replyToLine(replyToken, `✅ เชื่อมต่อบัญชีสำเร็จ! สวัสดี ${linkData.name}\nส่งรูปอาหารมาได้เลย แล้วผมจะวิเคราะห์ให้\nพิมพ์ /today เพื่อดูสรุปวันนี้`)
        continue
      }

      if (text === '/unlink') {
        if (!profile) {
          await replyToLine(replyToken, `⚠️ ยังไม่ได้เชื่อมต่อบัญชี\nเข้าไปสร้าง token ได้ที่ ${profileUrl}`)
          continue
        }

        const { error: unlinkError } = await supabaseAdmin
          .from('user_profiles')
          .update({
            line_user_id: null,
            line_link_token: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id)

        if (unlinkError) {
          console.error('LINE unlink error:', unlinkError)
          await replyToLine(replyToken, '❌ ยกเลิกการเชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
          continue
        }

        await replyToLine(replyToken, '✅ ยกเลิกการเชื่อมต่อ LINE แล้ว\nหากต้องการเชื่อมใหม่ ให้สร้าง token ใหม่จากหน้าโปรไฟล์')
        continue
      }

      if (!profile) {
        await replyToLine(replyToken, `⚠️ ยังไม่ได้เชื่อมต่อบัญชี\nพิมพ์: /link [token]\nรับ token ได้ที่ ${profileUrl}`)
        continue
      }

      if (text === '/today') {
        const today = new Date().toISOString().split('T')[0]
        const { data: summary } = await supabaseAdmin
          .from('daily_summaries')
          .select('*')
          .eq('user_id', profile.id)
          .eq('summary_date', today)
          .maybeSingle()

        if (summary) {
          await replyToLine(
            replyToken,
            `📊 สรุปวันนี้\n\n` +
              `🔥 แคลอรี่: ${Math.round(summary.total_calories)} kcal\n` +
              `💪 โปรตีน: ${Math.round(summary.total_protein_g)}g\n` +
              `🍞 คาร์บ: ${Math.round(summary.total_carbs_g)}g\n` +
              `🫒 ไขมัน: ${Math.round(summary.total_fat_g)}g`
          )
        } else {
          await replyToLine(replyToken, '📋 ยังไม่มีข้อมูลการกินวันนี้\nส่งรูปอาหารมาเลย!')
        }
        continue
      }

      await replyToLine(replyToken, '📸 ส่งรูปอาหารมาได้เลย ผมจะวิเคราะห์แคลและโปรตีนให้\nพิมพ์ /today เพื่อดูสรุปวันนี้\nพิมพ์ /unlink หากต้องการยกเลิกการเชื่อมต่อ')
      continue
    }

    if (message.type === 'image') {
      if (!profile) {
        await replyToLine(replyToken, '⚠️ กรุณาเชื่อมต่อบัญชีก่อน\nพิมพ์: /link [token]')
        continue
      }

      try {
        await replyToLine(replyToken, '🔍 กำลังวิเคราะห์อาหาร...')

        const imageBuffer = await getLineImageContent(message.id)
        const base64 = imageBuffer.toString('base64')

        const response = await anthropic.messages.create({
          model: 'claude-opus-4-20250514',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              { type: 'text', text: FOOD_PROMPT },
            ],
          }],
        })

        const textContent = response.content.find((content) => content.type === 'text')?.text || '{}'
        const analysis = JSON.parse(textContent.replace(/```json|```/g, '').trim())

        const today = new Date().toISOString().split('T')[0]
        for (const food of analysis.foods || []) {
          await supabaseAdmin.from('food_logs').insert({
            user_id: profile.id,
            food_name: food.name,
            calories: food.calories,
            protein_g: food.protein_g,
            carbs_g: food.carbs_g,
            fat_g: food.fat_g,
            amount_g: food.amount_g,
            meal_type: analysis.meal_type_suggestion || 'snack',
            source: 'line_photo',
            logged_at: today,
            ai_analysis: food,
          })
        }

        const total = analysis.total
        const foodList = (analysis.foods || []).map((food: { name: string }) => `• ${food.name}`).join('\n')
        await pushToLine(
          lineUserId,
          `✅ บันทึกเรียบร้อย!\n\n${foodList}\n\n` +
            `🔥 แคลอรี่รวม: ${total?.calories || 0} kcal\n` +
            `💪 โปรตีน: ${total?.protein_g || 0}g\n` +
            `🍞 คาร์บ: ${total?.carbs_g || 0}g\n\n` +
            `${analysis.notes || ''}`
        )
      } catch (error) {
        console.error('LINE analysis error:', error)
        await pushToLine(lineUserId, '❌ เกิดข้อผิดพลาด กรุณาลองใหม่')
      }
    }
  }

  return NextResponse.json({ ok: true })
}
