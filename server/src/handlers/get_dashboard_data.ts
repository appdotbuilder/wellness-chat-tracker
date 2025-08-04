
import { db } from '../db';
import { activitiesTable, nutritionTable, hydrationTable, sleepTable, wellbeingTable, recommendationsTable } from '../db/schema';
import { eq, gte, lte, and, desc, sum, count } from 'drizzle-orm';

export interface DashboardData {
  todayActivity: {
    totalMinutes: number;
    caloriesBurned: number;
    activitiesCount: number;
  };
  todayNutrition: {
    totalCalories: number;
    mealsCount: number;
    macros: {
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  todayHydration: {
    totalMl: number;
    logsCount: number;
  };
  lastSleep: {
    duration: number;
    quality: string | null;
    bedtime: Date | null;
    wakeTime: Date | null;
  };
  todayWellbeing: {
    mood: string | null;
    stressLevel: string | null;
    energyLevel: string | null;
  };
  unreadRecommendations: number;
}

export const getDashboardData = async (userId: number): Promise<DashboardData> => {
  try {
    // Get today's date range (start and end of today)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get today's activity data
    const activityStats = await db.select({
      totalMinutes: sum(activitiesTable.duration_minutes),
      totalCalories: sum(activitiesTable.calories_burned),
      count: count(activitiesTable.id)
    })
      .from(activitiesTable)
      .where(
        and(
          eq(activitiesTable.user_id, userId),
          gte(activitiesTable.recorded_at, startOfDay),
          lte(activitiesTable.recorded_at, endOfDay)
        )
      )
      .execute();

    const activityData = activityStats[0];

    // Get today's nutrition data
    const nutritionStats = await db.select({
      totalCalories: sum(nutritionTable.calories),
      totalProtein: sum(nutritionTable.protein),
      totalCarbs: sum(nutritionTable.carbs),
      totalFat: sum(nutritionTable.fat),
      count: count(nutritionTable.id)
    })
      .from(nutritionTable)
      .where(
        and(
          eq(nutritionTable.user_id, userId),
          gte(nutritionTable.recorded_at, startOfDay),
          lte(nutritionTable.recorded_at, endOfDay)
        )
      )
      .execute();

    const nutritionData = nutritionStats[0];

    // Get today's hydration data
    const hydrationStats = await db.select({
      totalMl: sum(hydrationTable.amount_ml),
      count: count(hydrationTable.id)
    })
      .from(hydrationTable)
      .where(
        and(
          eq(hydrationTable.user_id, userId),
          gte(hydrationTable.recorded_at, startOfDay),
          lte(hydrationTable.recorded_at, endOfDay)
        )
      )
      .execute();

    const hydrationData = hydrationStats[0];

    // Get latest sleep record
    const latestSleep = await db.select()
      .from(sleepTable)
      .where(eq(sleepTable.user_id, userId))
      .orderBy(desc(sleepTable.recorded_at))
      .limit(1)
      .execute();

    const sleepData = latestSleep[0];

    // Get today's wellbeing data (most recent entry for today)
    const todayWellbeing = await db.select()
      .from(wellbeingTable)
      .where(
        and(
          eq(wellbeingTable.user_id, userId),
          gte(wellbeingTable.recorded_at, startOfDay),
          lte(wellbeingTable.recorded_at, endOfDay)
        )
      )
      .orderBy(desc(wellbeingTable.recorded_at))
      .limit(1)
      .execute();

    const wellbeingData = todayWellbeing[0];

    // Get unread recommendations count
    const unreadRecommendationsStats = await db.select({
      count: count(recommendationsTable.id)
    })
      .from(recommendationsTable)
      .where(
        and(
          eq(recommendationsTable.user_id, userId),
          eq(recommendationsTable.is_read, false)
        )
      )
      .execute();

    const unreadCount = unreadRecommendationsStats[0];

    return {
      todayActivity: {
        totalMinutes: Number(activityData.totalMinutes) || 0,
        caloriesBurned: parseFloat(String(activityData.totalCalories)) || 0,
        activitiesCount: Number(activityData.count) || 0
      },
      todayNutrition: {
        totalCalories: parseFloat(String(nutritionData.totalCalories)) || 0,
        mealsCount: Number(nutritionData.count) || 0,
        macros: {
          protein: parseFloat(String(nutritionData.totalProtein)) || 0,
          carbs: parseFloat(String(nutritionData.totalCarbs)) || 0,
          fat: parseFloat(String(nutritionData.totalFat)) || 0
        }
      },
      todayHydration: {
        totalMl: Number(hydrationData.totalMl) || 0,
        logsCount: Number(hydrationData.count) || 0
      },
      lastSleep: {
        duration: sleepData ? parseFloat(String(sleepData.sleep_duration_hours)) : 0,
        quality: sleepData?.sleep_quality || null,
        bedtime: sleepData?.bedtime || null,
        wakeTime: sleepData?.wake_time || null
      },
      todayWellbeing: {
        mood: wellbeingData?.mood || null,
        stressLevel: wellbeingData?.stress_level || null,
        energyLevel: wellbeingData?.energy_level || null
      },
      unreadRecommendations: Number(unreadCount.count) || 0
    };
  } catch (error) {
    console.error('Dashboard data fetch failed:', error);
    throw error;
  }
};
