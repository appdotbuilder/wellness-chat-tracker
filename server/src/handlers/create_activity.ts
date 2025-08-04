
import { db } from '../db';
import { activitiesTable } from '../db/schema';
import { type CreateActivityInput, type Activity } from '../schema';

export const createActivity = async (input: CreateActivityInput): Promise<Activity> => {
  try {
    // Insert activity record
    const result = await db.insert(activitiesTable)
      .values({
        user_id: input.user_id,
        activity_type: input.activity_type,
        duration_minutes: input.duration_minutes,
        calories_burned: input.calories_burned || null,
        intensity: input.intensity || null,
        notes: input.notes || null,
        recorded_at: input.recorded_at || new Date(),
      })
      .returning()
      .execute();

    // Convert database nulls to undefined for the schema
    const activity = result[0];
    return {
      ...activity,
      calories_burned: activity.calories_burned ?? undefined,
      intensity: activity.intensity ?? undefined,
    };
  } catch (error) {
    console.error('Activity creation failed:', error);
    throw error;
  }
};
