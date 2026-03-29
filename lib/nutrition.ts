// =============================================
// Nutrition Calculations
// =============================================

export type ActivityLevel = 'sedentary' | 'light_active' | 'moderate_active' | 'very_active'
export type Goal = 'lose_weight' | 'maintain' | 'gain_muscle'

export interface UserBody {
  weight_kg: number
  height_cm: number
  age: number
  gender: 'male' | 'female' | 'other'
}

export interface NutritionTargets {
  bmr: number
  tdee: number
  target_calories: number
  target_protein_g: number
  target_carbs_g: number
  target_fat_g: number
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:        1.2,
  light_active:     1.375,
  moderate_active:  1.55,
  very_active:      1.725,
}

const PROGRAM_LABELS: Record<ActivityLevel, string> = {
  sedentary:        'นั่งทำงาน / ไม่ค่อยขยับ',
  light_active:     'ออกกำลังกายเบา 1-3 วัน/สัปดาห์',
  moderate_active:  'ออกกำลังกายหนัก 3-5 วัน/สัปดาห์',
  very_active:      'นักกีฬา / ออกกำลังกายทุกวัน',
}

export { PROGRAM_LABELS }

/**
 * Mifflin-St Jeor Equation for BMR
 */
export function calculateBMR(body: UserBody): number {
  const { weight_kg, height_cm, age, gender } = body
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return gender === 'female' ? base - 161 : base + 5
}

export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activity]
}

export function calculateTargets(
  body: UserBody,
  activity: ActivityLevel,
  goal: Goal
): NutritionTargets {
  const bmr = calculateBMR(body)
  const tdee = calculateTDEE(bmr, activity)

  // Calorie adjustment based on goal
  const calorieAdjust: Record<Goal, number> = {
    lose_weight:  -300,
    maintain:     0,
    gain_muscle:  +250,
  }
  const target_calories = Math.round(tdee + calorieAdjust[goal])

  // Protein targets (g/kg body weight)
  const proteinMultiplier: Record<ActivityLevel, number> = {
    sedentary:       0.8,
    light_active:    1.2,
    moderate_active: 1.6,
    very_active:     2.0,
  }
  // Bump protein for muscle gain
  const proteinMult = goal === 'gain_muscle'
    ? Math.min(proteinMultiplier[activity] + 0.2, 2.2)
    : proteinMultiplier[activity]

  const target_protein_g = Math.round(body.weight_kg * proteinMult)

  // Fat: ~25% of calories
  const target_fat_g = Math.round((target_calories * 0.25) / 9)

  // Carbs: remaining calories
  const proteinCals = target_protein_g * 4
  const fatCals = target_fat_g * 9
  const target_carbs_g = Math.round((target_calories - proteinCals - fatCals) / 4)

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target_calories,
    target_protein_g,
    target_carbs_g,
    target_fat_g,
  }
}

export function getProteinProgressColor(current: number, target: number): string {
  const pct = current / target
  if (pct >= 1) return 'text-green-600'
  if (pct >= 0.7) return 'text-amber-500'
  return 'text-red-500'
}

export function getMacroPercent(current: number, target: number): number {
  return Math.min(Math.round((current / target) * 100), 100)
}
