
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { activitiesTable, usersTable } from '../db/schema';
import { type CreateActivityInput } from '../schema';
import { createActivity } from '../handlers/create_activity';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateActivityInput = {
  user_id: 1,
  activity_type: 'Running',
  duration_minutes: 30,
  calories_burned: 300,
  intensity: 'moderate',
  notes: 'Morning run in the park',
  recorded_at: new Date('2024-01-15T08:00:00Z')
};

describe('createActivity', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create a test user first (foreign key requirement)
    await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .execute();
  });
  
  afterEach(resetDB);

  it('should create an activity', async () => {
    const result = await createActivity(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(1);
    expect(result.activity_type).toEqual('Running');
    expect(result.duration_minutes).toEqual(30);
    expect(result.calories_burned).toEqual(300);
    expect(result.intensity).toEqual('moderate');
    expect(result.notes).toEqual('Morning run in the park');
    expect(result.recorded_at).toEqual(testInput.recorded_at!);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save activity to database', async () => {
    const result = await createActivity(testInput);

    // Query using proper drizzle syntax
    const activities = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, result.id))
      .execute();

    expect(activities).toHaveLength(1);
    expect(activities[0].user_id).toEqual(1);
    expect(activities[0].activity_type).toEqual('Running');
    expect(activities[0].duration_minutes).toEqual(30);
    expect(activities[0].calories_burned).toEqual(300);
    expect(activities[0].intensity).toEqual('moderate');
    expect(activities[0].notes).toEqual('Morning run in the park');
    expect(activities[0].recorded_at).toEqual(testInput.recorded_at!);
    expect(activities[0].created_at).toBeInstanceOf(Date);
  });

  it('should create activity with minimal required fields', async () => {
    const minimalInput: CreateActivityInput = {
      user_id: 1,
      activity_type: 'Walking',
      duration_minutes: 15
    };

    const result = await createActivity(minimalInput);

    expect(result.user_id).toEqual(1);
    expect(result.activity_type).toEqual('Walking');
    expect(result.duration_minutes).toEqual(15);
    expect(result.calories_burned).toBeUndefined();
    expect(result.intensity).toBeUndefined();
    expect(result.notes).toBeNull();
    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should use current time when recorded_at is not provided', async () => {
    const inputWithoutRecordedAt: CreateActivityInput = {
      user_id: 1,
      activity_type: 'Cycling',
      duration_minutes: 45
    };

    const before = new Date();
    const result = await createActivity(inputWithoutRecordedAt);
    const after = new Date();

    expect(result.recorded_at).toBeInstanceOf(Date);
    expect(result.recorded_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.recorded_at.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should handle different intensity levels', async () => {
    const intensityLevels: Array<'low' | 'moderate' | 'high'> = ['low', 'moderate', 'high'];
    
    for (const intensity of intensityLevels) {
      const input: CreateActivityInput = {
        user_id: 1,
        activity_type: 'Test Activity',
        duration_minutes: 20,
        intensity
      };

      const result = await createActivity(input);
      expect(result.intensity).toEqual(intensity);
    }
  });
});
