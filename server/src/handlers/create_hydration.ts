
import { db } from '../db';
import { hydrationTable } from '../db/schema';
import { type CreateHydrationInput, type Hydration } from '../schema';

export const createHydration = async (input: CreateHydrationInput): Promise<Hydration> => {
  try {
    // Insert hydration record
    const result = await db.insert(hydrationTable)
      .values({
        user_id: input.user_id,
        amount_ml: input.amount_ml,
        beverage_type: input.beverage_type || null,
        recorded_at: input.recorded_at || new Date()
      })
      .returning()
      .execute();

    // Convert database result to match schema expectations
    const hydrationRecord = result[0];
    return {
      ...hydrationRecord,
      beverage_type: hydrationRecord.beverage_type || undefined
    };
  } catch (error) {
    console.error('Hydration creation failed:', error);
    throw error;
  }
};
