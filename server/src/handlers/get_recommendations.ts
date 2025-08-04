
import { db } from '../db';
import { recommendationsTable } from '../db/schema';
import { type Recommendation } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export const getRecommendations = async (userId: number, unreadOnly?: boolean): Promise<Recommendation[]> => {
  try {
    // Build the where condition
    const whereCondition = unreadOnly 
      ? and(
          eq(recommendationsTable.user_id, userId),
          eq(recommendationsTable.is_read, false)
        )
      : eq(recommendationsTable.user_id, userId);

    // Execute query with all clauses in one chain
    const results = await db.select()
      .from(recommendationsTable)
      .where(whereCondition)
      .orderBy(
        desc(recommendationsTable.priority),
        desc(recommendationsTable.created_at)
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    throw error;
  }
};
