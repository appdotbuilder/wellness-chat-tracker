
import { db } from '../db';
import { sleepTable } from '../db/schema';
import { type CreateSleepInput, type Sleep } from '../schema';

export const createSleep = async (input: CreateSleepInput): Promise<Sleep> => {
  try {
    // Calculate sleep duration from bedtime and wake time
    const sleepDurationHours = (input.wake_time.getTime() - input.bedtime.getTime()) / (1000 * 60 * 60);
    
    // Insert sleep record
    const result = await db.insert(sleepTable)
      .values({
        user_id: input.user_id,
        bedtime: input.bedtime,
        wake_time: input.wake_time,
        sleep_duration_hours: sleepDurationHours,
        sleep_quality: input.sleep_quality || null,
        notes: input.notes || null,
        recorded_at: input.recorded_at || new Date()
      })
      .returning()
      .execute();

    const sleep = result[0];
    
    // Map database sleep_quality to schema type
    const mappedSleepQuality = sleep.sleep_quality 
      ? (sleep.sleep_quality as 'poor' | 'fair' | 'good' | 'excellent')
      : undefined;
    
    return {
      ...sleep,
      sleep_quality: mappedSleepQuality
    };
  } catch (error) {
    console.error('Sleep creation failed:', error);
    throw error;
  }
};
