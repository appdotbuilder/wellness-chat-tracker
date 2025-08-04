
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export const getUser = async (userId: number): Promise<User | null> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const user = results[0];
    return {
      ...user,
      height: user.height !== null ? user.height : undefined,
      weight: user.weight !== null ? user.weight : undefined,
      age: user.age !== null ? user.age : undefined,
      gender: user.gender !== null ? user.gender : undefined,
      activity_level: user.activity_level !== null ? user.activity_level : undefined,
      goals: user.goals
    };
  } catch (error) {
    console.error('User retrieval failed:', error);
    throw error;
  }
};
