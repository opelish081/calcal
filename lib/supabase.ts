import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Browser client (for client components) — lazy to avoid crash when env missing
export const supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null as any

// Server client with service role (for API routes only)
export const supabaseAdmin = supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null as any

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          weight_kg: number | null
          height_cm: number | null
          age: number | null
          gender: 'male' | 'female' | 'other' | null
          line_user_id: string | null
          line_link_token: string | null
          created_at: string
          updated_at: string
        }
      }
      user_programs: {
        Row: {
          id: string
          user_id: string
          program_type: string
          bmr: number | null
          tdee: number | null
          target_calories: number | null
          target_protein_g: number | null
          target_carbs_g: number | null
          target_fat_g: number | null
          goal: string | null
          is_active: boolean
          started_at: string
          ended_at: string | null
          quiz_answers: Record<string, unknown> | null
          created_at: string
        }
      }
      food_logs: {
        Row: {
          id: string
          user_id: string
          food_name: string
          amount_g: number | null
          meal_type: string
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          fiber_g: number
          source: string
          ai_analysis: Record<string, unknown> | null
          logged_at: string
          created_at: string
        }
      }
      daily_summaries: {
        Row: {
          id: string
          user_id: string
          summary_date: string
          total_calories: number
          total_protein_g: number
          total_carbs_g: number
          total_fat_g: number
          calories_goal: number | null
          protein_goal: number | null
          goal_met: boolean
        }
      }
    }
  }
}
