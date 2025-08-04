
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Target, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Recommendation } from '../../../server/src/schema';

interface RecommendationsPanelProps {
  userId: number;
  onUpdate: () => void;
}

export function RecommendationsPanel({ userId, onUpdate }: RecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getRecommendations.query({ userId });
      setRecommendations(result);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    try {
      await trpc.generateRecommendations.mutate(userId);
      await loadRecommendations();
      onUpdate();
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAsRead = async (recommendationId: number) => {
    try {
      await trpc.markRecommendationRead.mutate(recommendationId);
      await loadRecommendations();
      onUpdate();
    } catch (error) {
      console.error('Failed to mark recommendation as read:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Target className="h-4 w-4" />;
      case 'low': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'activity': return 'bg-orange-100 text-orange-800';
      case 'nutrition': return 'bg-green-100 text-green-800';
      case 'hydration': return 'bg-blue-100 text-blue-800';
      case 'sleep': return 'bg-purple-100 text-purple-800';
      case 'wellbeing': return 'bg-pink-100 text-pink-800';
      case 'general': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'activity': return '🏃‍♀️';
      case 'nutrition': return '🥗';
      case 'hydration': return '💧';
      case 'sleep': return '😴';
      case 'wellbeing': return '🧘‍♀️';
      case 'general': return '💡';
      default: return '💡';
    }
  };

  const unreadRecommendations = recommendations.filter((rec: Recommendation) => !rec.is_read);
  const readRecommendations = recommendations.filter((rec: Recommendation) => rec.is_read);

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      <div className="text-center">
        <Button 
          onClick={handleGenerateRecommendations}
          disabled={isGenerating}
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating Insights...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate New Recommendations
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          AI analyzes your wellness data to provide personalized insights
        </p>
      </div>

      <Separator />

      {/* Unread Recommendations */}
      {unreadRecommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">New Recommendations</h3>
            <Badge className="bg-red-100 text-red-800">
              {unreadRecommendations.length} new
            </Badge>
          </div>
          
          <div className="space-y-3">
            {unreadRecommendations.map((recommendation: Recommendation) => (
              <Card key={recommendation.id} className="border-2 border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(recommendation.category)}>
                        {getCategoryEmoji(recommendation.category)} {recommendation.category}
                      </Badge>
                      <Badge className={getPriorityColor(recommendation.priority)}>
                        {getPriorityIcon(recommendation.priority)}
                        <span className="ml-1">{recommendation.priority}</span>
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsRead(recommendation.id)}
                      className="text-xs"
                    >
                      Mark as Read
                    </Button>
                  </div>
                  <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-700">
                    {recommendation.description}
                  </CardDescription>
                  <p className="text-xs text-gray-500 mt-3">
                    {recommendation.created_at.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Read Recommendations */}
      {readRecommendations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Previous Recommendations</h3>
          
          <div className="space-y-3">
            {readRecommendations.slice(0, 5).map((recommendation: Recommendation) => (
              <Card key={recommendation.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getCategoryColor(recommendation.category)}>
                      {getCategoryEmoji(recommendation.category)} {recommendation.category}
                    </Badge>
                    <Badge className={getPriorityColor(recommendation.priority)}>
                      {getPriorityIcon(recommendation.priority)}
                      <span className="ml-1">{recommendation.priority}</span>
                    </Badge>
                    <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                  </div>
                  <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {recommendation.description}
                  </CardDescription>
                  <p className="text-xs text-gray-500 mt-3">
                    {recommendation.created_at.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading recommendations...</div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg mb-2">No recommendations yet! 🎯</p>
          <p className="text-sm">
            Start logging your wellness data, then generate personalized recommendations above.
          </p>
        </div>
      ) : null}
    </div>
  );
}
