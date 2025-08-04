
import { db } from '../db';
import { recommendationsTable } from '../db/schema';
import { type CreateRecommendationInput, type Recommendation } from '../schema';

export const createRecommendation = async (input: CreateRecommendationInput): Promise<Recommendation> => {
  try {
    // Insert recommendation record
    const result = await db.insert(recommendationsTable)
      .values({
        user_id: input.user_id,
        category: input.category,
        title: input.title,
        description: input.description,
        priority: input.priority
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Recommendation creation failed:', error);
    throw error;
  }
};
