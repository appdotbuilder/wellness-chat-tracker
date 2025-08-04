
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { hydrationTable, usersTable } from '../db/schema';
import { type CreateHydrationInput } from '../schema';
import { createHydration } from '../handlers/create_hydration';
import { eq } from 'drizzle-orm';

describe('createHydration', () => {
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

  it('should create a hydration entry with all fields', async () => {
    const recordedAt = new Date('2023-12-01T10:00:00Z');
    const testInput: CreateHydrationInput = {
      user_id: testUserId,
      amount_ml: 500,
      beverage_type: 'water',
      recorded_at: recordedAt
    };

    const result = await createHydration(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.amount_ml).toEqual(500);
    expect(result.beverage_type).toEqual('water');
    expect(result.recorded_at).toEqual(recordedAt);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create hydration entry without optional fields', async () => {
    const testInput: CreateHydrationInput = {
      user_id: testUserId,
      amount_ml: 250
    };

    const result = await createHydration(testInput);

    expect(result.user_id).toEqual(testUserId);
    expect(result.amount_ml).toEqual(250);
    expect(result.beverage_type).toBeUndefined();
    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save hydration entry to database', async () => {
    const testInput: CreateHydrationInput = {
      user_id: testUserId,
      amount_ml: 750,
      beverage_type: 'tea'
    };

    const result = await createHydration(testInput);

    // Query database to verify persistence
    const hydrationEntries = await db.select()
      .from(hydrationTable)
      .where(eq(hydrationTable.id, result.id))
      .execute();

    expect(hydrationEntries).toHaveLength(1);
    expect(hydrationEntries[0].user_id).toEqual(testUserId);
    expect(hydrationEntries[0].amount_ml).toEqual(750);
    expect(hydrationEntries[0].beverage_type).toEqual('tea');
    expect(hydrationEntries[0].recorded_at).toBeInstanceOf(Date);
    expect(hydrationEntries[0].created_at).toBeInstanceOf(Date);
  });

  it('should use current time for recorded_at when not provided', async () => {
    const beforeCreation = new Date();
    
    const testInput: CreateHydrationInput = {
      user_id: testUserId,
      amount_ml: 300
    };

    const result = await createHydration(testInput);
    const afterCreation = new Date();

    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.recorded_at >= beforeCreation).toBe(true);
    expect(result.recorded_at <= afterCreation).toBe(true);
  });
});
