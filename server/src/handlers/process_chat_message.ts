import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type ChatMessage } from '../schema';
import { createActivity } from './create_activity';
import { createNutrition } from './create_nutrition';
import { createHydration } from './create_hydration';
import { createSleep } from './create_sleep';
import { createWellbeing } from './create_wellbeing';
import { createChatMessage } from './create_chat_message';
import { generateRecommendations } from './generate_recommendations';

// Helper functions for parsing different types of data
const parseActivityData = (message: string, userId: number) => {
  const activities: Array<{
    activity_type: string;
    duration_minutes: number;
    calories_burned?: number;
    intensity?: 'low' | 'moderate' | 'high';
    notes?: string;
  }> = [];

  // Pattern 1: Duration-based activities - enhanced with more patterns
  const durationPatterns = [
    { pattern: /(?:went for a |did some |i )?ran for (\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/i, type: 'running', intensity: 'moderate' },
    { pattern: /(?:went for a |did some |i )?walked for (\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/i, type: 'walking', intensity: 'low' },
    { pattern: /(?:went |did some |i )?cycled for (\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i, type: 'cycling', intensity: 'moderate', isHours: true },
    { pattern: /(?:went |did some |i )?cycled for (\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/i, type: 'cycling', intensity: 'moderate' },
    { pattern: /(?:did|had)\s+a\s+(\d+)(?:-|\s)minute\s+workout/i, type: 'workout', intensity: 'moderate' },
    { pattern: /(?:i )?exercised for (\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/i, type: 'exercise', intensity: 'moderate' },
    { pattern: /(?:went |did some |i )?swam for (\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/i, type: 'swimming', intensity: 'high' },
    { pattern: /(?:i )?worked out for (\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/i, type: 'workout', intensity: 'moderate' },
    { pattern: /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?) of (running|walking|cycling|swimming|exercise|workout)/i, type: '$2', intensity: 'moderate', reversed: true }
  ];

  for (const { pattern, type, intensity, isHours, reversed } of durationPatterns) {
    const match = message.match(pattern);
    if (match) {
      let activityType = type;
      let duration: number;
      
      if (reversed) {
        duration = parseFloat(match[1]);
        activityType = match[2]; // activity type is in second group for reversed patterns
      } else {
        duration = parseFloat(match[1]);
      }
      
      const durationMinutes = isHours ? duration * 60 : duration;
      activities.push({
        activity_type: activityType,
        duration_minutes: Math.round(durationMinutes),
        intensity: intensity as 'low' | 'moderate' | 'high',
        notes: `Logged via chat: "${message.trim()}"`
      });
    }
  }

  // Pattern 2: Calorie-based activities
  const caloriePattern = /(?:burned|burnt)\s+(\d+)\s*calories?\s+(?:playing|doing)?\s*(.+)/i;
  const calorieMatch = message.match(caloriePattern);
  if (calorieMatch) {
    const calories = parseInt(calorieMatch[1]);
    const activityDesc = calorieMatch[2].trim();
    let activityType = 'exercise';
    let intensity: 'low' | 'moderate' | 'high' = 'moderate';

    // Determine activity type from description
    if (activityDesc.includes('basketball') || activityDesc.includes('tennis') || activityDesc.includes('soccer')) {
      activityType = 'sports';
      intensity = 'high';
    } else if (activityDesc.includes('walking')) {
      activityType = 'walking';
      intensity = 'low';
    } else if (activityDesc.includes('running')) {
      activityType = 'running';
      intensity = 'high';
    }

    // Estimate duration based on calories (rough estimate: 10 calories per minute for moderate activity)
    const estimatedDuration = Math.round(calories / 10);

    activities.push({
      activity_type: activityType,
      duration_minutes: estimatedDuration,
      calories_burned: calories,
      intensity: intensity,
      notes: `Logged via chat: "${message.trim()}"`
    });
  }

  return activities.map(activity => ({
    user_id: userId,
    ...activity,
    recorded_at: new Date()
  }));
};

const parseNutritionData = (message: string, userId: number) => {
  const nutritionEntries: Array<{
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    food_item: string;
    quantity: string;
    calories?: number;
    notes?: string;
  }> = [];

  // Pattern 1: Meal descriptions - enhanced with more flexible patterns
  const mealPatterns = [
    { pattern: /had (breakfast)(\s+with|\s+of|\s+was|\s+-|\s*:)?\s*(.+)/i, mealType: 'breakfast' as const },
    { pattern: /ate (.+) for (breakfast)/i, mealType: 'breakfast' as const, reversed: true },
    { pattern: /(breakfast)(\s+was|\s*:)\s*(.+)/i, mealType: 'breakfast' as const },
    { pattern: /had (lunch)(\s+with|\s+of|\s+was|\s+-|\s*:)?\s*(.+)/i, mealType: 'lunch' as const },
    { pattern: /ate (.+) for (lunch)/i, mealType: 'lunch' as const, reversed: true },
    { pattern: /(lunch)(\s+was|\s*:)\s*(.+)/i, mealType: 'lunch' as const },
    { pattern: /(?:had |ate )?(?:dinner|supper)(?:\s+was|\s+of|\s+with|\s+-|\s*:)?\s+(.+)/i, mealType: 'dinner' as const, foodGroup: 1 },
    { pattern: /ate (.+) for (?:dinner|supper)/i, mealType: 'dinner' as const, reversed: true },
    { pattern: /(?:had|ate)\s+(?:a\s+)?snack(?:\s+of|\s+was|\s+-|\s*:)?\s*(.+)/i, mealType: 'snack' as const, foodGroup: 1 },
    { pattern: /snacked on (.+)/i, mealType: 'snack' as const, foodGroup: 1 }
  ];

  for (const { pattern, mealType, reversed, foodGroup } of mealPatterns) {
    const match = message.match(pattern);
    if (match) {
      let foodItem: string;
      if (foodGroup) {
        foodItem = match[foodGroup].trim();
      } else if (reversed) {
        foodItem = match[1].trim();
      } else {
        // For patterns like "had breakfast with eggs and toast"
        // match[1] = "breakfast", match[2] = "with" or undefined, match[3] = "eggs and toast"
        const connector = match[2] || '';
        const food = match[3].trim();
        foodItem = connector ? `${connector.trim()} ${food}` : food;
      }

      nutritionEntries.push({
        meal_type: mealType,
        food_item: foodItem,
        quantity: '1 serving',
        notes: `Logged via chat: "${message.trim()}"`
      });
    }
  }

  // Pattern 2: Calorie tracking
  const caloriePattern = /consumed (\d+) calories/i;
  const calorieMatch = message.match(caloriePattern);
  if (calorieMatch) {
    const calories = parseInt(calorieMatch[1]);
    
    // Determine meal type based on time or context
    let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'snack';
    if (message.includes('breakfast')) mealType = 'breakfast';
    else if (message.includes('lunch')) mealType = 'lunch';
    else if (message.includes('dinner')) mealType = 'dinner';

    nutritionEntries.push({
      meal_type: mealType,
      food_item: 'meal',
      quantity: '1 serving',
      calories: calories,
      notes: `Logged via chat: "${message.trim()}"`
    });
  }

  return nutritionEntries.map(entry => ({
    user_id: userId,
    ...entry,
    recorded_at: new Date()
  }));
};

const parseHydrationData = (message: string, userId: number) => {
  const hydrationEntries: Array<{
    amount_ml: number;
    beverage_type?: string;
  }> = [];

  // Pattern 1: Direct ml measurements - enhanced patterns
  const mlPatterns = [
    /drank (\d+)\s*ml (?:of )?(.+)/i,
    /had (\d+)\s*ml (?:of )?(.+)/i,
    /consumed (\d+)\s*ml (?:of )?(.+)/i
  ];

  for (const pattern of mlPatterns) {
    const match = message.match(pattern);
    if (match) {
      const amount = parseInt(match[1]);
      const beverage = match[2].trim();
      hydrationEntries.push({
        amount_ml: amount,
        beverage_type: beverage
      });
    }
  }

  // Pattern 2: Liter measurements - enhanced patterns
  const literPatterns = [
    /drank (\d+(?:\.\d+)?)\s*(?:liters?|litres?|l) (?:of )?(.+)/i,
    /had (\d+(?:\.\d+)?)\s*(?:liters?|litres?|l) (?:of )?(.+)/i,
    /consumed (\d+(?:\.\d+)?)\s*(?:liters?|litres?|l) (?:of )?(.+)/i,
    /(\d+(?:\.\d+)?)\s*(?:liters?|litres?|l) (?:of )?(.+)/i
  ];

  for (const pattern of literPatterns) {
    const match = message.match(pattern);
    if (match) {
      const liters = parseFloat(match[1]);
      const beverage = match[2].trim();
      hydrationEntries.push({
        amount_ml: Math.round(liters * 1000),
        beverage_type: beverage
      });
    }
  }

  // Pattern 3: Glass measurements (assuming 250ml per glass)
  const glassPattern = /(?:had|drank) (\d+) glasses? (?:of )?(.+)/i;
  const glassMatch = message.match(glassPattern);
  if (glassMatch) {
    const glasses = parseInt(glassMatch[1]);
    const beverage = glassMatch[2].trim();
    hydrationEntries.push({
      amount_ml: glasses * 250,
      beverage_type: beverage
    });
  }

  // Pattern 4: Just water without specifying amount (default to 250ml)
  if (message.includes('drank water') && hydrationEntries.length === 0) {
    hydrationEntries.push({
      amount_ml: 250,
      beverage_type: 'water'
    });
  }

  return hydrationEntries.map(entry => ({
    user_id: userId,
    ...entry,
    recorded_at: new Date()
  }));
};

const parseSleepData = (message: string, userId: number) => {
  const sleepEntries: Array<{
    bedtime: Date;
    wake_time: Date;
    sleep_quality?: 'poor' | 'fair' | 'good' | 'excellent';
    notes?: string;
  }> = [];

  const now = new Date();

  // Pattern 1: Sleep duration
  const durationPatterns = [
    /slept for (\d+(?:\.\d+)?)\s*hours?/i,
    /got (\d+(?:\.\d+)?)\s*hours? of sleep/i
  ];

  for (const pattern of durationPatterns) {
    const match = message.match(pattern);
    if (match) {
      const hours = parseFloat(match[1]);
      const bedtime = new Date(now.getTime() - hours * 60 * 60 * 1000);
      sleepEntries.push({
        bedtime: bedtime,
        wake_time: now,
        notes: `Logged via chat: "${message.trim()}"`
      });
    }
  }

  // Pattern 2: Sleep quality
  const qualityPattern = /sleep quality was (poor|fair|good|excellent)/i;
  const qualityMatch = message.match(qualityPattern);
  if (qualityMatch) {
    const quality = qualityMatch[1].toLowerCase() as 'poor' | 'fair' | 'good' | 'excellent';
    
    if (sleepEntries.length > 0) {
      sleepEntries[0].sleep_quality = quality;
    } else {
      // Create a default 8-hour sleep entry with quality
      const bedtime = new Date(now.getTime() - 8 * 60 * 60 * 1000);
      sleepEntries.push({
        bedtime: bedtime,
        wake_time: now,
        sleep_quality: quality,
        notes: `Logged via chat: "${message.trim()}"`
      });
    }
  }

  // Pattern 3: Bedtime and wake time
  const timePattern = /went to bed at (\d+)(?::(\d+))?\s*(am|pm) and woke up at (\d+)(?::(\d+))?\s*(am|pm)/i;
  const timeMatch = message.match(timePattern);
  if (timeMatch) {
    const bedHour = parseInt(timeMatch[1]);
    const bedMinute = parseInt(timeMatch[2] || '0');
    const bedAmPm = timeMatch[3].toLowerCase();
    const wakeHour = parseInt(timeMatch[4]);
    const wakeMinute = parseInt(timeMatch[5] || '0');
    const wakeAmPm = timeMatch[6].toLowerCase();

    // Convert to 24-hour format
    let bed24Hour = bedHour;
    if (bedAmPm === 'pm' && bedHour !== 12) bed24Hour += 12;
    if (bedAmPm === 'am' && bedHour === 12) bed24Hour = 0;

    let wake24Hour = wakeHour;
    if (wakeAmPm === 'pm' && wakeHour !== 12) wake24Hour += 12;
    if (wakeAmPm === 'am' && wakeHour === 12) wake24Hour = 0;

    const bedtime = new Date(now);
    bedtime.setHours(bed24Hour, bedMinute, 0, 0);
    
    const wakeTime = new Date(now);
    wakeTime.setHours(wake24Hour, wakeMinute, 0, 0);

    // If wake time is earlier than bedtime, assume wake time is next day
    if (wakeTime <= bedtime) {
      wakeTime.setDate(wakeTime.getDate() + 1);
    }

    sleepEntries.push({
      bedtime: bedtime,
      wake_time: wakeTime,
      notes: `Logged via chat: "${message.trim()}"`
    });
  }

  return sleepEntries.map(entry => ({
    user_id: userId,
    ...entry,
    recorded_at: new Date()
  }));
};

const parseWellbeingData = (message: string, userId: number) => {
  const wellbeingEntries: Array<{
    mood: 'very_poor' | 'poor' | 'neutral' | 'good' | 'excellent';
    stress_level: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    energy_level: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    notes?: string;
  }> = [];

  // Default values
  let mood: 'very_poor' | 'poor' | 'neutral' | 'good' | 'excellent' = 'neutral';
  let stressLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' = 'moderate';
  let energyLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' = 'moderate';
  let dataFound = false;

  // Mood patterns - including 'fair' support with mapping to 'neutral'
  const moodPatterns = [
    { pattern: /feeling (very_poor|very poor|terrible|awful)/i, value: 'very_poor' as const },
    { pattern: /feeling (poor|bad|sad|down)/i, value: 'poor' as const },
    { pattern: /feeling (neutral|okay|ok|fine|average|fair)/i, value: 'neutral' as const },
    { pattern: /feeling (good|great|happy|positive)/i, value: 'good' as const },
    { pattern: /feeling (excellent|amazing|fantastic|wonderful|very good)/i, value: 'excellent' as const },
    { pattern: /mood is (very_poor|very poor|terrible|awful)/i, value: 'very_poor' as const },
    { pattern: /mood is (poor|bad|sad|down)/i, value: 'poor' as const },
    { pattern: /mood is (neutral|okay|ok|fine|average|fair)/i, value: 'neutral' as const },
    { pattern: /mood is (good|great|happy|positive)/i, value: 'good' as const },
    { pattern: /mood is (excellent|amazing|fantastic|wonderful|very good)/i, value: 'excellent' as const }
  ];

  for (const { pattern, value } of moodPatterns) {
    if (message.match(pattern)) {
      mood = value;
      dataFound = true;
      break;
    }
  }

  // Stress level patterns
  const stressPatterns = [
    { pattern: /stress level is (very_low|very low|minimal|none)/i, value: 'very_low' as const },
    { pattern: /stress level is (low|little|slight)/i, value: 'low' as const },
    { pattern: /stress level is (moderate|medium|average|okay)/i, value: 'moderate' as const },
    { pattern: /stress level is (high|stressed|anxious)/i, value: 'high' as const },
    { pattern: /stress level is (very_high|very high|extremely high|overwhelming)/i, value: 'very_high' as const }
  ];

  for (const { pattern, value } of stressPatterns) {
    if (message.match(pattern)) {
      stressLevel = value;
      dataFound = true;
      break;
    }
  }

  // Energy level patterns
  const energyPatterns = [
    { pattern: /energy level is (very_low|very low|exhausted|drained)/i, value: 'very_low' as const },
    { pattern: /energy level is (low|tired|sluggish)/i, value: 'low' as const },
    { pattern: /energy level is (moderate|medium|average|okay)/i, value: 'moderate' as const },
    { pattern: /energy level is (high|energetic|active)/i, value: 'high' as const },
    { pattern: /energy level is (very_high|very high|extremely high|pumped)/i, value: 'very_high' as const }
  ];

  for (const { pattern, value } of energyPatterns) {
    if (message.match(pattern)) {
      energyLevel = value;
      dataFound = true;
      break;
    }
  }

  if (dataFound) {
    wellbeingEntries.push({
      mood: mood,
      stress_level: stressLevel,
      energy_level: energyLevel,
      notes: `Logged via chat: "${message.trim()}"`
    });
  }

  return wellbeingEntries.map(entry => ({
    user_id: userId,
    ...entry,
    recorded_at: new Date()
  }));
};

const isRecommendationRequest = (message: string): boolean => {
  const recommendationKeywords = [
    'recommendations', 'recommend', 'advise', 'advice', 'suggest', 'suggestions',
    'what should i do', 'help me improve', 'tips', 'guidance', 'what can i do'
  ];
  
  const lowerMessage = message.toLowerCase();
  return recommendationKeywords.some(keyword => lowerMessage.includes(keyword));
};

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

    const messageText = message.message;
    const lowerMessageText = messageText.toLowerCase();
    let dataExtracted = false;
    const extractedData: string[] = [];

    // Check if this is a recommendation request
    if (isRecommendationRequest(lowerMessageText)) {
      try {
        const recommendations = await generateRecommendations(message.user_id);
        
        if (recommendations.length > 0) {
          const topRecommendations = recommendations.slice(0, 3); // Show top 3
          let responseMessage = "Here are your personalized recommendations:\n\n";
          
          topRecommendations.forEach((rec, index) => {
            responseMessage += `${index + 1}. **${rec.title}**\n${rec.description}\n\n`;
          });

          responseMessage += "Keep tracking your health data for more personalized insights!";

          // Create system response
          await createChatMessage({
            user_id: message.user_id,
            message: responseMessage,
            message_type: 'system'
          });

          dataExtracted = true;
          extractedData.push('recommendations generated');
        } else {
          // No recommendations available
          await createChatMessage({
            user_id: message.user_id,
            message: "I don't have enough data yet to provide personalized recommendations. Keep tracking your activities, nutrition, sleep, and wellbeing for a few days, and I'll be able to give you helpful insights!",
            message_type: 'system'
          });

          dataExtracted = true;
          extractedData.push('recommendation request processed');
        }
      } catch (error) {
        console.error('Failed to generate recommendations:', error);
        await createChatMessage({
          user_id: message.user_id,
          message: "I encountered an issue generating your recommendations. Please try again later.",
          message_type: 'system'
        });
      }
    } else {
      // Parse different types of data
      try {
        // Parse activity data
        const activities = parseActivityData(lowerMessageText, message.user_id);
        for (const activity of activities) {
          await createActivity(activity);
          extractedData.push(`${activity.activity_type} for ${activity.duration_minutes} minutes`);
          dataExtracted = true;
        }

        // Parse nutrition data
        const nutritionEntries = parseNutritionData(lowerMessageText, message.user_id);
        for (const nutrition of nutritionEntries) {
          await createNutrition(nutrition);
          extractedData.push(`${nutrition.meal_type}: ${nutrition.food_item}`);
          dataExtracted = true;
        }

        // Parse hydration data
        const hydrationEntries = parseHydrationData(lowerMessageText, message.user_id);
        for (const hydration of hydrationEntries) {
          await createHydration(hydration);
          extractedData.push(`${hydration.amount_ml}ml of ${hydration.beverage_type || 'liquid'}`);
          dataExtracted = true;
        }

        // Parse sleep data
        const sleepEntries = parseSleepData(lowerMessageText, message.user_id);
        for (const sleep of sleepEntries) {
          await createSleep(sleep);
          const duration = Math.round((sleep.wake_time.getTime() - sleep.bedtime.getTime()) / (1000 * 60 * 60) * 10) / 10;
          extractedData.push(`${duration} hours of sleep${sleep.sleep_quality ? ` (${sleep.sleep_quality} quality)` : ''}`);
          dataExtracted = true;
        }

        // Parse wellbeing data
        const wellbeingEntries = parseWellbeingData(lowerMessageText, message.user_id);
        for (const wellbeing of wellbeingEntries) {
          await createWellbeing(wellbeing);
          extractedData.push(`mood: ${wellbeing.mood}, stress: ${wellbeing.stress_level}, energy: ${wellbeing.energy_level}`);
          dataExtracted = true;
        }

        // Create system response based on extracted data
        if (dataExtracted && extractedData.length > 0) {
          let responseMessage = "Great! I've logged the following data:\n\n";
          extractedData.forEach((data, index) => {
            responseMessage += `• ${data}\n`;
          });
          responseMessage += "\nKeep tracking your health journey! 💪";

          await createChatMessage({
            user_id: message.user_id,
            message: responseMessage,
            message_type: 'system'
          });
        } else {
          // No data extracted - general response
          await createChatMessage({
            user_id: message.user_id,
            message: "I received your message! I can help you track activities (like 'I ran for 30 minutes'), nutrition (like 'I had breakfast with oatmeal'), hydration (like 'I drank 500ml of water'), sleep (like 'I slept for 8 hours'), and wellbeing (like 'I'm feeling good today'). You can also ask for recommendations by saying 'give me some advice' or 'what should I do?'",
            message_type: 'system'
          });
        }
      } catch (error) {
        console.error('Error processing health data:', error);
        await createChatMessage({
          user_id: message.user_id,
          message: "I encountered an issue processing your health data. Please try rephrasing your message or enter the data directly in the tracking tabs.",
          message_type: 'system'
        });
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