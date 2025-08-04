
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { chatMessagesTable, usersTable, activitiesTable, nutritionTable, hydrationTable, sleepTable, wellbeingTable } from '../db/schema';
import { processChatMessage } from '../handlers/process_chat_message';
import { eq } from 'drizzle-orm';

describe('processChatMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testMessageId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values({
      name: 'Test User',
      email: 'test@example.com'
    }).returning().execute();
    testUserId = userResult[0].id;
  });

  it('should return message unchanged if already processed', async () => {
    // Create already processed message
    const messageResult = await db.insert(chatMessagesTable).values({
      user_id: testUserId,
      message: 'ran for 30 minutes',
      message_type: 'user',
      data_extracted: true
    }).returning().execute();
    testMessageId = messageResult[0].id;

    const result = await processChatMessage(testMessageId);

    expect(result.data_extracted).toBe(true);
    expect(result.message).toBe('ran for 30 minutes');

    // Verify no activity was created
    const activities = await db.select().from(activitiesTable).execute();
    expect(activities).toHaveLength(0);
  });

  it('should return message unchanged if message type is system', async () => {
    // Create system message
    const messageResult = await db.insert(chatMessagesTable).values({
      user_id: testUserId,
      message: 'ran for 30 minutes',
      message_type: 'system',
      data_extracted: false
    }).returning().execute();
    testMessageId = messageResult[0].id;

    const result = await processChatMessage(testMessageId);

    expect(result.data_extracted).toBe(false);
    expect(result.message_type).toBe('system');

    // Verify no activity was created
    const activities = await db.select().from(activitiesTable).execute();
    expect(activities).toHaveLength(0);
  });

  it('should extract activity data from user message', async () => {
    // Create user message about running
    const messageResult = await db.insert(chatMessagesTable).values({
      user_id: testUserId,
      message: 'I ran for 30 minutes today',
      message_type: 'user',
      data_extracted: false
    }).returning().execute();
    testMessageId = messageResult[0].id;

    const result = await processChatMessage(testMessageId);

    expect(result.data_extracted).toBe(true);

    // Verify activity was created
    const activities = await db.select().from(activitiesTable).execute();
    expect(activities).toHaveLength(1);
    expect(activities[0].user_id).toBe(testUserId);
    expect(activities[0].activity_type).toBe('running');
    expect(activities[0].duration_minutes).toBe(30);
  });

  it('should extract nutrition data from meal message', async () => {
    // Create user message about eating
    const messageResult = await db.insert(chatMessagesTable).values({
      user_id: testUserId,
      message: 'I had breakfast with eggs and toast',
      message_type: 'user',
      data_extracted: false
    }).returning().execute();
    testMessageId = messageResult[0].id;

    const result = await processChatMessage(testMessageId);

    expect(result.data_extracted).toBe(true);

    // Verify nutrition entry was created
    const nutrition = await db.select().from(nutritionTable).execute();
    expect(nutrition).toHaveLength(1);
    expect(nutrition[0].user_id).toBe(testUserId);
    expect(nutrition[0].meal_type).toBe('breakfast');
    expect(nutrition[0].food_item).toBe('with eggs and toast');
    expect(nutrition[0].quantity).toBe('1 serving');
  });

  it('should extract hydration data from drink message', async () => {
    // Create user message about drinking
    const messageResult = await db.insert(chatMessagesTable).values({
      user_id: testUserId,
      message: 'I drank 500ml of water',
      message_type: 'user',
      data_extracted: false
    }).returning().execute();
    testMessageId = messageResult[0].id;

    const result = await processChatMessage(testMessageId);

    expect(result.data_extracted).toBe(true);

    // Verify hydration entry was created
    const hydration = await db.select().from(hydrationTable).execute();
    expect(hydration).toHaveLength(1);
    expect(hydration[0].user_id).toBe(testUserId);
    expect(hydration[0].amount_ml).toBe(500);
    expect(hydration[0].beverage_type).toBe('water');
  });

  it('should extract sleep data from sleep message', async () => {
    // Create user message about sleep
    const messageResult = await db.insert(chatMessagesTable).values({
      user_id: testUserId,
      message: 'I slept for 8 hours last night',
      message_type: 'user',
      data_extracted: false
    }).returning().execute();
    testMessageId = messageResult[0].id;

    const result = await processChatMessage(testMessageId);

    expect(result.data_extracted).toBe(true);

    // Verify sleep entry was created
    const sleep = await db.select().from(sleepTable).execute();
    expect(sleep).toHaveLength(1);
    expect(sleep[0].user_id).toBe(testUserId);
    expect(sleep[0].sleep_duration_hours).toBe(8);
    expect(sleep[0].bedtime).toBeInstanceOf(Date);
    expect(sleep[0].wake_time).toBeInstanceOf(Date);
  });

  it('should extract wellbeing data from mood message', async () => {
    // Create user message about mood
    const messageResult = await db.insert(chatMessagesTable).values({
      user_id: testUserId,
      message: 'I am feeling good today',
      message_type: 'user',
      data_extracted: false
    }).returning().execute();
    testMessageId = messageResult[0].id;

    const result = await processChatMessage(testMessageId);

    expect(result.data_extracted).toBe(true);

    // Verify wellbeing entry was created
    const wellbeing = await db.select().from(wellbeingTable).execute();
    expect(wellbeing).toHaveLength(1);
    expect(wellbeing[0].user_id).toBe(testUserId);
    expect(wellbeing[0].mood).toBe('good');
    expect(wellbeing[0].stress_level).toBe('moderate');
    expect(wellbeing[0].energy_level).toBe('moderate');
  });

  it('should not extract data from unrecognized message', async () => {
    // Create user message with no extractable data
    const messageResult = await db.insert(chatMessagesTable).values({
      user_id: testUserId,
      message: 'Hello there, how are you?',
      message_type: 'user',
      data_extracted: false
    }).returning().execute();
    testMessageId = messageResult[0].id;

    const result = await processChatMessage(testMessageId);

    expect(result.data_extracted).toBe(false);

    // Verify no data was created in any table
    const activities = await db.select().from(activitiesTable).execute();
    const nutrition = await db.select().from(nutritionTable).execute();
    const hydration = await db.select().from(hydrationTable).execute();
    const sleep = await db.select().from(sleepTable).execute();
    const wellbeing = await db.select().from(wellbeingTable).execute();

    expect(activities).toHaveLength(0);
    expect(nutrition).toHaveLength(0);
    expect(hydration).toHaveLength(0);
    expect(sleep).toHaveLength(0);
    expect(wellbeing).toHaveLength(0);
  });

  it('should throw error for non-existent message', async () => {
    await expect(processChatMessage(99999)).rejects.toThrow(/not found/i);
  });

  it('should update message data_extracted flag in database', async () => {
    // Create user message
    const messageResult = await db.insert(chatMessagesTable).values({
      user_id: testUserId,
      message: 'I walked for 20 minutes',
      message_type: 'user',
      data_extracted: false
    }).returning().execute();
    testMessageId = messageResult[0].id;

    await processChatMessage(testMessageId);

    // Verify message was updated in database
    const updatedMessages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, testMessageId))
      .execute();

    expect(updatedMessages[0].data_extracted).toBe(true);
  });
});
