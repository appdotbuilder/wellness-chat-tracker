
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, nutritionTable } from '../db/schema';
import { type CreateUserInput, type CreateNutritionInput } from '../schema';
import { getNutrition } from '../handlers/get_nutrition';

describe('getNutrition', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUser: CreateUserInput = {
    name: 'Test User',
    email: 'test@example.com'
  };

  it('should return empty array for user with no nutrition entries', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const result = await getNutrition(userResult[0].id);

    expect(result).toEqual([]);
  });

  it('should return all nutrition entries for user without date filter', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create nutrition entries - numbers work directly for real columns
    await db.insert(nutritionTable)
      .values([
        {
          user_id: userId,
          meal_type: 'breakfast',
          food_item: 'Oatmeal',
          quantity: '1 cup',
          calories: 150,
          protein: 5,
          carbs: 30,
          fat: 3,
          recorded_at: new Date('2024-01-15T08:00:00Z')
        },
        {
          user_id: userId,
          meal_type: 'lunch',
          food_item: 'Chicken salad',
          quantity: '1 serving',
          calories: 350,
          protein: 25,
          carbs: 15,
          fat: 20,
          recorded_at: new Date('2024-01-15T12:00:00Z')
        }
      ])
      .execute();

    const result = await getNutrition(userId);

    expect(result).toHaveLength(2);
    expect(result[0].food_item).toEqual('Oatmeal');
    expect(result[0].meal_type).toEqual('breakfast');
    expect(result[0].calories).toEqual(150);
    expect(typeof result[0].calories).toBe('number');
    expect(result[0].protein).toEqual(5);
    expect(typeof result[0].protein).toBe('number');
    expect(result[1].food_item).toEqual('Chicken salad');
    expect(result[1].meal_type).toEqual('lunch');
  });

  it('should filter nutrition entries by date', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create nutrition entries for different dates
    await db.insert(nutritionTable)
      .values([
        {
          user_id: userId,
          meal_type: 'breakfast',
          food_item: 'Toast',
          quantity: '2 slices',
          calories: 200,
          recorded_at: new Date('2024-01-15T08:00:00Z')
        },
        {
          user_id: userId,
          meal_type: 'lunch',
          food_item: 'Soup',
          quantity: '1 bowl',
          calories: 150,
          recorded_at: new Date('2024-01-16T12:00:00Z')
        }
      ])
      .execute();

    // Filter for specific date
    const filterDate = new Date('2024-01-15');
    const result = await getNutrition(userId, filterDate);

    expect(result).toHaveLength(1);
    expect(result[0].food_item).toEqual('Toast');
    expect(result[0].recorded_at).toBeInstanceOf(Date);
  });

  it('should only return nutrition entries for specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({ ...testUser, email: 'user1@example.com' })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({ ...testUser, email: 'user2@example.com' })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create nutrition entries for both users
    await db.insert(nutritionTable)
      .values([
        {
          user_id: user1Id,
          meal_type: 'breakfast',
          food_item: 'User1 Breakfast',
          quantity: '1 serving',
          recorded_at: new Date()
        },
        {
          user_id: user2Id,
          meal_type: 'breakfast',
          food_item: 'User2 Breakfast',
          quantity: '1 serving',
          recorded_at: new Date()
        }
      ])
      .execute();

    const result = await getNutrition(user1Id);

    expect(result).toHaveLength(1);
    expect(result[0].food_item).toEqual('User1 Breakfast');
    expect(result[0].user_id).toEqual(user1Id);
  });

  it('should handle nutrition entries with optional fields', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create nutrition entry with minimal required fields
    await db.insert(nutritionTable)
      .values({
        user_id: userId,
        meal_type: 'snack',
        food_item: 'Apple',
        quantity: '1 medium',
        recorded_at: new Date()
      })
      .execute();

    const result = await getNutrition(userId);

    expect(result).toHaveLength(1);
    expect(result[0].food_item).toEqual('Apple');
    expect(result[0].calories).toBeUndefined();
    expect(result[0].protein).toBeUndefined();
    expect(result[0].carbs).toBeUndefined();
    expect(result[0].fat).toBeUndefined();
    expect(result[0].notes).toBeNull();
  });
});
