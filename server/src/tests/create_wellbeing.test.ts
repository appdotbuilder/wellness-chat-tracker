
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, wellbeingTable } from '../db/schema';
import { type CreateWellbeingInput } from '../schema';
import { createWellbeing } from '../handlers/create_wellbeing';
import { eq } from 'drizzle-orm';

describe('createWellbeing', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  const testInput: CreateWellbeingInput = {
    user_id: 0, // Will be set to testUserId in tests
    mood: 'good',
    stress_level: 'moderate',
    energy_level: 'high',
    notes: 'Feeling great today!',
    recorded_at: new Date('2024-01-15T10:00:00Z')
  };

  it('should create a wellbeing entry', async () => {
    const input = { ...testInput, user_id: testUserId };
    const result = await createWellbeing(input);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.mood).toEqual('good');
    expect(result.stress_level).toEqual('moderate');
    expect(result.energy_level).toEqual('high');
    expect(result.notes).toEqual('Feeling great today!');
    expect(result.recorded_at).toEqual(input.recorded_at!);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save wellbeing entry to database', async () => {
    const input = { ...testInput, user_id: testUserId };
    const result = await createWellbeing(input);

    // Query database to verify entry was saved
    const wellbeingEntries = await db.select()
      .from(wellbeingTable)
      .where(eq(wellbeingTable.id, result.id))
      .execute();

    expect(wellbeingEntries).toHaveLength(1);
    expect(wellbeingEntries[0].user_id).toEqual(testUserId);
    expect(wellbeingEntries[0].mood).toEqual('good');
    expect(wellbeingEntries[0].stress_level).toEqual('moderate');
    expect(wellbeingEntries[0].energy_level).toEqual('high');
    expect(wellbeingEntries[0].notes).toEqual('Feeling great today!');
    expect(wellbeingEntries[0].recorded_at).toEqual(input.recorded_at!);
    expect(wellbeingEntries[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle optional fields correctly', async () => {
    const minimalInput: CreateWellbeingInput = {
      user_id: testUserId,
      mood: 'neutral',
      stress_level: 'low',
      energy_level: 'moderate'
    };

    const result = await createWellbeing(minimalInput);

    expect(result.user_id).toEqual(testUserId);
    expect(result.mood).toEqual('neutral');
    expect(result.stress_level).toEqual('low');
    expect(result.energy_level).toEqual('moderate');
    expect(result.notes).toBeNull();
    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should use current date when recorded_at is not provided', async () => {
    const beforeCreate = new Date();
    const input = {
      user_id: testUserId,
      mood: 'excellent' as const,
      stress_level: 'very_low' as const,
      energy_level: 'very_high' as const
    };

    const result = await createWellbeing(input);
    const afterCreate = new Date();

    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.recorded_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.recorded_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });

  it('should handle different enum values correctly', async () => {
    const extremeInput: CreateWellbeingInput = {
      user_id: testUserId,
      mood: 'very_poor',
      stress_level: 'very_high',
      energy_level: 'very_low',
      notes: 'Having a rough day'
    };

    const result = await createWellbeing(extremeInput);

    expect(result.mood).toEqual('very_poor');
    expect(result.stress_level).toEqual('very_high');
    expect(result.energy_level).toEqual('very_low');
    expect(result.notes).toEqual('Having a rough day');
  });
});
