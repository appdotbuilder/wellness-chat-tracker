
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatMessagesTable } from '../db/schema';
import { type CreateUserInput, type CreateChatMessageInput } from '../schema';
import { getChatMessages } from '../handlers/get_chat_messages';

const testUser: CreateUserInput = {
  name: 'Test User',
  email: 'test@example.com'
};

const testMessage1: CreateChatMessageInput = {
  user_id: 1,
  message: 'Hello, how are you?',
  message_type: 'user'
};

const testMessage2: CreateChatMessageInput = {
  user_id: 1,
  message: 'I am doing well, thank you!',
  message_type: 'system'
};

const testMessage3: CreateChatMessageInput = {
  user_id: 1,
  message: 'Can you help me track my activities?',
  message_type: 'user'
};

describe('getChatMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch chat messages for a user', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create test messages
    await db.insert(chatMessagesTable).values([
      testMessage1,
      testMessage2,
      testMessage3
    ]).execute();

    const result = await getChatMessages(1);

    expect(result).toHaveLength(3);
    expect(result[0].user_id).toEqual(1);
    expect(result[0].message).toBeDefined();
    expect(result[0].message_type).toMatch(/^(user|system)$/);
    expect(result[0].data_extracted).toEqual(false);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return messages in descending order by created_at', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create messages with slight delay to ensure different timestamps
    await db.insert(chatMessagesTable).values(testMessage1).execute();
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.insert(chatMessagesTable).values(testMessage2).execute();
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.insert(chatMessagesTable).values(testMessage3).execute();

    const result = await getChatMessages(1);

    expect(result).toHaveLength(3);
    // Most recent message should be first
    expect(result[0].message).toEqual('Can you help me track my activities?');
    expect(result[1].message).toEqual('I am doing well, thank you!');
    expect(result[2].message).toEqual('Hello, how are you?');
    
    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should respect limit parameter', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create test messages
    await db.insert(chatMessagesTable).values([
      testMessage1,
      testMessage2,
      testMessage3
    ]).execute();

    const result = await getChatMessages(1, 2);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(1);
    expect(result[1].user_id).toEqual(1);
  });

  it('should return empty array for user with no messages', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const result = await getChatMessages(1);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return messages for specified user', async () => {
    // Create two test users
    await db.insert(usersTable).values([
      testUser,
      { name: 'Another User', email: 'another@example.com' }
    ]).execute();

    // Create messages for different users
    await db.insert(chatMessagesTable).values([
      { ...testMessage1, user_id: 1 },
      { ...testMessage2, user_id: 2 },
      { ...testMessage3, user_id: 1 }
    ]).execute();

    const result = await getChatMessages(1);

    expect(result).toHaveLength(2);
    result.forEach(message => {
      expect(message.user_id).toEqual(1);
    });
  });

  it('should handle limit of 0', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create test messages
    await db.insert(chatMessagesTable).values([testMessage1]).execute();

    const result = await getChatMessages(1, 0);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});
