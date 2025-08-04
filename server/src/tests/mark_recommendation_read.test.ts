
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, recommendationsTable } from '../db/schema';
import { markRecommendationRead } from '../handlers/mark_recommendation_read';
import { eq } from 'drizzle-orm';

describe('markRecommendationRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark a recommendation as read', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test recommendation
    const recommendationResult = await db.insert(recommendationsTable)
      .values({
        user_id: userId,
        category: 'general',
        title: 'Test Recommendation',
        description: 'A test recommendation',
        priority: 'medium',
        is_read: false
      })
      .returning()
      .execute();

    const recommendationId = recommendationResult[0].id;

    // Mark the recommendation as read
    const result = await markRecommendationRead(recommendationId);

    // Verify the result
    expect(result.id).toEqual(recommendationId);
    expect(result.user_id).toEqual(userId);
    expect(result.category).toEqual('general');
    expect(result.title).toEqual('Test Recommendation');
    expect(result.description).toEqual('A test recommendation');
    expect(result.priority).toEqual('medium');
    expect(result.is_read).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update the database record', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test recommendation
    const recommendationResult = await db.insert(recommendationsTable)
      .values({
        user_id: userId,
        category: 'activity',
        title: 'Exercise More',
        description: 'Try to get 30 minutes of exercise daily',
        priority: 'high',
        is_read: false
      })
      .returning()
      .execute();

    const recommendationId = recommendationResult[0].id;

    // Mark the recommendation as read
    await markRecommendationRead(recommendationId);

    // Verify the database was updated
    const recommendations = await db.select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.id, recommendationId))
      .execute();

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].is_read).toBe(true);
    expect(recommendations[0].title).toEqual('Exercise More');
    expect(recommendations[0].category).toEqual('activity');
  });

  it('should throw error for non-existent recommendation', async () => {
    const nonExistentId = 99999;

    await expect(markRecommendationRead(nonExistentId))
      .rejects
      .toThrow(/not found/i);
  });

  it('should handle already read recommendation', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a recommendation that's already read
    const recommendationResult = await db.insert(recommendationsTable)
      .values({
        user_id: userId,
        category: 'nutrition',
        title: 'Drink More Water',
        description: 'Aim for 8 glasses of water per day',
        priority: 'low',
        is_read: true // Already read
      })
      .returning()
      .execute();

    const recommendationId = recommendationResult[0].id;

    // Mark as read again (should still work)
    const result = await markRecommendationRead(recommendationId);

    expect(result.is_read).toBe(true);
    expect(result.title).toEqual('Drink More Water');
    expect(result.category).toEqual('nutrition');
  });
});
