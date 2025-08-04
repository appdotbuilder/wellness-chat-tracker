
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, wellbeingTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getWellbeing } from '../handlers/get_wellbeing';

// Test data
const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com'
};

describe('getWellbeing', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return wellbeing entries for a user', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create wellbeing entry
    await db.insert(wellbeingTable)
      .values({
        user_id: userId,
        mood: 'good',
        stress_level: 'low',
        energy_level: 'high',
        notes: 'Feeling great today!',
        recorded_at: new Date('2023-12-01T10:00:00Z')
      })
      .execute();

    const results = await getWellbeing(userId);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toEqual(userId);
    expect(results[0].mood).toEqual('good');
    expect(results[0].stress_level).toEqual('low');
    expect(results[0].energy_level).toEqual('high');
    expect(results[0].notes).toEqual('Feeling great today!');
    expect(results[0].recorded_at).toBeInstanceOf(Date);
    expect(results[0].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array for user with no wellbeing entries', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    const results = await getWellbeing(userId);

    expect(results).toHaveLength(0);
  });

  it('should filter wellbeing entries by date', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create wellbeing entries on different dates
    const today = new Date('2023-12-01T10:00:00Z');
    const yesterday = new Date('2023-11-30T15:00:00Z');
    
    await db.insert(wellbeingTable)
      .values([
        {
          user_id: userId,
          mood: 'good',
          stress_level: 'low',
          energy_level: 'high',
          recorded_at: today,
          notes: 'Today entry'
        },
        {
          user_id: userId,
          mood: 'neutral',
          stress_level: 'moderate',
          energy_level: 'moderate',
          recorded_at: yesterday,
          notes: 'Yesterday entry'
        }
      ])
      .execute();

    // Get entries for today only
    const results = await getWellbeing(userId, today);

    expect(results).toHaveLength(1);
    expect(results[0].notes).toEqual('Today entry');
    expect(results[0].recorded_at.getDate()).toEqual(today.getDate());
  });

  it('should return only entries for the specified user', async () => {
    // Create two test users
    const user1 = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user2 = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'test2@example.com'
      })
      .returning()
      .execute();

    // Create wellbeing entries for both users
    await db.insert(wellbeingTable)
      .values([
        {
          user_id: user1[0].id,
          mood: 'good',
          stress_level: 'low',
          energy_level: 'high',
          recorded_at: new Date('2023-12-01T10:00:00Z'),
          notes: 'User 1 entry'
        },
        {
          user_id: user2[0].id,
          mood: 'neutral',
          stress_level: 'moderate',
          energy_level: 'moderate',
          recorded_at: new Date('2023-12-01T10:00:00Z'),
          notes: 'User 2 entry'
        }
      ])
      .execute();

    const results = await getWellbeing(user1[0].id);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toEqual(user1[0].id);
    expect(results[0].notes).toEqual('User 1 entry');
  });

  it('should handle multiple wellbeing entries for same user', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create multiple wellbeing entries
    await db.insert(wellbeingTable)
      .values([
        {
          user_id: userId,
          mood: 'excellent',
          stress_level: 'very_low',
          energy_level: 'very_high',
          recorded_at: new Date('2023-12-01T09:00:00Z'),
          notes: 'Morning entry'
        },
        {
          user_id: userId,
          mood: 'good',
          stress_level: 'low',
          energy_level: 'high',
          recorded_at: new Date('2023-12-01T20:00:00Z'),
          notes: 'Evening entry'
        }
      ])
      .execute();

    const results = await getWellbeing(userId);

    expect(results).toHaveLength(2);
    expect(results.every(entry => entry.user_id === userId)).toBe(true);
    
    const notes = results.map(entry => entry.notes);
    expect(notes).toContain('Morning entry');
    expect(notes).toContain('Evening entry');
  });

  it('should filter out entries with "fair" mood', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = users[0].id;

    // Create wellbeing entries including one with "fair" mood
    await db.insert(wellbeingTable)
      .values([
        {
          user_id: userId,
          mood: 'good',
          stress_level: 'low',
          energy_level: 'high',
          recorded_at: new Date('2023-12-01T10:00:00Z'),
          notes: 'Good entry'
        },
        {
          user_id: userId,
          mood: 'fair',
          stress_level: 'moderate',
          energy_level: 'moderate',
          recorded_at: new Date('2023-12-01T11:00:00Z'),
          notes: 'Fair entry'
        }
      ])
      .execute();

    const results = await getWellbeing(userId);

    // Should only return the "good" entry, filtering out the "fair" one
    expect(results).toHaveLength(1);
    expect(results[0].mood).toEqual('good');
    expect(results[0].notes).toEqual('Good entry');
  });
});
