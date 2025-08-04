
import { db } from '../db';
import { activitiesTable } from '../db/schema';
import { type Activity } from '../schema';
import { eq, and, gte, lt } from 'drizzle-orm';

export const getActivities = async (userId: number, date?: Date): Promise<Activity[]> => {
  try {
    let results;

    if (date) {
      // If date is provided, filter activities for that specific day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      endOfDay.setHours(0, 0, 0, 0);

      results = await db.select()
        .from(activitiesTable)
        .where(
          and(
            eq(activitiesTable.user_id, userId),
            gte(activitiesTable.recorded_at, startOfDay),
            lt(activitiesTable.recorded_at, endOfDay)
          )
        )
        .execute();
    } else {
      results = await db.select()
        .from(activitiesTable)
        .where(eq(activitiesTable.user_id, userId))
        .execute();
    }

    // Convert real columns back to numbers and handle null vs undefined
    return results.map(activity => ({
      ...activity,
      calories_burned: activity.calories_burned ? parseFloat(activity.calories_burned.toString()) : undefined,
      intensity: activity.intensity || undefined
    }));
  } catch (error) {
    console.error('Failed to get activities:', error);
    throw error;
  }
};
