
import { db } from '../db';
import { nutritionTable } from '../db/schema';
import { type CreateNutritionInput, type Nutrition } from '../schema';

export const createNutrition = async (input: CreateNutritionInput): Promise<Nutrition> => {
  try {
    // Insert nutrition record
    const result = await db.insert(nutritionTable)
      .values({
        user_id: input.user_id,
        meal_type: input.meal_type,
        food_item: input.food_item,
        quantity: input.quantity,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        notes: input.notes || null,
        recorded_at: input.recorded_at || new Date()
      })
      .returning()
      .execute();

    // Convert real fields back to numbers before returning
    const nutrition = result[0];
    return {
      ...nutrition,
      calories: nutrition.calories ? nutrition.calories : undefined,
      protein: nutrition.protein ? nutrition.protein : undefined,
      carbs: nutrition.carbs ? nutrition.carbs : undefined,
      fat: nutrition.fat ? nutrition.fat : undefined
    };
  } catch (error) {
    console.error('Nutrition creation failed:', error);
    throw error;
  }
};
