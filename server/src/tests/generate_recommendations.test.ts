
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  activitiesTable, 
  sleepTable, 
  nutritionTable, 
  wellbeingTable,
  hydrationTable,
  recommendationsTable
} from '../db/schema';
import { generateRecommendations } from '../handlers/generate_recommendations';
import { eq } from 'drizzle-orm';

describe('generateRecommendations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should throw error for non-existent user', async () => {
    await expect(generateRecommendations(999)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should generate activity recommendation for inactive users', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Generate recommendations (no activity data)
    const recommendations = await generateRecommendations(userId);

    // Should include activity recommendation
    const activityRec = recommendations.find(r => r.category === 'activity');
    expect(activityRec).toBeDefined();
    expect(activityRec?.title).toEqual('Start Regular Exercise');
    expect(activityRec?.priority).toEqual('high');

    // Verify saved to database
    const savedRecs = await db.select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.user_id, userId))
      .execute();

    expect(savedRecs.length).toBeGreaterThan(0);
    const savedActivityRec = savedRecs.find(r => r.category === 'activity');
    expect(savedActivityRec).toBeDefined();
  });

  it('should generate sleep recommendations for poor sleep patterns', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add some activities to avoid activity recommendation
    for (let i = 0; i < 5; i++) {
      await db.insert(activitiesTable)
        .values({
          user_id: userId,
          activity_type: 'running',
          duration_minutes: 30,
          recorded_at: new Date()
        })
        .execute();
    }

    // Add poor sleep data
    const baseDate = new Date();
    for (let i = 0; i < 5; i++) {
      const sleepDate = new Date(baseDate);
      sleepDate.setDate(sleepDate.getDate() - i);
      
      await db.insert(sleepTable)
        .values({
          user_id: userId,
          bedtime: new Date(sleepDate.getTime() - 6 * 60 * 60 * 1000), // 6 hours before wake
          wake_time: sleepDate,
          sleep_duration_hours: 5.5, // Less than 7 hours
          sleep_quality: i < 3 ? 'poor' : 'fair',
          recorded_at: sleepDate
        })
        .execute();
    }

    const recommendations = await generateRecommendations(userId);

    // Should include sleep duration and quality recommendations
    const sleepRecs = recommendations.filter(r => r.category === 'sleep');
    expect(sleepRecs.length).toBeGreaterThan(0);
    
    const durationRec = sleepRecs.find(r => r.title.includes('Sleep Duration'));
    expect(durationRec).toBeDefined();
    expect(durationRec?.priority).toEqual('high');

    const qualityRec = sleepRecs.find(r => r.title.includes('Sleep Quality'));
    expect(qualityRec).toBeDefined();
  });

  it('should generate nutrition recommendations for skipping breakfast', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add sufficient activities to avoid activity rec
    for (let i = 0; i < 5; i++) {
      await db.insert(activitiesTable)
        .values({
          user_id: userId,
          activity_type: 'walking',
          duration_minutes: 30,
          recorded_at: new Date()
        })
        .execute();
    }

    // Add nutrition data with mostly lunch/dinner, very few breakfasts
    const baseDate = new Date();
    for (let i = 0; i < 20; i++) {
      const mealDate = new Date(baseDate);
      mealDate.setDate(mealDate.getDate() - Math.floor(i / 3));
      
      // Only 2 breakfasts out of 20 meals (10% - well below 20% threshold)
      const mealType = i < 2 ? 'breakfast' : (i % 2 === 0 ? 'lunch' : 'dinner');
      
      await db.insert(nutritionTable)
        .values({
          user_id: userId,
          meal_type: mealType,
          food_item: 'Test Food',
          quantity: '1 serving',
          recorded_at: mealDate
        })
        .execute();
    }

    const recommendations = await generateRecommendations(userId);

    const nutritionRec = recommendations.find(r => 
      r.category === 'nutrition' && r.title.includes('Breakfast')
    );
    expect(nutritionRec).toBeDefined();
    expect(nutritionRec?.priority).toEqual('medium');
  });

  it('should generate wellbeing recommendations for high stress', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add sufficient activities
    for (let i = 0; i < 5; i++) {
      await db.insert(activitiesTable)
        .values({
          user_id: userId,
          activity_type: 'yoga',
          duration_minutes: 45,
          recorded_at: new Date()
        })
        .execute();
    }

    // Add high stress wellbeing data
    const baseDate = new Date();
    for (let i = 0; i < 7; i++) {
      const entryDate = new Date(baseDate);
      entryDate.setDate(entryDate.getDate() - i);
      
      await db.insert(wellbeingTable)
        .values({
          user_id: userId,
          mood: 'neutral',
          stress_level: i < 4 ? 'very_high' : 'moderate', // 4 high stress entries
          energy_level: i < 4 ? 'very_low' : 'moderate', // 4 low energy entries
          recorded_at: entryDate
        })
        .execute();
    }

    const recommendations = await generateRecommendations(userId);

    const stressRec = recommendations.find(r => 
      r.category === 'wellbeing' && r.title.includes('Stress')
    );
    expect(stressRec).toBeDefined();
    expect(stressRec?.priority).toEqual('high');

    const energyRec = recommendations.find(r => 
      r.category === 'wellbeing' && r.title.includes('Energy')
    );
    expect(energyRec).toBeDefined();
    expect(energyRec?.priority).toEqual('medium');
  });

  it('should generate hydration recommendations', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add sufficient activities
    for (let i = 0; i < 5; i++) {
      await db.insert(activitiesTable)
        .values({
          user_id: userId,
          activity_type: 'swimming',
          duration_minutes: 60,
          recorded_at: new Date()
        })
        .execute();
    }

    // Add low hydration data
    const baseDate = new Date();
    for (let i = 0; i < 10; i++) {
      const hydrationDate = new Date(baseDate);
      hydrationDate.setDate(hydrationDate.getDate() - i);
      
      await db.insert(hydrationTable)
        .values({
          user_id: userId,
          amount_ml: 200, // Low daily intake
          beverage_type: 'water',
          recorded_at: hydrationDate
        })
        .execute();
    }

    const recommendations = await generateRecommendations(userId);

    const hydrationRec = recommendations.find(r => r.category === 'hydration');
    expect(hydrationRec).toBeDefined();
    expect(hydrationRec?.title).toEqual('Increase Water Intake');
    expect(hydrationRec?.priority).toEqual('medium');
  });

  it('should generate goal-based recommendation for user with goals', async () => {
    // Create test user with goals
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Test User',
        email: 'test@example.com',
        goals: 'Lose 10 pounds and improve fitness',
        onboarding_completed: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add sufficient activities to avoid activity rec
    for (let i = 0; i < 5; i++) {
      await db.insert(activitiesTable)
        .values({
          user_id: userId,
          activity_type: 'running',
          duration_minutes: 30,
          recorded_at: new Date()
        })
        .execute();
    }

    const recommendations = await generateRecommendations(userId);

    const goalRec = recommendations.find(r => r.category === 'general');
    expect(goalRec).toBeDefined();
    expect(goalRec?.description).toContain('Lose 10 pounds and improve fitness');
  });

  it('should provide positive feedback for users with good habits', async () => {
    // Create test user without goals to force fallback to positive feedback
    const userResult = await db.insert(usersTable)
      .values({
        name: 'Healthy User',
        email: 'healthy@example.com',
        goals: null, // No goals set
        onboarding_completed: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Add good activity data (enough to avoid activity recommendation)
    for (let i = 0; i < 5; i++) {
      await db.insert(activitiesTable)
        .values({
          user_id: userId,
          activity_type: 'running',
          duration_minutes: 45,
          recorded_at: new Date()
        })
        .execute();
    }

    // Add good sleep data (enough to avoid sleep recommendations)
    const baseDate = new Date();
    for (let i = 0; i < 5; i++) {
      const sleepDate = new Date(baseDate);
      sleepDate.setDate(sleepDate.getDate() - i);
      
      await db.insert(sleepTable)
        .values({
          user_id: userId,
          bedtime: new Date(sleepDate.getTime() - 8 * 60 * 60 * 1000),
          wake_time: sleepDate,
          sleep_duration_hours: 8, // Good sleep duration (>=7)
          sleep_quality: 'good', // Good quality
          recorded_at: sleepDate
        })
        .execute();
    }

    // Add good wellbeing data (to avoid stress/energy recommendations)
    for (let i = 0; i < 7; i++) {
      const entryDate = new Date(baseDate);
      entryDate.setDate(entryDate.getDate() - i);
      
      await db.insert(wellbeingTable)
        .values({
          user_id: userId,
          mood: 'good',
          stress_level: 'low', // Good stress levels
          energy_level: 'high', // Good energy levels
          recorded_at: entryDate
        })
        .execute();
    }

    // Add good hydration data to avoid hydration recommendations
    for (let i = 0; i < 10; i++) {
      const hydrationDate = new Date(baseDate);
      hydrationDate.setDate(hydrationDate.getDate() - i);
      
      await db.insert(hydrationTable)
        .values({
          user_id: userId,
          amount_ml: 2500, // Good daily intake (above 2000ml threshold)
          beverage_type: 'water',
          recorded_at: hydrationDate
        })
        .execute();
    }

    const recommendations = await generateRecommendations(userId);

    // Should have at least one recommendation (positive feedback since no goals set)
    expect(recommendations.length).toBeGreaterThan(0);
    const positiveRec = recommendations.find(r => 
      r.title.includes('Keep Up') || r.title.includes('Good Work')
    );
    expect(positiveRec).toBeDefined();
    expect(positiveRec?.category).toEqual('general');
  });
});
