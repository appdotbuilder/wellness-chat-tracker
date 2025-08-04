
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.age !== undefined) updateData.age = input.age;
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.height !== undefined) updateData.height = input.height;
    if (input.weight !== undefined) updateData.weight = input.weight;
    if (input.activity_level !== undefined) updateData.activity_level = input.activity_level;
    if (input.goals !== undefined) updateData.goals = input.goals;
    if (input.onboarding_completed !== undefined) updateData.onboarding_completed = input.onboarding_completed;

    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    // Convert database types to schema types
    const user = result[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age ?? undefined,
      gender: user.gender ?? undefined,
      height: user.height ? parseFloat(user.height.toString()) : undefined,
      weight: user.weight ? parseFloat(user.weight.toString()) : undefined,
      activity_level: user.activity_level ?? undefined,
      goals: user.goals,
      onboarding_completed: user.onboarding_completed,
      created_at: user.created_at
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};
