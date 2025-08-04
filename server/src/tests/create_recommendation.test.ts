
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, recommendationsTable } from '../db/schema';
import { type CreateRecommendationInput, type CreateUserInput } from '../schema';
import { createRecommendation } from '../handlers/create_recommendation';
import { eq } from 'drizzle-orm';

describe('createRecommendation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first
    const testUser: CreateUserInput = {
      name: 'Test User',
      email: 'test@example.com'
    };

    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    testUserId = userResult[0].id;
  });

  it('should create a recommendation', async () => {
    const testInput: CreateRecommendationInput = {
      user_id: testUserId,
      category: 'activity',
      title: 'Increase Daily Steps',
      description: 'Try to walk at least 8,000 steps per day to improve cardiovascular health.',
      priority: 'medium'
    };

    const result = await createRecommendation(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.category).toEqual('activity');
    expect(result.title).toEqual('Increase Daily Steps');
    expect(result.description).toEqual(testInput.description);
    expect(result.priority).toEqual('medium');
    expect(result.is_read).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save recommendation to database', async () => {
    const testInput: CreateRecommendationInput = {
      user_id: testUserId,
      category: 'nutrition',
      title: 'Eat More Vegetables',
      description: 'Include at least 5 servings of vegetables in your daily meals.',
      priority: 'high'
    };

    const result = await createRecommendation(testInput);

    // Query using proper drizzle syntax
    const recommendations = await db.select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.id, result.id))
      .execute();

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].user_id).toEqual(testUserId);
    expect(recommendations[0].category).toEqual('nutrition');
    expect(recommendations[0].title).toEqual('Eat More Vegetables');
    expect(recommendations[0].description).toEqual(testInput.description);
    expect(recommendations[0].priority).toEqual('high');
    expect(recommendations[0].is_read).toEqual(false);
    expect(recommendations[0].created_at).toBeInstanceOf(Date);
  });

  it('should create recommendations with different categories', async () => {
    const categories = ['activity', 'nutrition', 'hydration', 'sleep', 'wellbeing', 'general'] as const;
    
    for (const category of categories) {
      const testInput: CreateRecommendationInput = {
        user_id: testUserId,
        category,
        title: `${category} recommendation`,
        description: `This is a ${category} recommendation for testing.`,
        priority: 'low'
      };

      const result = await createRecommendation(testInput);
      expect(result.category).toEqual(category);
      expect(result.title).toEqual(`${category} recommendation`);
    }

    // Verify all recommendations were created
    const allRecommendations = await db.select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.user_id, testUserId))
      .execute();

    expect(allRecommendations).toHaveLength(categories.length);
  });

  it('should create recommendations with different priorities', async () => {
    const priorities = ['low', 'medium', 'high'] as const;
    
    for (const priority of priorities) {
      const testInput: CreateRecommendationInput = {
        user_id: testUserId,
        category: 'general',
        title: `${priority} priority recommendation`,
        description: `This is a ${priority} priority recommendation.`,
        priority
      };

      const result = await createRecommendation(testInput);
      expect(result.priority).toEqual(priority);
    }
  });
});
