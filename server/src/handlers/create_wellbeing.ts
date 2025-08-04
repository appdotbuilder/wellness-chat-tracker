
import { db } from '../db';
import { wellbeingTable } from '../db/schema';
import { type CreateWellbeingInput, type Wellbeing } from '../schema';

export const createWellbeing = async (input: CreateWellbeingInput): Promise<Wellbeing> => {
  try {
    // Insert wellbeing record
    const result = await db.insert(wellbeingTable)
      .values({
        user_id: input.user_id,
        mood: input.mood,
        stress_level: input.stress_level,
        energy_level: input.energy_level,
        notes: input.notes || null,
        recorded_at: input.recorded_at || new Date()
      })
      .returning()
      .execute();

    const wellbeing = result[0];
    
    // Return the wellbeing entry, ensuring type compatibility
    return {
      id: wellbeing.id,
      user_id: wellbeing.user_id,
      mood: wellbeing.mood as Wellbeing['mood'],
      stress_level: wellbeing.stress_level,
      energy_level: wellbeing.energy_level,
      notes: wellbeing.notes,
      recorded_at: wellbeing.recorded_at,
      created_at: wellbeing.created_at
    };
  } catch (error) {
    console.error('Wellbeing creation failed:', error);
    throw error;
  }
};
