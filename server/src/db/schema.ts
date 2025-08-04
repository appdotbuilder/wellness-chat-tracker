
import { serial, text, pgTable, timestamp, integer, real, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);
export const activityLevelEnum = pgEnum('activity_level', ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']);
export const intensityEnum = pgEnum('intensity', ['low', 'moderate', 'high']);
export const mealTypeEnum = pgEnum('meal_type', ['breakfast', 'lunch', 'dinner', 'snack']);
export const qualityEnum = pgEnum('quality', ['very_poor', 'poor', 'fair', 'neutral', 'good', 'excellent']);
export const levelEnum = pgEnum('level', ['very_low', 'low', 'moderate', 'high', 'very_high']);
export const messageTypeEnum = pgEnum('message_type', ['user', 'system']);
export const categoryEnum = pgEnum('category', ['activity', 'nutrition', 'hydration', 'sleep', 'wellbeing', 'general']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  age: integer('age'),
  gender: genderEnum('gender'),
  height: real('height'), // in cm
  weight: real('weight'), // in kg
  activity_level: activityLevelEnum('activity_level'),
  goals: text('goals'),
  onboarding_completed: boolean('onboarding_completed').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Activities table
export const activitiesTable = pgTable('activities', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  activity_type: text('activity_type').notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  calories_burned: real('calories_burned'),
  intensity: intensityEnum('intensity'),
  notes: text('notes'),
  recorded_at: timestamp('recorded_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Nutrition table
export const nutritionTable = pgTable('nutrition', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  meal_type: mealTypeEnum('meal_type').notNull(),
  food_item: text('food_item').notNull(),
  quantity: text('quantity').notNull(),
  calories: real('calories'),
  protein: real('protein'), // in grams
  carbs: real('carbs'), // in grams
  fat: real('fat'), // in grams
  notes: text('notes'),
  recorded_at: timestamp('recorded_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Hydration table
export const hydrationTable = pgTable('hydration', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  amount_ml: integer('amount_ml').notNull(), // in milliliters
  beverage_type: text('beverage_type'),
  recorded_at: timestamp('recorded_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Sleep table
export const sleepTable = pgTable('sleep', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  bedtime: timestamp('bedtime').notNull(),
  wake_time: timestamp('wake_time').notNull(),
  sleep_duration_hours: real('sleep_duration_hours').notNull(),
  sleep_quality: qualityEnum('sleep_quality'),
  notes: text('notes'),
  recorded_at: timestamp('recorded_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Well-being table
export const wellbeingTable = pgTable('wellbeing', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  mood: qualityEnum('mood').notNull(),
  stress_level: levelEnum('stress_level').notNull(),
  energy_level: levelEnum('energy_level').notNull(),
  notes: text('notes'),
  recorded_at: timestamp('recorded_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Chat messages table
export const chatMessagesTable = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  message: text('message').notNull(),
  message_type: messageTypeEnum('message_type').notNull(),
  data_extracted: boolean('data_extracted').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Recommendations table
export const recommendationsTable = pgTable('recommendations', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  category: categoryEnum('category').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: priorityEnum('priority').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  activities: many(activitiesTable),
  nutrition: many(nutritionTable),
  hydration: many(hydrationTable),
  sleep: many(sleepTable),
  wellbeing: many(wellbeingTable),
  chatMessages: many(chatMessagesTable),
  recommendations: many(recommendationsTable),
}));

export const activitiesRelations = relations(activitiesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [activitiesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const nutritionRelations = relations(nutritionTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [nutritionTable.user_id],
    references: [usersTable.id],
  }),
}));

export const hydrationRelations = relations(hydrationTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [hydrationTable.user_id],
    references: [usersTable.id],
  }),
}));

export const sleepRelations = relations(sleepTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sleepTable.user_id],
    references: [usersTable.id],
  }),
}));

export const wellbeingRelations = relations(wellbeingTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [wellbeingTable.user_id],
    references: [usersTable.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessagesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [chatMessagesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const recommendationsRelations = relations(recommendationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [recommendationsTable.user_id],
    references: [usersTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  activities: activitiesTable,
  nutrition: nutritionTable,
  hydration: hydrationTable,
  sleep: sleepTable,
  wellbeing: wellbeingTable,
  chatMessages: chatMessagesTable,
  recommendations: recommendationsTable,
};
