
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        name: input.name,
        email: input.email,
        age: input.age,
        gender: input.gender,
        height: input.height,
        weight: input.weight,
        activity_level: input.activity_level,
        goals: input.goals || null
      })
      .returning()
      .execute();

    const user = result[0];
    
    // Convert null values to undefined to match User schema
    return {
      ...user,
      age: user.age ?? undefined,
      gender: user.gender ?? undefined,
      height: user.height ?? undefined,
      weight: user.weight ?? undefined,
      activity_level: user.activity_level ?? undefined,
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
