
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { nutritionTable, usersTable } from '../db/schema';
import { type CreateNutritionInput } from '../schema';
import { createNutrition } from '../handlers/create_nutrition';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  onboarding_completed: false
};

// Simple test input
const testInput: CreateNutritionInput = {
  user_id: 1, // Will be set after user creation
  meal_type: 'breakfast',
  food_item: 'Oatmeal with berries',
  quantity: '1 cup',
  calories: 350,
  protein: 12.5,
  carbs: 65.0,
  fat: 6.2,
  notes: 'Added honey for sweetness',
  recorded_at: new Date('2024-01-15T08:00:00Z')
};

describe('createNutrition', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a nutrition entry', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await createNutrition({
      ...testInput,
      user_id: userId
    });

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.meal_type).toEqual('breakfast');
    expect(result.food_item).toEqual('Oatmeal with berries');
    expect(result.quantity).toEqual('1 cup');
    expect(result.calories).toEqual(350);
    expect(typeof result.calories).toBe('number');
    expect(result.protein).toEqual(12.5);
    expect(typeof result.protein).toBe('number');
    expect(result.carbs).toEqual(65.0);
    expect(typeof result.carbs).toBe('number');
    expect(result.fat).toEqual(6.2);
    expect(typeof result.fat).toBe('number');
    expect(result.notes).toEqual('Added honey for sweetness');
    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save nutrition entry to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await createNutrition({
      ...testInput,
      user_id: userId
    });

    // Query using proper drizzle syntax
    const nutritionEntries = await db.select()
      .from(nutritionTable)
      .where(eq(nutritionTable.id, result.id))
      .execute();

    expect(nutritionEntries).toHaveLength(1);
    const entry = nutritionEntries[0];
    expect(entry.user_id).toEqual(userId);
    expect(entry.meal_type).toEqual('breakfast');
    expect(entry.food_item).toEqual('Oatmeal with berries');
    expect(entry.quantity).toEqual('1 cup');
    expect(entry.calories).toEqual(350);
    expect(entry.protein).toEqual(12.5);
    expect(entry.carbs).toEqual(65.0);
    expect(entry.fat).toEqual(6.2);
    expect(entry.notes).toEqual('Added honey for sweetness');
    expect(entry.recorded_at).toBeInstanceOf(Date);
    expect(entry.created_at).toBeInstanceOf(Date);
  });

  it('should handle optional fields correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const minimalInput: CreateNutritionInput = {
      user_id: userId,
      meal_type: 'snack',
      food_item: 'Apple',
      quantity: '1 medium'
    };

    const result = await createNutrition(minimalInput);

    expect(result.user_id).toEqual(userId);
    expect(result.meal_type).toEqual('snack');
    expect(result.food_item).toEqual('Apple');
    expect(result.quantity).toEqual('1 medium');
    expect(result.calories).toBeUndefined();
    expect(result.protein).toBeUndefined();
    expect(result.carbs).toBeUndefined();
    expect(result.fat).toBeUndefined();
    expect(result.notes).toBeNull();
    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const invalidInput: CreateNutritionInput = {
      user_id: 999,
      meal_type: 'lunch',
      food_item: 'Test Food',
      quantity: '1 serving'
    };

    await expect(createNutrition(invalidInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
