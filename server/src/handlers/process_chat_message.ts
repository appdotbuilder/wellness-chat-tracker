
import { db } from '../db';
import { chatMessagesTable, activitiesTable, nutritionTable, hydrationTable, sleepTable, wellbeingTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type ChatMessage } from '../schema';

export const processChatMessage = async (messageId: number): Promise<ChatMessage> => {
  try {
    // Get the chat message
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.id, messageId))
      .execute();

    if (messages.length === 0) {
      throw new Error(`Chat message with id ${messageId} not found`);
    }

    const message = messages[0];
    
    // Skip processing if already processed or not a user message
    if (message.data_extracted || message.message_type !== 'user') {
      return {
        ...message,
        created_at: new Date(message.created_at)
      };
    }

    const messageText = message.message.toLowerCase();
    let dataExtracted = false;

    // Extract activity data - look for exercise/activity keywords
    const activityPatterns = [
      /ran for (\d+) minutes?/,
      /walked for (\d+) minutes?/,
      /exercised for (\d+) minutes?/,
      /worked out for (\d+) minutes?/,
      /cycled for (\d+) minutes?/,
      /swam for (\d+) minutes?/
    ];

    for (const pattern of activityPatterns) {
      const match = messageText.match(pattern);
      if (match) {
        const duration = parseInt(match[1]);
        const activityType = messageText.includes('ran') ? 'running' :
                           messageText.includes('walked') ? 'walking' :
                           messageText.includes('cycled') ? 'cycling' :
                           messageText.includes('swam') ? 'swimming' :
                           'exercise';

        await db.insert(activitiesTable).values({
          user_id: message.user_id,
          activity_type: activityType,
          duration_minutes: duration,
          recorded_at: new Date()
        }).execute();

        dataExtracted = true;
        break;
      }
    }

    // Extract nutrition data - look for food/meal keywords
    const nutritionPatterns = [
      /had (breakfast|lunch|dinner) (.+)/,
      /ate (.+) for (breakfast|lunch|dinner)/,
      /consumed (\d+) calories/
    ];

    for (const pattern of nutritionPatterns) {
      const match = messageText.match(pattern);
      if (match) {
        if (pattern.source.includes('calories')) {
          // Calorie tracking
          const calories = parseInt(match[1]);
          await db.insert(nutritionTable).values({
            user_id: message.user_id,
            meal_type: 'snack',
            food_item: 'meal',
            quantity: '1 serving',
            calories: calories,
            recorded_at: new Date()
          }).execute();
        } else {
          // Meal tracking
          const mealType = (match[1] === 'breakfast' || match[1] === 'lunch' || match[1] === 'dinner') ? match[1] : match[2];
          const foodItem = (match[1] === 'breakfast' || match[1] === 'lunch' || match[1] === 'dinner') ? match[2] : match[1];
          
          await db.insert(nutritionTable).values({
            user_id: message.user_id,
            meal_type: mealType as 'breakfast' | 'lunch' | 'dinner',
            food_item: foodItem.trim(),
            quantity: '1 serving',
            recorded_at: new Date()
          }).execute();
        }

        dataExtracted = true;
        break;
      }
    }

    // Extract hydration data - look for water/drink keywords
    const hydrationPatterns = [
      /drank (\d+)ml of (.+)/,
      /had (\d+)ml (.+)/,
      /consumed (\d+)ml water/
    ];

    for (const pattern of hydrationPatterns) {
      const match = messageText.match(pattern);
      if (match) {
        const amount = parseInt(match[1]);
        const beverageType = match[2] || 'water';

        await db.insert(hydrationTable).values({
          user_id: message.user_id,
          amount_ml: amount,
          beverage_type: beverageType.trim(),
          recorded_at: new Date()
        }).execute();

        dataExtracted = true;
        break;
      }
    }

    // Extract sleep data - look for sleep keywords
    const sleepPatterns = [
      /slept for (\d+) hours?/,
      /got (\d+) hours? of sleep/,
      /sleep quality was (poor|fair|good|excellent)/
    ];

    for (const pattern of sleepPatterns) {
      const match = messageText.match(pattern);
      if (match) {
        if (pattern.source.includes('quality')) {
          // Sleep quality tracking - create basic sleep record
          const quality = match[1] as 'poor' | 'fair' | 'good' | 'excellent';
          const now = new Date();
          const bedtime = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours ago
          
          await db.insert(sleepTable).values({
            user_id: message.user_id,
            bedtime: bedtime,
            wake_time: now,
            sleep_duration_hours: 8,
            sleep_quality: quality,
            recorded_at: new Date()
          }).execute();
        } else {
          // Sleep duration tracking
          const hours = parseInt(match[1]);
          const now = new Date();
          const bedtime = new Date(now.getTime() - hours * 60 * 60 * 1000);
          
          await db.insert(sleepTable).values({
            user_id: message.user_id,
            bedtime: bedtime,
            wake_time: now,
            sleep_duration_hours: hours,
            recorded_at: new Date()
          }).execute();
        }

        dataExtracted = true;
        break;
      }
    }

    // Extract wellbeing data - look for mood/stress/energy keywords
    const wellbeingPatterns = [
      /feeling (very_poor|poor|neutral|good|excellent)/,
      /mood is (very_poor|poor|neutral|good|excellent)/,
      /stress level is (very_low|low|moderate|high|very_high)/,
      /energy level is (very_low|low|moderate|high|very_high)/
    ];

    for (const pattern of wellbeingPatterns) {
      const match = messageText.match(pattern);
      if (match) {
        const level = match[1];
        
        // Determine which field to update based on pattern
        let mood: any = 'neutral';
        let stressLevel: any = 'moderate';
        let energyLevel: any = 'moderate';

        if (pattern.source.includes('feeling') || pattern.source.includes('mood')) {
          mood = level;
        } else if (pattern.source.includes('stress')) {
          stressLevel = level;
        } else if (pattern.source.includes('energy')) {
          energyLevel = level;
        }

        await db.insert(wellbeingTable).values({
          user_id: message.user_id,
          mood: mood,
          stress_level: stressLevel,
          energy_level: energyLevel,
          recorded_at: new Date()
        }).execute();

        dataExtracted = true;
        break;
      }
    }

    // Update the message as processed
    await db.update(chatMessagesTable)
      .set({ data_extracted: dataExtracted })
      .where(eq(chatMessagesTable.id, messageId))
      .execute();

    return {
      ...message,
      data_extracted: dataExtracted,
      created_at: new Date(message.created_at)
    };

  } catch (error) {
    console.error('Chat message processing failed:', error);
    throw error;
  }
};
