
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatMessagesTable } from '../db/schema';
import { type CreateChatMessageInput } from '../schema';
import { createChatMessage } from '../handlers/create_chat_message';
import { eq } from 'drizzle-orm';

describe('createChatMessage', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a user chat message', async () => {
    const testInput: CreateChatMessageInput = {
      user_id: testUserId,
      message: 'Hello, I need help with my fitness goals',
      message_type: 'user'
    };

    const result = await createChatMessage(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.message).toEqual('Hello, I need help with my fitness goals');
    expect(result.message_type).toEqual('user');
    expect(result.data_extracted).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a system chat message', async () => {
    const testInput: CreateChatMessageInput = {
      user_id: testUserId,
      message: 'Based on your profile, I recommend 30 minutes of cardio today.',
      message_type: 'system'
    };

    const result = await createChatMessage(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.message).toEqual('Based on your profile, I recommend 30 minutes of cardio today.');
    expect(result.message_type).toEqual('system');
    expect(result.data_extracted).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save chat message to database', async () => {
    const testInput: CreateChatMessageInput = {
      user_id: testUserId,
      message: 'I walked for 45 minutes today',
      message_type: 'user'
    };

    const result = await createChatMessage(testInput);

    // Query using proper drizzle syntax
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].user_id).toEqual(testUserId);
    expect(messages[0].message).toEqual('I walked for 45 minutes today');
    expect(messages[0].message_type).toEqual('user');
    expect(messages[0].data_extracted).toEqual(false);
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should default data_extracted to false', async () => {
    const testInput: CreateChatMessageInput = {
      user_id: testUserId,
      message: 'Test message',
      message_type: 'user'
    };

    const result = await createChatMessage(testInput);

    expect(result.data_extracted).toEqual(false);
  });
});
