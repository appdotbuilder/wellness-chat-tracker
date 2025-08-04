
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Moon, Sun, Clock } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Sleep, CreateSleepInput } from '../../../server/src/schema';

interface SleepTrackerProps {
  userId: number;
  onUpdate: () => void;
}

export function SleepTracker({ userId, onUpdate }: SleepTrackerProps) {
  const [sleep, setSleep] = useState<Sleep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<CreateSleepInput>({
    user_id: userId,
    bedtime: new Date(),
    wake_time: new Date(),
    sleep_quality: undefined,
    notes: null,
    recorded_at: undefined
  });

  const loadSleep = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getSleep.query({ userId });
      setSleep(result);
    } catch (error) {
      console.error('Failed to load sleep:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSleep();
  }, [loadSleep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      await trpc.createSleep.mutate(formData);
      
      // Reset form
      const now = new Date();
      setFormData({
        user_id: userId,
        bedtime: now,
        wake_time: now,
        sleep_quality: undefined,
        notes: null,
        recorded_at: undefined
      });
      
      setShowForm(false);
      await loadSleep();
      onUpdate();
    } catch (error) {
      console.error('Failed to create sleep entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeForInput = (date: Date) => {
    return date.toISOString().slice(0, 16);
  };

  const getQualityColor = (quality: string | undefined) => {
    switch (quality) {
      case 'poor': return 'bg-red-100 text-red-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'good': return 'bg-green-100 text-green-800';
      case 'excellent': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityEmoji = (quality: string | undefined) => {
    switch (quality) {
      case 'poor': return '😴';
      case 'fair': return '😐';
      case 'good': return '😊';
      case 'excellent': return '🌟';
      default: return '💤';
    }
  };

  const lastSleep = sleep.length > 0 ? sleep[0] : null;
  const avgSleepDuration = sleep.length > 0 
    ? sleep.reduce((sum: number, entry: Sleep) => sum + entry.sleep_duration_hours, 0) / sleep.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Sleep Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-lg mx-auto mb-2">
            <Moon className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {lastSleep ? `${lastSleep.sleep_duration_hours.toFixed(1)}h` : '0h'}
          </p>
          <p className="text-xs text-purple-700">Last Sleep</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-lg mx-auto mb-2">
            <Clock className="h-8 w-8 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-900">
            {avgSleepDuration > 0 ? `${avgSleepDuration.toFixed(1)}h` : '0h'}
          </p>
          <p className="text-xs text-indigo-700">Average</p>
        </div>
      </div>

      <Separator />

      {/* Add Sleep Button */}
      {!showForm && (
        <Button 
          onClick={() => setShowForm(true)}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Log Sleep Session
        </Button>
      )}

      {/* Sleep Form */}
      {showForm && (
        <Card className="border-purple-200">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedtime">Bedtime *</Label>
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-purple-600" />
                    <Input
                      id="bedtime"
                      type="datetime-local"
                      value={formatTimeForInput(formData.bedtime)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateSleepInput) => ({ 
                          ...prev, 
                          bedtime: new Date(e.target.value) 
                        }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wake_time">Wake Time *</Label>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-yellow-600" />
                    <Input
                      id="wake_time"
                      type="datetime-local"
                      value={formatTimeForInput(formData.wake_time)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateSleepInput) => ({ 
                          ...prev, 
                          wake_time: new Date(e.target.value) 
                        }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sleep Quality</Label>
                <Select 
                  value={formData.sleep_quality || ''} 
                  onValueChange={(value: 'poor' | 'fair' | 'good' | 'excellent') =>
                    setFormData((prev: CreateSleepInput) => ({ 
                      ...prev, 
                      sleep_quality: value || undefined 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How was your sleep?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poor">😴 Poor</SelectItem>
                    <SelectItem value="fair">😐 Fair</SelectItem>
                    <SelectItem value="good">😊 Good</SelectItem>
                    <SelectItem value="excellent">🌟 Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateSleepInput) => ({ 
                      ...prev, 
                      notes: e.target.value || null 
                    }))
                  }
                  placeholder="How did you sleep? Any observations..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmitting ? 'Saving...' : 'Save Sleep'}
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

      {/* Recent Sleep */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Recent Sleep Sessions</h3>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading sleep data...</div>
        ) : sleep.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No sleep sessions logged yet! 😴</p>
            <p className="text-sm mt-1">Start by logging your sleep above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sleep.slice(0, 5).map((entry: Sleep) => (
              <Card key={entry.id} className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Moon className="h-4 w-4" />
                          {formatTime(entry.bedtime)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Sun className="h-4 w-4" />
                          {formatTime(entry.wake_time)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span className="text-lg font-semibold text-purple-900">
                          {entry.sleep_duration_hours.toFixed(1)} hours
                        </span>
                      </div>

                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-2">{entry.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {entry.sleep_quality && (
                        <Badge className={getQualityColor(entry.sleep_quality)}>
                          {getQualityEmoji(entry.sleep_quality)} {entry.sleep_quality}
                        </Badge>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {entry.recorded_at.toLocaleDateString()}
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
