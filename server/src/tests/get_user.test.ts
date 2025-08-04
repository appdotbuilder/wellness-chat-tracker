
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUser } from '../handlers/get_user';

// Test user data
const testUserInput: CreateUserInput = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  gender: 'male',
  height: 180,
  weight: 75,
  activity_level: 'moderately_active',
  goals: 'Lose weight and build muscle'
};

describe('getUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a user first
    const insertResult = await db.insert(usersTable)
      .values(testUserInput)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    
    // Get the user
    const result = await getUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.name).toEqual('John Doe');
    expect(result!.email).toEqual('john@example.com');
    expect(result!.age).toEqual(30);
    expect(result!.gender).toEqual('male');
    expect(result!.height).toEqual(180);
    expect(result!.weight).toEqual(75);
    expect(result!.activity_level).toEqual('moderately_active');
    expect(result!.goals).toEqual('Lose weight and build muscle');
    expect(result!.onboarding_completed).toEqual(false);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const result = await getUser(999);
    expect(result).toBeNull();
  });

  it('should handle user with minimal data', async () => {
    // Create user with only required fields
    const minimalUser = {
      name: 'Jane Smith',
      email: 'jane@example.com'
    };

    const insertResult = await db.insert(usersTable)
      .values(minimalUser)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    
    // Get the user
    const result = await getUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.name).toEqual('Jane Smith');
    expect(result!.email).toEqual('jane@example.com');
    expect(result!.age).toBeUndefined();
    expect(result!.gender).toBeUndefined();
    expect(result!.height).toBeUndefined();
    expect(result!.weight).toBeUndefined();
    expect(result!.activity_level).toBeUndefined();
    expect(result!.goals).toBeNull();
    expect(result!.onboarding_completed).toEqual(false);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should handle user with null goals', async () => {
    const userWithNullGoals = {
      ...testUserInput,
      goals: null
    };

    const insertResult = await db.insert(usersTable)
      .values(userWithNullGoals)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    
    // Get the user
    const result = await getUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.goals).toBeNull();
  });
});
