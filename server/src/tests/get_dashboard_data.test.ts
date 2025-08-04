
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, activitiesTable, nutritionTable, hydrationTable, sleepTable, wellbeingTable, recommendationsTable } from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: true
      })
      .returning()
      .execute();
    
    testUserId = users[0].id;
  });

  it('should return empty dashboard data when no data exists', async () => {
    const result = await getDashboardData(testUserId);

    expect(result.todayActivity.totalMinutes).toBe(0);
    expect(result.todayActivity.caloriesBurned).toBe(0);
    expect(result.todayActivity.activitiesCount).toBe(0);
    expect(result.todayNutrition.totalCalories).toBe(0);
    expect(result.todayNutrition.mealsCount).toBe(0);
    expect(result.todayNutrition.macros.protein).toBe(0);
    expect(result.todayNutrition.macros.carbs).toBe(0);
    expect(result.todayNutrition.macros.fat).toBe(0);
    expect(result.todayHydration.totalMl).toBe(0);
    expect(result.todayHydration.logsCount).toBe(0);
    expect(result.lastSleep.duration).toBe(0);
    expect(result.lastSleep.quality).toBeNull();
    expect(result.lastSleep.bedtime).toBeNull();
    expect(result.lastSleep.wakeTime).toBeNull();
    expect(result.todayWellbeing.mood).toBeNull();
    expect(result.todayWellbeing.stressLevel).toBeNull();
    expect(result.todayWellbeing.energyLevel).toBeNull();
    expect(result.unreadRecommendations).toBe(0);
  });

  it('should aggregate today\'s activity data correctly', async () => {
    const today = new Date();
    
    // Insert test activities for today
    await db.insert(activitiesTable)
      .values([
        {
          user_id: testUserId,
          activity_type: 'Running',
          duration_minutes: 30,
          calories_burned: 300,
          recorded_at: today
        },
        {
          user_id: testUserId,
          activity_type: 'Walking',
          duration_minutes: 20,
          calories_burned: 100,
          recorded_at: today
        }
      ])
      .execute();

    const result = await getDashboardData(testUserId);

    expect(result.todayActivity.totalMinutes).toBe(50);
    expect(result.todayActivity.caloriesBurned).toBe(400);
    expect(result.todayActivity.activitiesCount).toBe(2);
  });

  it('should aggregate today\'s nutrition data correctly', async () => {
    const today = new Date();
    
    // Insert test nutrition entries for today
    await db.insert(nutritionTable)
      .values([
        {
          user_id: testUserId,
          meal_type: 'breakfast',
          food_item: 'Oatmeal',
          quantity: '1 bowl',
          calories: 300,
          protein: 10,
          carbs: 50,
          fat: 5,
          recorded_at: today
        },
        {
          user_id: testUserId,
          meal_type: 'lunch',
          food_item: 'Chicken Salad',
          quantity: '1 serving',
          calories: 400,
          protein: 30,
          carbs: 20,
          fat: 15,
          recorded_at: today
        }
      ])
      .execute();

    const result = await getDashboardData(testUserId);

    expect(result.todayNutrition.totalCalories).toBe(700);
    expect(result.todayNutrition.mealsCount).toBe(2);
    expect(result.todayNutrition.macros.protein).toBe(40);
    expect(result.todayNutrition.macros.carbs).toBe(70);
    expect(result.todayNutrition.macros.fat).toBe(20);
  });

  it('should aggregate today\'s hydration data correctly', async () => {
    const today = new Date();
    
    // Insert test hydration entries for today
    await db.insert(hydrationTable)
      .values([
        {
          user_id: testUserId,
          amount_ml: 500,
          beverage_type: 'water',
          recorded_at: today
        },
        {
          user_id: testUserId,
          amount_ml: 250,
          beverage_type: 'tea',
          recorded_at: today
        }
      ])
      .execute();

    const result = await getDashboardData(testUserId);

    expect(result.todayHydration.totalMl).toBe(750);
    expect(result.todayHydration.logsCount).toBe(2);
  });

  it('should return latest sleep data', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const bedtime = new Date('2024-01-01T22:00:00Z');
    const wakeTime = new Date('2024-01-02T07:00:00Z');
    
    // Insert test sleep entry
    await db.insert(sleepTable)
      .values({
        user_id: testUserId,
        bedtime: bedtime,
        wake_time: wakeTime,
        sleep_duration_hours: 9,
        sleep_quality: 'good',
        recorded_at: yesterday
      })
      .execute();

    const result = await getDashboardData(testUserId);

    expect(result.lastSleep.duration).toBe(9);
    expect(result.lastSleep.quality).toBe('good');
    expect(result.lastSleep.bedtime).toEqual(bedtime);
    expect(result.lastSleep.wakeTime).toEqual(wakeTime);
  });

  it('should return today\'s wellbeing data', async () => {
    const today = new Date();
    
    // Insert test wellbeing entry for today
    await db.insert(wellbeingTable)
      .values({
        user_id: testUserId,
        mood: 'good',
        stress_level: 'low',
        energy_level: 'high',
        recorded_at: today
      })
      .execute();

    const result = await getDashboardData(testUserId);

    expect(result.todayWellbeing.mood).toBe('good');
    expect(result.todayWellbeing.stressLevel).toBe('low');
    expect(result.todayWellbeing.energyLevel).toBe('high');
  });

  it('should count unread recommendations correctly', async () => {
    // Insert test recommendations
    await db.insert(recommendationsTable)
      .values([
        {
          user_id: testUserId,
          category: 'activity',
          title: 'Exercise More',
          description: 'Try to get 30 minutes of exercise daily',
          priority: 'medium',
          is_read: false
        },
        {
          user_id: testUserId,
          category: 'nutrition',
          title: 'Eat Vegetables',
          description: 'Include more vegetables in your diet',
          priority: 'high',
          is_read: false
        },
        {
          user_id: testUserId,
          category: 'sleep',
          title: 'Sleep Schedule',
          description: 'Maintain consistent sleep schedule',
          priority: 'low',
          is_read: true
        }
      ])
      .execute();

    const result = await getDashboardData(testUserId);

    expect(result.unreadRecommendations).toBe(2);
  });

  it('should only include today\'s data, not yesterday\'s', async () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Insert activities for today and yesterday
    await db.insert(activitiesTable)
      .values([
        {
          user_id: testUserId,
          activity_type: 'Running Today',
          duration_minutes: 30,
          calories_burned: 300,
          recorded_at: today
        },
        {
          user_id: testUserId,
          activity_type: 'Running Yesterday',
          duration_minutes: 45,
          calories_burned: 450,
          recorded_at: yesterday
        }
      ])
      .execute();

    const result = await getDashboardData(testUserId);

    // Should only count today's activity
    expect(result.todayActivity.totalMinutes).toBe(30);
    expect(result.todayActivity.caloriesBurned).toBe(300);
    expect(result.todayActivity.activitiesCount).toBe(1);
  });

  it('should handle missing optional fields gracefully', async () => {
    const today = new Date();
    
    // Insert activity without calories_burned
    await db.insert(activitiesTable)
      .values({
        user_id: testUserId,
        activity_type: 'Walking',
        duration_minutes: 20,
        recorded_at: today
      })
      .execute();

    // Insert nutrition without macros
    await db.insert(nutritionTable)
      .values({
        user_id: testUserId,
        meal_type: 'snack',
        food_item: 'Apple',
        quantity: '1 medium',
        recorded_at: today
      })
      .execute();

    const result = await getDashboardData(testUserId);

    expect(result.todayActivity.totalMinutes).toBe(20);
    expect(result.todayActivity.caloriesBurned).toBe(0);
    expect(result.todayActivity.activitiesCount).toBe(1);
    expect(result.todayNutrition.mealsCount).toBe(1);
    expect(result.todayNutrition.totalCalories).toBe(0);
    expect(result.todayNutrition.macros.protein).toBe(0);
    expect(result.todayNutrition.macros.carbs).toBe(0);
    expect(result.todayNutrition.macros.fat).toBe(0);
  });
});
