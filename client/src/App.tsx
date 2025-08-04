
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Activity, Utensils, Droplets, Moon, Heart, Target, Settings } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { ChatInterface } from '@/components/ChatInterface';
import { ActivityTracker } from '@/components/ActivityTracker';
import { NutritionTracker } from '@/components/NutritionTracker';
import { HydrationTracker } from '@/components/HydrationTracker';
import { SleepTracker } from '@/components/SleepTracker';
import { WellbeingTracker } from '@/components/WellbeingTracker';
import { RecommendationsPanel } from '@/components/RecommendationsPanel';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import type { User } from '../../server/src/schema';
import type { DashboardData } from '../../server/src/handlers/get_dashboard_data';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const USER_ID = 1;

  const loadUserData = useCallback(async () => {
    try {
      const userData = await trpc.getUser.query(USER_ID);
      setUser(userData);
      
      if (userData && !userData.onboarding_completed) {
        setShowOnboarding(true);
      }

      const dashboard = await trpc.getDashboardData.query(USER_ID);
      setDashboardData(dashboard);
    } catch (error) {
      console.error('Failed to load user data:', error);
      // If user doesn't exist, show onboarding
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleOnboardingComplete = (userData: User) => {
    setUser(userData);
    setShowOnboarding(false);
    loadUserData(); // Refresh dashboard data
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your wellness dashboard...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name || 'User'}! 👋
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {dashboardData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-orange-600" />
                  <div className="ml-2">
                    <p className="text-xs text-orange-800">Activity</p>
                    <p className="text-lg font-semibold text-orange-900">
                      {dashboardData.todayActivity.totalMinutes}m
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Utensils className="h-5 w-5 text-green-600" />
                  <div className="ml-2">
                    <p className="text-xs text-green-800">Calories</p>
                    <p className="text-lg font-semibold text-green-900">
                      {dashboardData.todayNutrition.totalCalories}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Droplets className="h-5 w-5 text-blue-600" />
                  <div className="ml-2">
                    <p className="text-xs text-blue-800">Hydration</p>
                    <p className="text-lg font-semibold text-blue-900">
                      {Math.round(dashboardData.todayHydration.totalMl / 1000 * 10) / 10}L
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Moon className="h-5 w-5 text-purple-600" />
                  <div className="ml-2">
                    <p className="text-xs text-purple-800">Sleep</p>
                    <p className="text-lg font-semibold text-purple-900">
                      {dashboardData.lastSleep.duration || 0}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 bg-white border shadow-sm rounded-lg p-1">
            <TabsTrigger value="chat" className="data-[state=active]:bg-indigo-100">
              <MessageCircle className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-orange-100">
              <Activity className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="data-[state=active]:bg-green-100">
              <Utensils className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="hydration" className="data-[state=active]:bg-blue-100">
              <Droplets className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="sleep" className="data-[state=active]:bg-purple-100">
              <Moon className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="wellbeing" className="data-[state=active]:bg-pink-100">
              <Heart className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="data-[state=active]:bg-yellow-100 relative">
              <Target className="h-4 w-4" />
              {dashboardData && dashboardData.unreadRecommendations > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center bg-red-500">
                  {dashboardData.unreadRecommendations}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="chat" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-indigo-600" />
                    Wellness Chat
                  </CardTitle>
                  <CardDescription>
                    Chat naturally about your day, and I'll help track your wellness data! 💬
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ChatInterface userId={USER_ID} onDataUpdate={loadUserData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-600" />
                    Activity Tracking
                  </CardTitle>
                  <CardDescription>
                    Log your workouts and physical activities 🏃‍♀️
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityTracker userId={USER_ID} onUpdate={loadUserData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nutrition" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-green-600" />
                    Nutrition Tracking
                  </CardTitle>
                  <CardDescription>
                    Track your meals and nutritional intake 🥗
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NutritionTracker userId={USER_ID} onUpdate={loadUserData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hydration" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-blue-600" />
                    Hydration Tracking
                  </CardTitle>
                  <CardDescription>
                    Monitor your daily water and fluid intake 💧
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HydrationTracker userId={USER_ID} onUpdate={loadUserData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sleep" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="h-5 w-5 text-purple-600" />
                    Sleep & Rest
                  </CardTitle>
                  <CardDescription>
                    Track your sleep patterns and quality 😴
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SleepTracker userId={USER_ID} onUpdate={loadUserData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wellbeing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-600" />
                    Mental Well-being
                  </CardTitle>
                  <CardDescription>
                    Track your mood, stress, and energy levels 🧘‍♀️
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WellbeingTracker userId={USER_ID} onUpdate={loadUserData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-yellow-600" />
                    Personalized Recommendations
                  </CardTitle>
                  <CardDescription>
                    AI-powered insights based on your wellness data 🎯
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecommendationsPanel userId={USER_ID} onUpdate={loadUserData} />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
