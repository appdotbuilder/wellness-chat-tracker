
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  height: z.number().positive().optional(), // in cm
  weight: z.number().positive().optional(), // in kg
  activity_level: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']).optional(),
  goals: z.string().nullable(),
  onboarding_completed: z.boolean(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Activity tracking schema
export const activitySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  activity_type: z.string(),
  duration_minutes: z.number().int().positive(),
  calories_burned: z.number().positive().optional(),
  intensity: z.enum(['low', 'moderate', 'high']).optional(),
  notes: z.string().nullable(),
  recorded_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Activity = z.infer<typeof activitySchema>;

// Nutrition tracking schema
export const nutritionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  food_item: z.string(),
  quantity: z.string(), // e.g., "1 cup", "150g"
  calories: z.number().positive().optional(),
  protein: z.number().nonnegative().optional(), // in grams
  carbs: z.number().nonnegative().optional(), // in grams
  fat: z.number().nonnegative().optional(), // in grams
  notes: z.string().nullable(),
  recorded_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Nutrition = z.infer<typeof nutritionSchema>;

// Hydration tracking schema
export const hydrationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  amount_ml: z.number().int().positive(), // in milliliters
  beverage_type: z.string().optional(), // water, tea, coffee, etc.
  recorded_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Hydration = z.infer<typeof hydrationSchema>;

// Sleep tracking schema
export const sleepSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  bedtime: z.coerce.date(),
  wake_time: z.coerce.date(),
  sleep_duration_hours: z.number().positive(),
  sleep_quality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
  notes: z.string().nullable(),
  recorded_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Sleep = z.infer<typeof sleepSchema>;

// Well-being tracking schema
export const wellbeingSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  mood: z.enum(['very_poor', 'poor', 'neutral', 'good', 'excellent']),
  stress_level: z.enum(['very_low', 'low', 'moderate', 'high', 'very_high']),
  energy_level: z.enum(['very_low', 'low', 'moderate', 'high', 'very_high']),
  notes: z.string().nullable(),
  recorded_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Wellbeing = z.infer<typeof wellbeingSchema>;

// Chat message schema
export const chatMessageSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  message: z.string(),
  message_type: z.enum(['user', 'system']),
  data_extracted: z.boolean(), // whether data was extracted and saved to trackers
  created_at: z.coerce.date()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Recommendation schema
export const recommendationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  category: z.enum(['activity', 'nutrition', 'hydration', 'sleep', 'wellbeing', 'general']),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  is_read: z.boolean(),
  created_at: z.coerce.date()
});

export type Recommendation = z.infer<typeof recommendationSchema>;

// Input schemas for creating entries
export const createUserInputSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  activity_level: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']).optional(),
  goals: z.string().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createActivityInputSchema = z.object({
  user_id: z.number(),
  activity_type: z.string(),
  duration_minutes: z.number().int().positive(),
  calories_burned: z.number().positive().optional(),
  intensity: z.enum(['low', 'moderate', 'high']).optional(),
  notes: z.string().nullable().optional(),
  recorded_at: z.coerce.date().optional()
});

export type CreateActivityInput = z.infer<typeof createActivityInputSchema>;

export const createNutritionInputSchema = z.object({
  user_id: z.number(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  food_item: z.string(),
  quantity: z.string(),
  calories: z.number().positive().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional(),
  recorded_at: z.coerce.date().optional()
});

export type CreateNutritionInput = z.infer<typeof createNutritionInputSchema>;

export const createHydrationInputSchema = z.object({
  user_id: z.number(),
  amount_ml: z.number().int().positive(),
  beverage_type: z.string().optional(),
  recorded_at: z.coerce.date().optional()
});

export type CreateHydrationInput = z.infer<typeof createHydrationInputSchema>;

export const createSleepInputSchema = z.object({
  user_id: z.number(),
  bedtime: z.coerce.date(),
  wake_time: z.coerce.date(),
  sleep_quality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
  notes: z.string().nullable().optional(),
  recorded_at: z.coerce.date().optional()
});

export type CreateSleepInput = z.infer<typeof createSleepInputSchema>;

export const createWellbeingInputSchema = z.object({
  user_id: z.number(),
  mood: z.enum(['very_poor', 'poor', 'neutral', 'good', 'excellent']),
  stress_level: z.enum(['very_low', 'low', 'moderate', 'high', 'very_high']),
  energy_level: z.enum(['very_low', 'low', 'moderate', 'high', 'very_high']),
  notes: z.string().nullable().optional(),
  recorded_at: z.coerce.date().optional()
});

export type CreateWellbeingInput = z.infer<typeof createWellbeingInputSchema>;

export const createChatMessageInputSchema = z.object({
  user_id: z.number(),
  message: z.string(),
  message_type: z.enum(['user', 'system'])
});

export type CreateChatMessageInput = z.infer<typeof createChatMessageInputSchema>;

export const createRecommendationInputSchema = z.object({
  user_id: z.number(),
  category: z.enum(['activity', 'nutrition', 'hydration', 'sleep', 'wellbeing', 'general']),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high'])
});

export type CreateRecommendationInput = z.infer<typeof createRecommendationInputSchema>;

// Update schemas
export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  age: z.number().int().positive().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  activity_level: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']).optional(),
  goals: z.string().nullable().optional(),
  onboarding_completed: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
