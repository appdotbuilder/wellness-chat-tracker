
import { db } from '../db';
import { recommendationsTable } from '../db/schema';
import { type Recommendation } from '../schema';
import { eq } from 'drizzle-orm';

export const markRecommendationRead = async (recommendationId: number): Promise<Recommendation> => {
  try {
    // Update the recommendation to mark it as read
    const result = await db.update(recommendationsTable)
      .set({ is_read: true })
      .where(eq(recommendationsTable.id, recommendationId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Recommendation with id ${recommendationId} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Failed to mark recommendation as read:', error);
    throw error;
  }
};
