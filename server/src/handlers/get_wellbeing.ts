
import { db } from '../db';
import { wellbeingTable } from '../db/schema';
import { type Wellbeing } from '../schema';
import { eq, and, gte, lt } from 'drizzle-orm';

export const getWellbeing = async (userId: number, date?: Date): Promise<Wellbeing[]> => {
  try {
    let results;
    
    if (date) {
      // Filter for entries recorded on the specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      endOfDay.setHours(0, 0, 0, 0);

      results = await db.select()
        .from(wellbeingTable)
        .where(
          and(
            eq(wellbeingTable.user_id, userId),
            gte(wellbeingTable.recorded_at, startOfDay),
            lt(wellbeingTable.recorded_at, endOfDay)
          )
        )
        .execute();
    } else {
      results = await db.select()
        .from(wellbeingTable)
        .where(eq(wellbeingTable.user_id, userId))
        .execute();
    }

    // Filter out entries with "fair" mood since it's not in the Zod schema
    // and map the data to match the expected Wellbeing type
    return results
      .filter(result => result.mood !== 'fair')
      .map(result => ({
        id: result.id,
        user_id: result.user_id,
        mood: result.mood as 'very_poor' | 'poor' | 'neutral' | 'good' | 'excellent',
        stress_level: result.stress_level,
        energy_level: result.energy_level,
        notes: result.notes,
        recorded_at: result.recorded_at,
        created_at: result.created_at
      }));
  } catch (error) {
    console.error('Failed to get wellbeing entries:', error);
    throw error;
  }
};
