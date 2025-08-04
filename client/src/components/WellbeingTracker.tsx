
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Heart, Brain, Zap } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Wellbeing, CreateWellbeingInput } from '../../../server/src/schema';

interface WellbeingTrackerProps {
  userId: number;
  onUpdate: () => void;
}

export function WellbeingTracker({ userId, onUpdate }: WellbeingTrackerProps) {
  const [wellbeing, setWellbeing] = useState<Wellbeing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<CreateWellbeingInput>({
    user_id: userId,
    mood: 'neutral',
    stress_level: 'moderate',
    energy_level: 'moderate',
    notes: null,
    recorded_at: undefined
  });

  const loadWellbeing = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getWellbeing.query({ userId });
      setWellbeing(result);
    } catch (error) {
      console.error('Failed to load wellbeing:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadWellbeing();
  }, [loadWellbeing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      await trpc.createWellbeing.mutate(formData);
      
      // Reset form
      setFormData({
        user_id: userId,
        mood: 'neutral',
        stress_level: 'moderate',
        energy_level: 'moderate',
        notes: null,
        recorded_at: undefined
      });
      
      setShowForm(false);
      await loadWellbeing();
      onUpdate();
    } catch (error) {
      console.error('Failed to create wellbeing entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMoodInfo = (mood: string) => {
    switch (mood) {
      case 'very_poor': return { emoji: '😢', color: 'bg-red-100 text-red-800' };
      case 'poor': return { emoji: '😔', color: 'bg-orange-100 text-orange-800' };
      case 'neutral': return { emoji: '😐', color: 'bg-gray-100 text-gray-800' };
      case 'good': return { emoji: '😊', color: 'bg-green-100 text-green-800' };
      case 'excellent': return { emoji: '😄', color: 'bg-blue-100 text-blue-800' };
      default: return { emoji: '😐', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getStressInfo = (stress: string) => {
    switch (stress) {
      case 'very_low': return { emoji: '😌', color: 'bg-green-100 text-green-800' };
      case 'low': return { emoji: '🙂', color: 'bg-blue-100 text-blue-800' };
      case 'moderate': return { emoji: '😐', color: 'bg-yellow-100 text-yellow-800' };
      case 'high': return { emoji: '😰', color: 'bg-orange-100 text-orange-800' };
      case 'very_high': return { emoji: '😨', color: 'bg-red-100 text-red-800' };
      default: return { emoji: '😐', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getEnergyInfo = (energy: string) => {
    switch (energy) {
      case 'very_low': return { emoji: '😴', color: 'bg-red-100 text-red-800' };
      case 'low': return { emoji: '😔', color: 'bg-orange-100 text-orange-800' };
      case 'moderate': return { emoji: '😐', color: 'bg-yellow-100 text-yellow-800' };
      case 'high': return { emoji: '😊', color: 'bg-green-100 text-green-800' };
      case 'very_high': return { emoji: '⚡', color: 'bg-blue-100 text-blue-800' };
      default: return { emoji: '😐', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const latestEntry = wellbeing.length > 0 ? wellbeing[0] : null;

  return (
    <div className="space-y-6">
      {/* Current State */}
      {latestEntry && (
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-pink-100 rounded-lg mx-auto mb-2">
              <Heart className="h-8 w-8 text-pink-600" />
            </div>
            <p className="text-2xl mb-1">{getMoodInfo(latestEntry.mood).emoji}</p>
            <p className="text-xs text-pink-700">Mood</p>
            <p className="text-xs text-gray-600 capitalize">{latestEntry.mood.replace('_', ' ')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-lg mx-auto mb-2">
              <Brain className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-2xl mb-1">{getStressInfo(latestEntry.stress_level).emoji}</p>
            <p className="text-xs text-red-700">Stress</p>
            <p className="text-xs text-gray-600 capitalize">{latestEntry.stress_level.replace('_', ' ')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-lg mx-auto mb-2">
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-2xl mb-1">{getEnergyInfo(latestEntry.energy_level).emoji}</p>
            <p className="text-xs text-yellow-700">Energy</p>
            <p className="text-xs text-gray-600 capitalize">{latestEntry.energy_level.replace('_', ' ')}</p>
          </div>
        </div>
      )}

      <Separator />

      {/* Add Entry Button */}
      {!showForm && (
        <Button 
          onClick={() => setShowForm(true)}
          className="w-full bg-pink-600 hover:bg-pink-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Log How You're Feeling
        </Button>
      )}

      {/* Wellbeing Form */}
      {showForm && (
        <Card className="border-pink-200">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>How is your mood today? 💭</Label>
                <Select 
                  value={formData.mood || 'neutral'} 
                  onValueChange={(value: 'very_poor' | 'poor' | 'neutral' | 'good' | 'excellent') =>
                    setFormData((prev: CreateWellbeingInput) => ({ 
                      ...prev, 
                      mood: value 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_poor">😢 Very Poor</SelectItem>
                    <SelectItem value="poor">😔 Poor</SelectItem>
                    <SelectItem value="neutral">😐 Neutral</SelectItem>
                    <SelectItem value="good">😊 Good</SelectItem>
                    <SelectItem value="excellent">😄 Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>What's your stress level? 🧠</Label>
                <Select 
                  value={formData.stress_level || 'moderate'} 
                  onValueChange={(value: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high') =>
                    setFormData((prev: CreateWellbeingInput) => ({ 
                      ...prev, 
                      stress_level: value 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_low">😌 Very Low</SelectItem>
                    <SelectItem value="low">🙂 Low</SelectItem>
                    <SelectItem value="moderate">😐 Moderate</SelectItem>
                    <SelectItem value="high">😰 High</SelectItem>
                    <SelectItem value="very_high">😨 Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>How's your energy level? ⚡</Label>
                <Select 
                  value={formData.energy_level || 'moderate'} 
                  onValueChange={(value: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high') =>
                    setFormData((prev: CreateWellbeingInput) => ({ 
                      ...prev, 
                      energy_level: value 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_low">😴 Very Low</SelectItem>
                    <SelectItem value="low">😔 Low</SelectItem>
                    <SelectItem value="moderate">😐 Moderate</SelectItem>
                    <SelectItem value="high">😊 High</SelectItem>
                    <SelectItem value="very_high">⚡ Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Any thoughts or notes? 📝</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateWellbeingInput) => ({ 
                      ...prev, 
                      notes: e.target.value || null 
                    }))
                  }
                  placeholder="What's on your mind? Any reflections on your day..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  {isSubmitting ? 'Saving...' : 'Save Entry'}
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

      {/* Recent Entries */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Recent Well-being Entries</h3>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading wellbeing data...</div>
        ) : wellbeing.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No entries yet! 🧘‍♀️</p>
            <p className="text-sm mt-1">Start by logging how you're feeling above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wellbeing.slice(0, 5).map((entry: Wellbeing) => (
              <Card key={entry.id} className="border-l-4 border-l-pink-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex gap-3 mb-3">
                        <Badge className={getMoodInfo(entry.mood).color}>
                          {getMoodInfo(entry.mood).emoji} Mood: {entry.mood.replace('_', ' ')}
                        </Badge>
                        <Badge className={getStressInfo(entry.stress_level).color}>
                          {getStressInfo(entry.stress_level).emoji} Stress: {entry.stress_level.replace('_', ' ')}
                        </Badge>
                        <Badge className={getEnergyInfo(entry.energy_level).color}>
                          {getEnergyInfo(entry.energy_level).emoji} Energy: {entry.energy_level.replace('_', ' ')}
                        </Badge>
                      </div>

                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">"{entry.notes}"</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
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
