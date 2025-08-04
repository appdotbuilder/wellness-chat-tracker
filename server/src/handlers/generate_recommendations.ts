
import { db } from '../db';
import { 
  recommendationsTable, 
  usersTable, 
  activitiesTable, 
  nutritionTable, 
  sleepTable, 
  wellbeingTable,
  hydrationTable
} from '../db/schema';
import { type Recommendation } from '../schema';
import { eq, gte, desc, avg, count, sum } from 'drizzle-orm';

export const generateRecommendations = async (userId: number): Promise<Recommendation[]> => {
  try {
    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    const user = users[0];
    
    // Get data from the last 7 days for analysis
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recommendations: Array<{
      category: 'activity' | 'nutrition' | 'hydration' | 'sleep' | 'wellbeing' | 'general';
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];

    // Analyze activity patterns
    const recentActivities = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.user_id, userId))
      .orderBy(desc(activitiesTable.recorded_at))
      .limit(10)
      .execute();

    if (recentActivities.length < 3) {
      recommendations.push({
        category: 'activity',
        title: 'Start Regular Exercise',
        description: 'You haven\'t logged much physical activity recently. Try to incorporate at least 30 minutes of exercise into your daily routine.',
        priority: 'high'
      });
    }

    // Analyze sleep patterns
    const recentSleep = await db.select()
      .from(sleepTable)
      .where(eq(sleepTable.user_id, userId))
      .orderBy(desc(sleepTable.recorded_at))
      .limit(7)
      .execute();

    if (recentSleep.length > 0) {
      const avgSleepDuration = recentSleep.reduce((sum, sleep) => sum + sleep.sleep_duration_hours, 0) / recentSleep.length;
      
      if (avgSleepDuration < 7) {
        recommendations.push({
          category: 'sleep',
          title: 'Improve Sleep Duration',
          description: `Your average sleep duration is ${avgSleepDuration.toFixed(1)} hours. Aim for 7-9 hours of sleep per night for optimal health.`,
          priority: 'high'
        });
      }

      const poorSleepCount = recentSleep.filter(s => s.sleep_quality === 'poor').length;
      if (poorSleepCount > 2) {
        recommendations.push({
          category: 'sleep',
          title: 'Enhance Sleep Quality',
          description: 'You\'ve reported poor sleep quality multiple times recently. Consider establishing a consistent bedtime routine.',
          priority: 'medium'
        });
      }
    }

    // Analyze nutrition patterns
    const recentNutrition = await db.select()
      .from(nutritionTable)
      .where(eq(nutritionTable.user_id, userId))
      .orderBy(desc(nutritionTable.recorded_at))
      .limit(21) // Last 7 days * 3 meals
      .execute();

    if (recentNutrition.length > 10) {
      const mealTypes = recentNutrition.map(n => n.meal_type);
      const breakfastCount = mealTypes.filter(m => m === 'breakfast').length;
      const totalMeals = recentNutrition.length;
      
      // If breakfast is less than 20% of total meals, recommend breakfast
      if (breakfastCount / totalMeals < 0.2) {
        recommendations.push({
          category: 'nutrition',
          title: 'Don\'t Skip Breakfast',
          description: 'You\'ve been missing breakfast frequently. A healthy breakfast can boost your energy and metabolism.',
          priority: 'medium'
        });
      }
    }

    // Analyze hydration
    const recentHydration = await db.select()
      .from(hydrationTable)
      .where(eq(hydrationTable.user_id, userId))
      .orderBy(desc(hydrationTable.recorded_at))
      .limit(14)
      .execute();

    if (recentHydration.length > 0) {
      const dailyAvgHydration = recentHydration.reduce((sum, h) => sum + h.amount_ml, 0) / 7; // Assuming entries per week
      
      if (dailyAvgHydration < 2000) {
        recommendations.push({
          category: 'hydration',
          title: 'Increase Water Intake',
          description: 'Your daily water intake appears low. Aim for at least 8 glasses (2000ml) of water per day.',
          priority: 'medium'
        });
      }
    } else {
      // Only suggest tracking hydration if user has other tracking data
      const hasOtherData = recentActivities.length > 0 || recentSleep.length > 0 || recentNutrition.length > 0;
      if (hasOtherData) {
        recommendations.push({
          category: 'hydration',
          title: 'Track Your Hydration',
          description: 'Start tracking your daily water intake to ensure you\'re staying properly hydrated.',
          priority: 'low'
        });
      }
    }

    // Analyze wellbeing patterns
    const recentWellbeing = await db.select()
      .from(wellbeingTable)
      .where(eq(wellbeingTable.user_id, userId))
      .orderBy(desc(wellbeingTable.recorded_at))
      .limit(7)
      .execute();

    if (recentWellbeing.length > 0) {
      const highStressCount = recentWellbeing.filter(w => 
        w.stress_level === 'high' || w.stress_level === 'very_high'
      ).length;
      
      if (highStressCount > 3) {
        recommendations.push({
          category: 'wellbeing',
          title: 'Manage Stress Levels',
          description: 'You\'ve reported high stress levels frequently. Consider stress-reduction techniques like meditation or deep breathing exercises.',
          priority: 'high'
        });
      }

      const lowEnergyCount = recentWellbeing.filter(w => 
        w.energy_level === 'low' || w.energy_level === 'very_low'
      ).length;
      
      if (lowEnergyCount > 3) {
        recommendations.push({
          category: 'wellbeing',
          title: 'Boost Energy Levels',
          description: 'Your energy levels have been low recently. Ensure you\'re getting enough sleep, nutrition, and physical activity.',
          priority: 'medium'
        });
      }
    }

    // General recommendation based on user profile
    if (user.goals) {
      recommendations.push({
        category: 'general',
        title: 'Stay Focused on Your Goals',
        description: `Remember your goal: "${user.goals}". Keep tracking your progress and stay consistent with healthy habits.`,
        priority: 'low'
      });
    }

    // If no specific recommendations, provide a general wellness tip
    if (recommendations.length === 0) {
      recommendations.push({
        category: 'general',
        title: 'Keep Up the Good Work',
        description: 'Your health metrics look good! Continue maintaining your healthy lifestyle habits.',
        priority: 'low'
      });
    }

    // Save recommendations to database
    const savedRecommendations: Recommendation[] = [];
    
    for (const rec of recommendations) {
      const result = await db.insert(recommendationsTable)
        .values({
          user_id: userId,
          category: rec.category,
          title: rec.title,
          description: rec.description,
          priority: rec.priority
        })
        .returning()
        .execute();

      savedRecommendations.push(result[0]);
    }

    return savedRecommendations;
  } catch (error) {
    console.error('Recommendation generation failed:', error);
    throw error;
  }
};
