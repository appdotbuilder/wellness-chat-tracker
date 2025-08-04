
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { sleepTable, usersTable } from '../db/schema';
import { type CreateSleepInput } from '../schema';
import { createSleep } from '../handlers/create_sleep';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  onboarding_completed: false
};

// Test sleep input
const testInput: CreateSleepInput = {
  user_id: 1,
  bedtime: new Date('2024-01-15T22:30:00Z'),
  wake_time: new Date('2024-01-16T07:00:00Z'),
  sleep_quality: 'good',
  notes: 'Good night sleep',
  recorded_at: new Date('2024-01-16T07:00:00Z')
};

describe('createSleep', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();
  });

  it('should create a sleep entry', async () => {
    const result = await createSleep(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(1);
    expect(result.bedtime).toEqual(testInput.bedtime);
    expect(result.wake_time).toEqual(testInput.wake_time);
    expect(result.sleep_quality).toEqual('good');
    expect(result.notes).toEqual('Good night sleep');
    expect(result.recorded_at).toEqual(testInput.recorded_at!);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should calculate sleep duration correctly', async () => {
    const result = await createSleep(testInput);

    // Expected duration: 8.5 hours (22:30 to 07:00)
    expect(result.sleep_duration_hours).toEqual(8.5);
  });

  it('should save sleep entry to database', async () => {
    const result = await createSleep(testInput);

    // Query database to verify record was saved
    const sleepEntries = await db.select()
      .from(sleepTable)
      .where(eq(sleepTable.id, result.id))
      .execute();

    expect(sleepEntries).toHaveLength(1);
    const savedEntry = sleepEntries[0];
    expect(savedEntry.user_id).toEqual(1);
    expect(savedEntry.bedtime).toEqual(testInput.bedtime);
    expect(savedEntry.wake_time).toEqual(testInput.wake_time);
    expect(savedEntry.sleep_duration_hours).toEqual(8.5);
    expect(savedEntry.sleep_quality).toEqual('good');
    expect(savedEntry.notes).toEqual('Good night sleep');
    expect(savedEntry.created_at).toBeInstanceOf(Date);
  });

  it('should handle optional fields', async () => {
    const minimalInput: CreateSleepInput = {
      user_id: 1,
      bedtime: new Date('2024-01-15T23:00:00Z'),
      wake_time: new Date('2024-01-16T06:30:00Z')
    };

    const result = await createSleep(minimalInput);

    expect(result.user_id).toEqual(1);
    expect(result.bedtime).toEqual(minimalInput.bedtime);
    expect(result.wake_time).toEqual(minimalInput.wake_time);
    expect(result.sleep_duration_hours).toEqual(7.5);
    expect(result.sleep_quality).toBeUndefined();
    expect(result.notes).toBeNull();
    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle cross-day sleep correctly', async () => {
    const crossDayInput: CreateSleepInput = {
      user_id: 1,
      bedtime: new Date('2024-01-15T23:45:00Z'),
      wake_time: new Date('2024-01-16T08:15:00Z')
    };

    const result = await createSleep(crossDayInput);

    // Expected duration: 8.5 hours (23:45 to 08:15 next day)
    expect(result.sleep_duration_hours).toEqual(8.5);
  });

  it('should handle short sleep duration', async () => {
    const shortSleepInput: CreateSleepInput = {
      user_id: 1,
      bedtime: new Date('2024-01-16T02:00:00Z'),
      wake_time: new Date('2024-01-16T06:00:00Z')
    };

    const result = await createSleep(shortSleepInput);

    // Expected duration: 4 hours
    expect(result.sleep_duration_hours).toEqual(4);
  });
});
