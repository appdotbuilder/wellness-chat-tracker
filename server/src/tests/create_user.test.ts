
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateUserInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  age: 30,
  gender: 'male',
  height: 180,
  weight: 75,
  activity_level: 'moderately_active',
  goals: 'Lose weight and build muscle'
};

// Minimal test input
const minimalInput: CreateUserInput = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.age).toEqual(30);
    expect(result.gender).toEqual('male');
    expect(result.height).toEqual(180);
    expect(result.weight).toEqual(75);
    expect(result.activity_level).toEqual('moderately_active');
    expect(result.goals).toEqual('Lose weight and build muscle');
    expect(result.onboarding_completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a user with minimal required fields', async () => {
    const result = await createUser(minimalInput);

    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.age).toBeUndefined();
    expect(result.gender).toBeUndefined();
    expect(result.height).toBeUndefined();
    expect(result.weight).toBeUndefined();
    expect(result.activity_level).toBeUndefined();
    expect(result.goals).toBeNull();
    expect(result.onboarding_completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].email).toEqual('john.doe@example.com');
    expect(users[0].age).toEqual(30);
    expect(users[0].gender).toEqual('male');
    expect(users[0].height).toEqual(180);
    expect(users[0].weight).toEqual(75);
    expect(users[0].activity_level).toEqual('moderately_active');
    expect(users[0].goals).toEqual('Lose weight and build muscle');
    expect(users[0].onboarding_completed).toEqual(false);
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle goals as null when not provided', async () => {
    const inputWithNullGoals = {
      ...minimalInput,
      goals: null
    };

    const result = await createUser(inputWithNullGoals);

    expect(result.goals).toBeNull();

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].goals).toBeNull();
  });

  it('should enforce unique email constraint', async () => {
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateInput = {
      ...testInput,
      name: 'Different Name'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique constraint/i);
  });
});
