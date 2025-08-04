
import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { type ChatMessage } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getChatMessages = async (userId: number, limit?: number): Promise<ChatMessage[]> => {
  try {
    // Build base query
    const baseQuery = db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.user_id, userId))
      .orderBy(desc(chatMessagesTable.created_at));

    // Apply limit conditionally
    const query = limit !== undefined 
      ? baseQuery.limit(limit)
      : baseQuery;

    const results = await query.execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch chat messages:', error);
    throw error;
  }
};
