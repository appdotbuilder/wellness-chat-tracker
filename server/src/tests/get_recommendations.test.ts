
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, recommendationsTable } from '../db/schema';
import { type CreateUserInput, type CreateRecommendationInput } from '../schema';
import { getRecommendations } from '../handlers/get_recommendations';
import { eq } from 'drizzle-orm';

describe('getRecommendations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUser: CreateUserInput = {
    name: 'Test User',
    email: 'test@example.com'
  };

  let userId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;
  });

  it('should return empty array when user has no recommendations', async () => {
    const result = await getRecommendations(userId);
    expect(result).toEqual([]);
  });

  it('should return all recommendations for user', async () => {
    // Create test recommendations
    const recommendations: CreateRecommendationInput[] = [
      {
        user_id: userId,
        category: 'activity',
        title: 'Try walking',
        description: 'Walk for 30 minutes daily',
        priority: 'high'
      },
      {
        user_id: userId,
        category: 'nutrition',
        title: 'Eat more vegetables',
        description: 'Include vegetables in every meal',
        priority: 'medium'
      }
    ];

    await db.insert(recommendationsTable)
      .values(recommendations)
      .execute();

    const result = await getRecommendations(userId);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Try walking');
    expect(result[0].category).toEqual('activity');
    expect(result[0].priority).toEqual('high');
    expect(result[0].is_read).toEqual(false);
    expect(result[1].title).toEqual('Eat more vegetables');
    expect(result[1].category).toEqual('nutrition');
    expect(result[1].priority).toEqual('medium');
  });

  it('should return recommendations ordered by priority then creation date', async () => {
    // Create recommendations with different priorities
    const recommendations = [
      {
        user_id: userId,
        category: 'activity' as const,
        title: 'Low priority first',
        description: 'Description 1',
        priority: 'low' as const
      },
      {
        user_id: userId,
        category: 'nutrition' as const,
        title: 'High priority',
        description: 'Description 2',
        priority: 'high' as const
      },
      {
        user_id: userId,
        category: 'sleep' as const,
        title: 'Medium priority',
        description: 'Description 3',
        priority: 'medium' as const
      }
    ];

    await db.insert(recommendationsTable)
      .values(recommendations)
      .execute();

    const result = await getRecommendations(userId);

    expect(result).toHaveLength(3);
    // Should be ordered by priority: high, medium, low
    expect(result[0].priority).toEqual('high');
    expect(result[0].title).toEqual('High priority');
    expect(result[1].priority).toEqual('medium');
    expect(result[1].title).toEqual('Medium priority');
    expect(result[2].priority).toEqual('low');
    expect(result[2].title).toEqual('Low priority first');
  });

  it('should filter to unread recommendations only when unreadOnly is true', async () => {
    // Create mix of read and unread recommendations
    const recommendations = [
      {
        user_id: userId,
        category: 'activity' as const,
        title: 'Unread recommendation',
        description: 'This is unread',
        priority: 'high' as const
      }
    ];

    const insertedRecs = await db.insert(recommendationsTable)
      .values(recommendations)
      .returning()
      .execute();

    // Mark one as read
    await db.insert(recommendationsTable)
      .values({
        user_id: userId,
        category: 'nutrition',
        title: 'Read recommendation',
        description: 'This is read',
        priority: 'medium'
      })
      .execute();

    // Update the first one to be read
    await db.update(recommendationsTable)
      .set({ is_read: true })
      .where(eq(recommendationsTable.id, insertedRecs[0].id))
      .execute();

    // Test unreadOnly = true
    const unreadResult = await getRecommendations(userId, true);
    expect(unreadResult).toHaveLength(1);
    expect(unreadResult[0].title).toEqual('Read recommendation');
    expect(unreadResult[0].is_read).toEqual(false);

    // Test unreadOnly = false (default)
    const allResult = await getRecommendations(userId, false);
    expect(allResult).toHaveLength(2);
  });

  it('should not return recommendations for other users', async () => {
    // Create another user
    const otherUser = await db.insert(usersTable)
      .values({
        name: 'Other User',
        email: 'other@example.com'
      })
      .returning()
      .execute();

    // Create recommendation for other user
    await db.insert(recommendationsTable)
      .values({
        user_id: otherUser[0].id,
        category: 'activity',
        title: 'Other user recommendation',
        description: 'Should not appear',
        priority: 'high'
      })
      .execute();

    // Create recommendation for test user
    await db.insert(recommendationsTable)
      .values({
        user_id: userId,
        category: 'nutrition',
        title: 'My recommendation',
        description: 'Should appear',
        priority: 'medium'
      })
      .execute();

    const result = await getRecommendations(userId);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('My recommendation');
    expect(result[0].user_id).toEqual(userId);
  });
});
