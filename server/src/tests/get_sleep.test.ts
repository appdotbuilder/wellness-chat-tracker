
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, sleepTable } from '../db/schema';
import { getSleep } from '../handlers/get_sleep';

describe('getSleep', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sleep records exist', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const result = await getSleep(userId);

    expect(result).toEqual([]);
  });

  it('should return sleep records for a user', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create sleep records
    const bedtime = new Date('2024-01-15T22:00:00Z');
    const wakeTime = new Date('2024-01-16T06:00:00Z');
    const recordedAt = new Date('2024-01-16T06:30:00Z');

    await db.insert(sleepTable)
      .values({
        user_id: userId,
        bedtime: bedtime,
        wake_time: wakeTime,
        sleep_duration_hours: 8.0,
        sleep_quality: 'good',
        notes: 'Good night sleep',
        recorded_at: recordedAt
      })
      .execute();

    const result = await getSleep(userId);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].bedtime).toEqual(bedtime);
    expect(result[0].wake_time).toEqual(wakeTime);
    expect(result[0].sleep_duration_hours).toEqual(8.0);
    expect(typeof result[0].sleep_duration_hours).toBe('number');
    expect(result[0].sleep_quality).toEqual('good');
    expect(result[0].notes).toEqual('Good night sleep');
    expect(result[0].recorded_at).toEqual(recordedAt);
  });

  it('should filter sleep records by date', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create sleep records for different dates
    const targetDate = new Date('2024-01-15');
    const otherDate = new Date('2024-01-16');

    await db.insert(sleepTable)
      .values([
        {
          user_id: userId,
          bedtime: new Date('2024-01-14T22:00:00Z'),
          wake_time: new Date('2024-01-15T06:00:00Z'),
          sleep_duration_hours: 8.0,
          recorded_at: new Date('2024-01-15T06:30:00Z') // Target date
        },
        {
          user_id: userId,
          bedtime: new Date('2024-01-15T22:00:00Z'),
          wake_time: new Date('2024-01-16T06:00:00Z'),
          sleep_duration_hours: 8.0,
          recorded_at: new Date('2024-01-16T06:30:00Z') // Different date
        }
      ])
      .execute();

    const result = await getSleep(userId, targetDate);

    expect(result).toHaveLength(1);
    expect(result[0].recorded_at.toDateString()).toEqual(targetDate.toDateString());
  });

  it('should return sleep records ordered by recorded_at', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple sleep records with different recorded_at times
    const earlierTime = new Date('2024-01-15T06:00:00Z');
    const laterTime = new Date('2024-01-15T20:00:00Z');

    await db.insert(sleepTable)
      .values([
        {
          user_id: userId,
          bedtime: new Date('2024-01-14T22:00:00Z'),
          wake_time: new Date('2024-01-15T06:00:00Z'),
          sleep_duration_hours: 8.0,
          recorded_at: laterTime // Insert later time first
        },
        {
          user_id: userId,
          bedtime: new Date('2024-01-13T22:00:00Z'),
          wake_time: new Date('2024-01-14T06:00:00Z'),
          sleep_duration_hours: 8.0,
          recorded_at: earlierTime // Insert earlier time second
        }
      ])
      .execute();

    const result = await getSleep(userId);

    expect(result).toHaveLength(2);
    // Should be ordered by recorded_at (earliest first)
    expect(result[0].recorded_at).toEqual(earlierTime);
    expect(result[1].recorded_at).toEqual(laterTime);
  });

  it('should only return sleep records for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        name: 'User 1',
        email: 'user1@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        name: 'User 2',
        email: 'user2@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create sleep records for both users
    await db.insert(sleepTable)
      .values([
        {
          user_id: user1Id,
          bedtime: new Date('2024-01-14T22:00:00Z'),
          wake_time: new Date('2024-01-15T06:00:00Z'),
          sleep_duration_hours: 8.0,
          recorded_at: new Date('2024-01-15T06:00:00Z')
        },
        {
          user_id: user2Id,
          bedtime: new Date('2024-01-14T22:00:00Z'),
          wake_time: new Date('2024-01-15T06:00:00Z'),
          sleep_duration_hours: 7.5,
          recorded_at: new Date('2024-01-15T06:00:00Z')
        }
      ])
      .execute();

    const result = await getSleep(user1Id);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1Id);
    expect(result[0].sleep_duration_hours).toEqual(8.0);
  });

  it('should handle sleep records with null sleep_quality', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create sleep record with null sleep_quality
    await db.insert(sleepTable)
      .values({
        user_id: userId,
        bedtime: new Date('2024-01-15T22:00:00Z'),
        wake_time: new Date('2024-01-16T06:00:00Z'),
        sleep_duration_hours: 8.0,
        sleep_quality: null,
        recorded_at: new Date('2024-01-16T06:30:00Z')
      })
      .execute();

    const result = await getSleep(userId);

    expect(result).toHaveLength(1);
    expect(result[0].sleep_quality).toBeUndefined();
  });

  it('should handle sleep records with unsupported sleep_quality values', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create sleep record with 'very_poor' sleep_quality (not supported in Sleep schema)
    await db.insert(sleepTable)
      .values({
        user_id: userId,
        bedtime: new Date('2024-01-15T22:00:00Z'),
        wake_time: new Date('2024-01-16T06:00:00Z'),
        sleep_duration_hours: 8.0,
        sleep_quality: 'very_poor',
        recorded_at: new Date('2024-01-16T06:30:00Z')
      })
      .execute();

    const result = await getSleep(userId);

    expect(result).toHaveLength(1);
    expect(result[0].sleep_quality).toBeUndefined();
  });
});
