
import { db } from '../db';
import { sleepTable } from '../db/schema';
import { type Sleep } from '../schema';
import { eq, gte, lt, and, asc } from 'drizzle-orm';

export const getSleep = async (userId: number, date?: Date): Promise<Sleep[]> => {
  try {
    let results;
    
    if (date) {
      // Get sleep records for the specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      results = await db.select()
        .from(sleepTable)
        .where(
          and(
            eq(sleepTable.user_id, userId),
            gte(sleepTable.recorded_at, startOfDay),
            lt(sleepTable.recorded_at, endOfDay)
          )
        )
        .orderBy(asc(sleepTable.recorded_at))
        .execute();
    } else {
      results = await db.select()
        .from(sleepTable)
        .where(eq(sleepTable.user_id, userId))
        .orderBy(asc(sleepTable.recorded_at))
        .execute();
    }

    // Transform results to match Sleep type
    return results.map(sleep => ({
      id: sleep.id,
      user_id: sleep.user_id,
      bedtime: sleep.bedtime,
      wake_time: sleep.wake_time,
      sleep_duration_hours: sleep.sleep_duration_hours,
      sleep_quality: sleep.sleep_quality === 'very_poor' || sleep.sleep_quality === 'neutral' || sleep.sleep_quality === null 
        ? undefined 
        : sleep.sleep_quality,
      notes: sleep.notes,
      recorded_at: sleep.recorded_at,
      created_at: sleep.created_at
    }));
  } catch (error) {
    console.error('Sleep retrieval failed:', error);
    throw error;
  }
};
