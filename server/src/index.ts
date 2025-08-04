
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createActivityInputSchema,
  createNutritionInputSchema,
  createHydrationInputSchema,
  createSleepInputSchema,
  createWellbeingInputSchema,
  createChatMessageInputSchema,
  createRecommendationInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUser } from './handlers/get_user';
import { updateUser } from './handlers/update_user';
import { createActivity } from './handlers/create_activity';
import { getActivities } from './handlers/get_activities';
import { createNutrition } from './handlers/create_nutrition';
import { getNutrition } from './handlers/get_nutrition';
import { createHydration } from './handlers/create_hydration';
import { getHydration } from './handlers/get_hydration';
import { createSleep } from './handlers/create_sleep';
import { getSleep } from './handlers/get_sleep';
import { createWellbeing } from './handlers/create_wellbeing';
import { getWellbeing } from './handlers/get_wellbeing';
import { createChatMessage } from './handlers/create_chat_message';
import { getChatMessages } from './handlers/get_chat_messages';
import { processChatMessage } from './handlers/process_chat_message';
import { createRecommendation } from './handlers/create_recommendation';
import { getRecommendations } from './handlers/get_recommendations';
import { generateRecommendations } from './handlers/generate_recommendations';
import { markRecommendationRead } from './handlers/mark_recommendation_read';
import { getDashboardData } from './handlers/get_dashboard_data';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUser: publicProcedure
    .input(z.number())
    .query(({ input }) => getUser(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Activity tracking
  createActivity: publicProcedure
    .input(createActivityInputSchema)
    .mutation(({ input }) => createActivity(input)),
  
  getActivities: publicProcedure
    .input(z.object({ userId: z.number(), date: z.coerce.date().optional() }))
    .query(({ input }) => getActivities(input.userId, input.date)),

  // Nutrition tracking
  createNutrition: publicProcedure
    .input(createNutritionInputSchema)
    .mutation(({ input }) => createNutrition(input)),
  
  getNutrition: publicProcedure
    .input(z.object({ userId: z.number(), date: z.coerce.date().optional() }))
    .query(({ input }) => getNutrition(input.userId, input.date)),

  // Hydration tracking
  createHydration: publicProcedure
    .input(createHydrationInputSchema)
    .mutation(({ input }) => createHydration(input)),
  
  getHydration: publicProcedure
    .input(z.object({ userId: z.number(), date: z.coerce.date().optional() }))
    .query(({ input }) => getHydration(input.userId, input.date)),

  // Sleep tracking
  createSleep: publicProcedure
    .input(createSleepInputSchema)
    .mutation(({ input }) => createSleep(input)),
  
  getSleep: publicProcedure
    .input(z.object({ userId: z.number(), date: z.coerce.date().optional() }))
    .query(({ input }) => getSleep(input.userId, input.date)),

  // Well-being tracking
  createWellbeing: publicProcedure
    .input(createWellbeingInputSchema)
    .mutation(({ input }) => createWellbeing(input)),
  
  getWellbeing: publicProcedure
    .input(z.object({ userId: z.number(), date: z.coerce.date().optional() }))
    .query(({ input }) => getWellbeing(input.userId, input.date)),

  // Chat functionality
  createChatMessage: publicProcedure
    .input(createChatMessageInputSchema)
    .mutation(({ input }) => createChatMessage(input)),
  
  getChatMessages: publicProcedure
    .input(z.object({ userId: z.number(), limit: z.number().optional() }))
    .query(({ input }) => getChatMessages(input.userId, input.limit)),
  
  processChatMessage: publicProcedure
    .input(z.number())
    .mutation(({ input }) => processChatMessage(input)),

  // Recommendations
  createRecommendation: publicProcedure
    .input(createRecommendationInputSchema)
    .mutation(({ input }) => createRecommendation(input)),
  
  getRecommendations: publicProcedure
    .input(z.object({ userId: z.number(), unreadOnly: z.boolean().optional() }))
    .query(({ input }) => getRecommendations(input.userId, input.unreadOnly)),
  
  generateRecommendations: publicProcedure
    .input(z.number())
    .mutation(({ input }) => generateRecommendations(input)),
  
  markRecommendationRead: publicProcedure
    .input(z.number())
    .mutation(({ input }) => markRecommendationRead(input)),

  // Dashboard data
  getDashboardData: publicProcedure
    .input(z.number())
    .query(({ input }) => getDashboardData(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
