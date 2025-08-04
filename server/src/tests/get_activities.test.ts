
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, activitiesTable } from '../db/schema';
import { type CreateUserInput, type CreateActivityInput } from '../schema';
import { getActivities } from '../handlers/get_activities';

// Test user data
const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com',
  age: 25,
  gender: 'male',
  height: 175,
  weight: 70,
  activity_level: 'moderately_active',
  goals: 'Stay fit'
};

// Test activity data
const testActivity1: CreateActivityInput = {
  user_id: 1, // Will be set after user creation
  activity_type: 'Running',
  duration_minutes: 30,
  calories_burned: 300,
  intensity: 'moderate',
  notes: 'Morning run',
  recorded_at: new Date('2024-01-15T08:00:00Z')
};

const testActivity2: CreateActivityInput = {
  user_id: 1, // Will be set after user creation
  activity_type: 'Swimming',
  duration_minutes: 45,
  calories_burned: 400,
  intensity: 'high',
  notes: 'Pool workout',
  recorded_at: new Date('2024-01-15T18:00:00Z')
};

const testActivity3: CreateActivityInput = {
  user_id: 1, // Will be set after user creation
  activity_type: 'Walking',
  duration_minutes: 20,
  calories_burned: 100,
  intensity: 'low',
  notes: 'Evening walk',
  recorded_at: new Date('2024-01-16T19:00:00Z')
};

describe('getActivities', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no activities', async () => {
    // Create user first
    const users = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        age: testUser.age,
        gender: testUser.gender,
        height: testUser.height,
        weight: testUser.weight,
        activity_level: testUser.activity_level,
        goals: testUser.goals
      })
      .returning()
      .execute();

    const result = await getActivities(users[0].id);

    expect(result).toEqual([]);
  });

  it('should return all activities for a user when no date filter', async () => {
    // Create user first
    const users = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        age: testUser.age,
        gender: testUser.gender,
        height: testUser.height,
        weight: testUser.weight,
        activity_level: testUser.activity_level,
        goals: testUser.goals
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create activities
    await db.insert(activitiesTable)
      .values([
        {
          user_id: userId,
          activity_type: testActivity1.activity_type,
          duration_minutes: testActivity1.duration_minutes,
          calories_burned: testActivity1.calories_burned,
          intensity: testActivity1.intensity,
          notes: testActivity1.notes,
          recorded_at: testActivity1.recorded_at!
        },
        {
          user_id: userId,
          activity_type: testActivity2.activity_type,
          duration_minutes: testActivity2.duration_minutes,
          calories_burned: testActivity2.calories_burned,
          intensity: testActivity2.intensity,
          notes: testActivity2.notes,
          recorded_at: testActivity2.recorded_at!
        },
        {
          user_id: userId,
          activity_type: testActivity3.activity_type,
          duration_minutes: testActivity3.duration_minutes,
          calories_burned: testActivity3.calories_burned,
          intensity: testActivity3.intensity,
          notes: testActivity3.notes,
          recorded_at: testActivity3.recorded_at!
        }
      ])
      .execute();

    const result = await getActivities(userId);

    expect(result).toHaveLength(3);
    
    // Verify numeric conversion and type consistency
    result.forEach(activity => {
      expect(activity.user_id).toBe(userId);
      expect(activity.duration_minutes).toBeTypeOf('number');
      if (activity.calories_burned) {
        expect(activity.calories_burned).toBeTypeOf('number');
      }
      expect(activity.recorded_at).toBeInstanceOf(Date);
      expect(activity.created_at).toBeInstanceOf(Date);
    });

    // Verify specific activities
    const runningActivity = result.find(a => a.activity_type === 'Running');
    expect(runningActivity).toBeDefined();
    expect(runningActivity!.duration_minutes).toBe(30);
    expect(runningActivity!.calories_burned).toBe(300);
    expect(runningActivity!.intensity).toBe('moderate');
  });

  it('should filter activities by specific date', async () => {
    // Create user first
    const users = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        age: testUser.age,
        gender: testUser.gender,
        height: testUser.height,
        weight: testUser.weight,
        activity_level: testUser.activity_level,
        goals: testUser.goals
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create activities on different dates
    await db.insert(activitiesTable)
      .values([
        {
          user_id: userId,
          activity_type: testActivity1.activity_type,
          duration_minutes: testActivity1.duration_minutes,
          calories_burned: testActivity1.calories_burned,
          intensity: testActivity1.intensity,
          notes: testActivity1.notes,
          recorded_at: testActivity1.recorded_at!
        },
        {
          user_id: userId,
          activity_type: testActivity2.activity_type,
          duration_minutes: testActivity2.duration_minutes,
          calories_burned: testActivity2.calories_burned,
          intensity: testActivity2.intensity,
          notes: testActivity2.notes,
          recorded_at: testActivity2.recorded_at!
        },
        {
          user_id: userId,
          activity_type: testActivity3.activity_type,
          duration_minutes: testActivity3.duration_minutes,
          calories_burned: testActivity3.calories_burned,
          intensity: testActivity3.intensity,
          notes: testActivity3.notes,
          recorded_at: testActivity3.recorded_at!
        }
      ])
      .execute();

    // Filter by January 15, 2024
    const filterDate = new Date('2024-01-15');
    const result = await getActivities(userId, filterDate);

    expect(result).toHaveLength(2);
    
    // Should only contain activities from Jan 15
    result.forEach(activity => {
      const activityDate = new Date(activity.recorded_at);
      expect(activityDate.getFullYear()).toBe(2024);
      expect(activityDate.getMonth()).toBe(0); // January is 0
      expect(activityDate.getDate()).toBe(15);
    });

    // Verify specific activities for that date
    const activityTypes = result.map(a => a.activity_type).sort();
    expect(activityTypes).toEqual(['Running', 'Swimming']);
  });

  it('should return empty array for date with no activities', async () => {
    // Create user first
    const users = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        age: testUser.age,
        gender: testUser.gender,
        height: testUser.height,
        weight: testUser.weight,
        activity_level: testUser.activity_level,
        goals: testUser.goals
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create activity on Jan 15
    await db.insert(activitiesTable)
      .values({
        user_id: userId,
        activity_type: testActivity1.activity_type,
        duration_minutes: testActivity1.duration_minutes,
        calories_burned: testActivity1.calories_burned,
        intensity: testActivity1.intensity,
        notes: testActivity1.notes,
        recorded_at: testActivity1.recorded_at!
      })
      .execute();

    // Filter by Jan 20 (no activities)
    const filterDate = new Date('2024-01-20');
    const result = await getActivities(userId, filterDate);

    expect(result).toEqual([]);
  });

  it('should only return activities for the specified user', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          name: testUser.name,
          email: testUser.email,
          age: testUser.age,
          gender: testUser.gender,
          height: testUser.height,
          weight: testUser.weight,
          activity_level: testUser.activity_level,
          goals: testUser.goals
        },
        {
          name: 'Other User',
          email: 'other@example.com',
          age: 30,
          gender: 'female',
          height: 165,
          weight: 65,
          activity_level: 'lightly_active',
          goals: 'Lose weight'
        }
      ])
      .returning()
      .execute();

    const userId1 = users[0].id;
    const userId2 = users[1].id;

    // Create activities for both users
    await db.insert(activitiesTable)
      .values([
        {
          user_id: userId1,
          activity_type: 'Running',
          duration_minutes: 30,
          calories_burned: 300,
          intensity: 'moderate',
          notes: 'User 1 activity',
          recorded_at: new Date('2024-01-15T08:00:00Z')
        },
        {
          user_id: userId2,
          activity_type: 'Cycling',
          duration_minutes: 45,
          calories_burned: 400,
          intensity: 'high',
          notes: 'User 2 activity',
          recorded_at: new Date('2024-01-15T09:00:00Z')
        }
      ])
      .execute();

    const result = await getActivities(userId1);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(userId1);
    expect(result[0].activity_type).toBe('Running');
    expect(result[0].notes).toBe('User 1 activity');
  });

  it('should handle activities with null optional fields', async () => {
    // Create user first
    const users = await db.insert(usersTable)
      .values({
        name: testUser.name,
        email: testUser.email,
        age: testUser.age,
        gender: testUser.gender,
        height: testUser.height,
        weight: testUser.weight,
        activity_level: testUser.activity_level,
        goals: testUser.goals
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create activity with minimal data (null optional fields)
    await db.insert(activitiesTable)
      .values({
        user_id: userId,
        activity_type: 'Yoga',
        duration_minutes: 60,
        calories_burned: null,
        intensity: null,
        notes: null,
        recorded_at: new Date('2024-01-15T10:00:00Z')
      })
      .execute();

    const result = await getActivities(userId);

    expect(result).toHaveLength(1);
    expect(result[0].activity_type).toBe('Yoga');
    expect(result[0].duration_minutes).toBe(60);
    expect(result[0].calories_burned).toBeUndefined();
    expect(result[0].intensity).toBeUndefined();
    expect(result[0].notes).toBeNull();
  });
});
