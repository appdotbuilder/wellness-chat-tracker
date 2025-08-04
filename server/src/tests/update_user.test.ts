
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  gender: 'male',
  height: 180,
  weight: 75.5,
  activity_level: 'moderately_active',
  goals: 'Lose weight and build muscle'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user basic information', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = createResult[0].id;

    // Update user data
    const updateInput: UpdateUserInput = {
      id: userId,
      name: 'Jane Smith',
      age: 32,
      goals: 'Build endurance'
    };

    const result = await updateUser(updateInput);

    // Verify updated fields
    expect(result.id).toBe(userId);
    expect(result.name).toBe('Jane Smith');
    expect(result.age).toBe(32);
    expect(result.goals).toBe('Build endurance');
    
    // Verify unchanged fields remain the same
    expect(result.email).toBe('john@example.com');
    expect(result.gender).toBe('male');
    expect(result.height).toBe(180);
    expect(result.weight).toBe(75.5);
    expect(result.activity_level).toBe('moderately_active');
    expect(result.onboarding_completed).toBe(false);
  });

  it('should update numeric fields correctly', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = createResult[0].id;

    // Update numeric fields
    const updateInput: UpdateUserInput = {
      id: userId,
      height: 185.5,
      weight: 80.2
    };

    const result = await updateUser(updateInput);

    // Verify numeric conversions
    expect(result.height).toBe(185.5);
    expect(result.weight).toBe(80.2);
    expect(typeof result.height).toBe('number');
    expect(typeof result.weight).toBe('number');
  });

  it('should update onboarding completion status', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = createResult[0].id;

    // Update onboarding status
    const updateInput: UpdateUserInput = {
      id: userId,
      onboarding_completed: true
    };

    const result = await updateUser(updateInput);

    expect(result.onboarding_completed).toBe(true);
  });

  it('should handle null values correctly', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = createResult[0].id;

    // Update with null goals
    const updateInput: UpdateUserInput = {
      id: userId,
      goals: null
    };

    const result = await updateUser(updateInput);

    expect(result.goals).toBeNull();
  });

  it('should save updates to database', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = createResult[0].id;

    // Update user
    const updateInput: UpdateUserInput = {
      id: userId,
      name: 'Updated Name',
      activity_level: 'very_active'
    };

    await updateUser(updateInput);

    // Verify changes persisted to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Updated Name');
    expect(users[0].activity_level).toBe('very_active');
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 999,
      name: 'Non-existent User'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should update only provided fields', async () => {
    // Create initial user
    const createResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = createResult[0].id;

    // Update only name
    const updateInput: UpdateUserInput = {
      id: userId,
      name: 'Only Name Changed'
    };

    const result = await updateUser(updateInput);

    // Verify only name changed
    expect(result.name).toBe('Only Name Changed');
    expect(result.age).toBe(30); // Original value
    expect(result.email).toBe('john@example.com'); // Original value
    expect(result.goals).toBe('Lose weight and build muscle'); // Original value
  });
});
