
import { db } from '../db';
import { nutritionTable } from '../db/schema';
import { type Nutrition } from '../schema';
import { eq, and, gte, lt, type SQL } from 'drizzle-orm';

export const getNutrition = async (userId: number, date?: Date): Promise<Nutrition[]> => {
  try {
    const conditions: SQL<unknown>[] = [eq(nutritionTable.user_id, userId)];

    if (date) {
      // Filter for the specific date (start of day to start of next day)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setDate(startOfNextDay.getDate() + 1);

      conditions.push(
        gte(nutritionTable.recorded_at, startOfDay),
        lt(nutritionTable.recorded_at, startOfNextDay)
      );
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    
    const results = await db.select()
      .from(nutritionTable)
      .where(whereClause)
      .execute();

    // Convert real (float) fields back to numbers, preserving null values
    return results.map(nutrition => ({
      ...nutrition,
      calories: nutrition.calories !== null ? parseFloat(nutrition.calories.toString()) : undefined,
      protein: nutrition.protein !== null ? parseFloat(nutrition.protein.toString()) : undefined,
      carbs: nutrition.carbs !== null ? parseFloat(nutrition.carbs.toString()) : undefined,
      fat: nutrition.fat !== null ? parseFloat(nutrition.fat.toString()) : undefined
    }));
  } catch (error) {
    console.error('Get nutrition failed:', error);
    throw error;
  }
};
