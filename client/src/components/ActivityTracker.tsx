
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Clock, Flame, TrendingUp } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Activity, CreateActivityInput } from '../../../server/src/schema';

interface ActivityTrackerProps {
  userId: number;
  onUpdate: () => void;
}

export function ActivityTracker({ userId, onUpdate }: ActivityTrackerProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<CreateActivityInput>({
    user_id: userId,
    activity_type: '',
    duration_minutes: 0,
    calories_burned: undefined,
    intensity: undefined,
    notes: null,
    recorded_at: undefined
  });

  const loadActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getActivities.query({ userId });
      setActivities(result);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activity_type || formData.duration_minutes <= 0) return;

    setIsSubmitting(true);
    try {
      await trpc.createActivity.mutate(formData);
      
      // Reset form
      setFormData({
        user_id: userId,
        activity_type: '',
        duration_minutes: 0,
        calories_burned: undefined,
        intensity: undefined,
        notes: null,
        recorded_at: undefined
      });
      
      setShowForm(false);
      await loadActivities();
      onUpdate();
    } catch (error) {
      console.error('Failed to create activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIntensityColor = (intensity: string | undefined) => {
    switch (intensity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const todayActivities = activities.filter((activity: Activity) => {
    const today = new Date();
    const activityDate = new Date(activity.recorded_at);
    return activityDate.toDateString() === today.toDateString();
  });

  const totalMinutesToday = todayActivities.reduce((sum: number, activity: Activity) => 
    sum + activity.duration_minutes, 0
  );
  const totalCaloriesToday = todayActivities.reduce((sum: number, activity: Activity) => 
    sum + (activity.calories_burned || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-2">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">{totalMinutesToday}</p>
          <p className="text-xs text-orange-700">Minutes Today</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mx-auto mb-2">
            <Flame className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900">{totalCaloriesToday}</p>
          <p className="text-xs text-red-700">Calories Burned</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{todayActivities.length}</p>
          <p className="text-xs text-blue-700">Activities</p>
        </div>
      </div>

      <Separator />

      {/* Add Activity Button */}
      {!showForm && (
        <Button 
          onClick={() => setShowForm(true)}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Log New Activity
        </Button>
      )}

      {/* Activity Form */}
      {showForm && (
        <Card className="border-orange-200">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activity_type">Activity Type *</Label>
                  <Input
                    id="activity_type"
                    value={formData.activity_type}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        activity_type: e.target.value 
                      }))
                    }
                    placeholder="e.g., Running, Yoga, Weightlifting"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        duration_minutes: parseInt(e.target.value) || 0 
                      }))
                    }
                    placeholder="30"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories Burned</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={formData.calories_burned || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        calories_burned: parseFloat(e.target.value) || undefined 
                      }))
                    }
                    placeholder="200"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Intensity</Label>
                  <Select 
                    value={formData.intensity || ''} 
                    onValueChange={(value: 'low' | 'moderate' | 'high') =>
                      setFormData((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        intensity: value || undefined 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select intensity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateActivityInput) => ({ 
                      ...prev, 
                      notes: e.target.value || null 
                    }))
                  }
                  placeholder="How did it feel? Any observations..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isSubmitting ? 'Saving...' : 'Save Activity'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Recent Activities</h3>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No activities logged yet! 🏃‍♀️</p>
            <p className="text-sm mt-1">Start by adding your first activity above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity: Activity) => (
              <Card key={activity.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{activity.activity_type}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.duration_minutes}min
                        </span>
                        {activity.calories_burned && (
                          <span className="flex items-center gap-1">
                            <Flame className="h-3 w-3" />
                            {activity.calories_burned} cal
                          </span>
                        )}
                      </div>
                      {activity.notes && (
                        <p className="text-sm text-gray-600 mt-2">{activity.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {activity.intensity && (
                        <Badge className={getIntensityColor(activity.intensity)}>
                          {activity.intensity}
                        </Badge>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.recorded_at.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
