import type { Database } from '@/lib/supabase'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type UserProgram = Database['public']['Tables']['user_programs']['Row']

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function isProfileComplete(profile?: Pick<UserProfile, 'weight_kg' | 'height_cm' | 'age' | 'gender'> | null) {
  return !!profile
    && isPositiveNumber(profile.weight_kg)
    && isPositiveNumber(profile.height_cm)
    && isPositiveNumber(profile.age)
    && typeof profile.gender === 'string'
    && profile.gender.length > 0
}

export function isProgramComplete(
  program?: Pick<UserProgram, 'is_active' | 'target_calories' | 'target_protein_g' | 'target_carbs_g' | 'target_fat_g'> | null
) {
  return !!program
    && program.is_active
    && isPositiveNumber(program.target_calories)
    && isPositiveNumber(program.target_protein_g)
    && isPositiveNumber(program.target_carbs_g)
    && isPositiveNumber(program.target_fat_g)
}

export function isOnboardingComplete(
  profile?: Pick<UserProfile, 'weight_kg' | 'height_cm' | 'age' | 'gender'> | null,
  program?: Pick<UserProgram, 'is_active' | 'target_calories' | 'target_protein_g' | 'target_carbs_g' | 'target_fat_g'> | null
) {
  return isProfileComplete(profile) && isProgramComplete(program)
}
