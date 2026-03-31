import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const SUPPORTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const FOOD_ANALYSIS_PROMPT = `You are a nutrition expert. Analyze this food image and return ONLY valid JSON with this structure:
{
  "foods": [
    {
      "name": "ชื่ออาหาร (Thai name if Thai food)",
      "name_en": "English name",
      "estimated_amount_g": 150,
      "calories": 250,
      "protein_g": 12,
      "carbs_g": 30,
      "fat_g": 8,
      "fiber_g": 2,
      "confidence": "high|medium|low"
    }
  ],
  "total": {
    "calories": 250,
    "protein_g": 12,
    "carbs_g": 30,
    "fat_g": 8
  },
  "meal_type_suggestion": "breakfast|lunch|dinner|snack",
  "notes": "Brief note about the meal in Thai"
}
Estimate portions based on typical serving sizes. Be accurate with Thai food — common dishes like khao pad, tom yum, pad thai, etc.`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is missing' }, { status: 503 })
    }

    const formData = await req.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (!SUPPORTED_MEDIA_TYPES.has(imageFile.type)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
    }

    if (imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
    }

    // Convert to base64
    const bytes = await imageFile.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp'

    // Analyze with Claude (image is NOT stored — analyzed in memory and discarded)
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: FOOD_ANALYSIS_PROMPT },
        ],
      }],
    })

    const textContent = response.content.find(c => c.type === 'text')?.text || '{}'
    const cleaned = textContent.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(cleaned)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Food analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
